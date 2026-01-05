import { hybridSearch, HybridSearchResult } from './hybrid-search.service';
import { completeLLM, getCurrentProvider } from '../llm/llm.service';
import {
  RERANK_TOP_K,
  RERANK_TIMEOUT_MS,
  SUMMARIZATION_TOP_K,
  SUMMARIZATION_TIMEOUT_MS
} from '../../config/llm';
import logger from '../../utils/logger';

export interface PipelineOptions {
  query: string;
  limit?: number;
  includeRerank?: boolean;
  includeSummary?: boolean;
  rerankTopK?: number;
  summarizeTopK?: number;
  maxSentences?: number;
  bm25Weight?: number;
  vectorWeight?: number;
  filters?: {
    module?: string;
    priority?: string;
    type?: string;
    automationManual?: string;
  };
}

export interface PipelineResult {
  results: any[];
  total: number;
  searchMethod: 'pipeline';
  query: string;
  summary: {
    summary: string;
    highlights: string[];
    gaps: string[];
  } | null;
  executionTimeMs: number;
  hybridExecutionTimeMs: number;
  rerankExecutionTimeMs: number | null;
  summarizationTimeMs: number | null;
  llmProvider: string;
  pipelineSteps: string[];
  weights: {
    bm25: number;
    vector: number;
  };
  fallback?: string;
}

// Rerank prompt
const RERANK_SYSTEM_PROMPT = `You are an expert search reranker for enterprise QA/test-case documents. Evaluate relevance of candidate test cases to the user's search query, prefer exact ID/title matches, consider module and priority metadata. Output must be valid JSON containing a "rankings" array sorted by descending relevance score.

Instructions:
1. Re-evaluate semantic relevance to the query.
2. Boost exact matches on "id" (strong) and "title" (moderate).
3. Favor higher "priority" (P1 > P2 > P3) when relevance is comparable.
4. Output normalized scores in range [0.0, 1.0].
5. Return JSON only (no commentary).

Output JSON schema:
{
  "rankings": [
    { "id": "TC_005", "final_score": 0.950, "notes": "exact id match" }
  ]
}`;

// Summarize prompt
const SUMMARIZE_SYSTEM_PROMPT = `You are an enterprise summarization assistant. Given a query and top test cases, produce a concise summary of what the results collectively validate, with 3-5 key highlights and any notable gaps.

Instructions:
1. Produce a short summary paragraph (max specified sentences) describing coverage relative to the query.
2. Provide 3-5 key takeaways: scope covered, high-priority items, missing coverage.
3. Identify gaps in test coverage based on the query intent.
4. Keep tone neutral and technical.
5. Return only valid JSON (no markdown or commentary).

Output JSON schema:
{
  "summary": "These test cases validate...",
  "highlights": ["Contains P1 cases...", "..."],
  "gaps": ["No negative tests...", "..."]
}`;

function buildRerankUserPrompt(query: string, results: any[], topK: number): string {
  const compactResults = results.slice(0, topK).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description?.substring(0, 300) || '',
    module: r.module,
    priority: r.priority,
    score: r.score || r.hybridScore || 0
  }));

  return `Query: "${query}"

Top ${topK} results to re-rank:
${JSON.stringify(compactResults, null, 2)}

Re-rank by relevance to the query. Return only valid JSON.`;
}

function buildSummarizeUserPrompt(
  query: string,
  results: any[],
  topK: number,
  maxSentences: number
): string {
  const compactResults = results.slice(0, topK).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description?.substring(0, 500) || '',
    expectedResults: r.expectedResults?.substring(0, 300) || '',
    module: r.module,
    priority: r.priority
  }));

  return `Query: "${query}"
Max sentences: ${maxSentences}

Top ${topK} results to summarize:
${JSON.stringify(compactResults, null, 2)}

Analyze coverage relative to the query. Return only valid JSON.`;
}

function parseRerankResponse(response: string): any[] {
  try {
    let jsonStr = response.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    const parsed = JSON.parse(jsonStr);
    return parsed.rankings || [];
  } catch (err) {
    logger.error('Failed to parse rerank response', { error: (err as Error).message });
    return [];
  }
}

function parseSummarizeResponse(response: string): {
  summary: string;
  highlights: string[];
  gaps: string[];
} | null {
  try {
    let jsonStr = response.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    const parsed = JSON.parse(jsonStr);
    return {
      summary: parsed.summary || '',
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : []
    };
  } catch (err) {
    logger.error('Failed to parse summarize response', { error: (err as Error).message });
    return null;
  }
}

function applyRerankings(originalResults: any[], rankings: any[]): any[] {
  if (rankings.length === 0) return originalResults;

  const resultMap = new Map<string, any>();
  for (const result of originalResults) {
    resultMap.set(result.id, result);
  }

  const rerankedResults: any[] = [];
  const processedIds = new Set<string>();

  for (const ranking of rankings) {
    const original = resultMap.get(ranking.id);
    if (original && !processedIds.has(ranking.id)) {
      rerankedResults.push({
        ...original,
        originalScore: original.score || original.hybridScore,
        score: ranking.final_score,
        rerankNotes: ranking.notes
      });
      processedIds.add(ranking.id);
    }
  }

  // Add remaining results not in reranking
  for (const result of originalResults) {
    if (!processedIds.has(result.id)) {
      rerankedResults.push(result);
    }
  }

  return rerankedResults;
}

export async function pipelineSearch(options: PipelineOptions): Promise<PipelineResult> {
  const start = Date.now();
  const {
    query,
    limit = 10,
    includeRerank = false,
    includeSummary = false,
    rerankTopK = RERANK_TOP_K,
    summarizeTopK = SUMMARIZATION_TOP_K,
    maxSentences = 3,
    bm25Weight,
    vectorWeight,
    filters = {}
  } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  const pipelineSteps: string[] = ['hybrid-search'];
  if (includeRerank) pipelineSteps.push('rerank');
  if (includeSummary) pipelineSteps.push('summarize');

  logger.info('Executing pipeline search', {
    query,
    limit,
    includeRerank,
    includeSummary,
    steps: pipelineSteps
  });

  // Step 1: Execute hybrid search
  const hybridStart = Date.now();
  let hybridResult: HybridSearchResult;

  try {
    const searchLimit = Math.max(limit, rerankTopK, summarizeTopK) * 2;
    hybridResult = await hybridSearch({
      query,
      limit: searchLimit,
      bm25Weight,
      vectorWeight,
      filters
    });
  } catch (err) {
    logger.error('Hybrid search failed in pipeline', { error: (err as Error).message });
    throw new Error(`Search phase failed: ${(err as Error).message}`);
  }

  const hybridExecutionTimeMs = Date.now() - hybridStart;
  let results = hybridResult.results;

  // Step 2: Optional reranking
  let rerankExecutionTimeMs: number | null = null;

  if (includeRerank && results.length > 0) {
    const rerankStart = Date.now();

    try {
      const userPrompt = buildRerankUserPrompt(query, results, rerankTopK);

      const llmResult = await completeLLM({
        messages: [
          { role: 'system', content: RERANK_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 1500,
        timeout: RERANK_TIMEOUT_MS
      });

      logger.info('Pipeline rerank completed', {
        provider: llmResult.provider,
        tokens: llmResult.usage.totalTokens
      });

      const rankings = parseRerankResponse(llmResult.content);
      if (rankings.length > 0) {
        results = applyRerankings(results, rankings);
      }
    } catch (err) {
      logger.error('Rerank failed in pipeline, continuing without rerank', {
        error: (err as Error).message
      });
    }

    rerankExecutionTimeMs = Date.now() - rerankStart;
  }

  // Step 3: Optional summarization
  let summarizationTimeMs: number | null = null;
  let summary: { summary: string; highlights: string[]; gaps: string[] } | null = null;

  if (includeSummary && results.length > 0) {
    const summarizeStart = Date.now();

    try {
      const userPrompt = buildSummarizeUserPrompt(query, results, summarizeTopK, maxSentences);

      const llmResult = await completeLLM({
        messages: [
          { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        maxTokens: 1500,
        timeout: SUMMARIZATION_TIMEOUT_MS
      });

      logger.info('Pipeline summarization completed', {
        provider: llmResult.provider,
        tokens: llmResult.usage.totalTokens
      });

      summary = parseSummarizeResponse(llmResult.content);

      if (!summary) {
        // Retry with stricter instruction
        const retryResult = await completeLLM({
          messages: [
            { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: llmResult.content },
            { role: 'user', content: 'Return ONLY valid JSON matching the schema.' }
          ],
          temperature: 0.0,
          maxTokens: 1500,
          timeout: SUMMARIZATION_TIMEOUT_MS
        });
        summary = parseSummarizeResponse(retryResult.content);
      }
    } catch (err) {
      logger.error('Summarization failed in pipeline', { error: (err as Error).message });
      summary = {
        summary: `Search returned ${results.length} results for "${query}". Summarization failed.`,
        highlights: [`Found ${results.length} test cases`],
        gaps: ['Unable to analyze gaps due to summarization error']
      };
    }

    summarizationTimeMs = Date.now() - summarizeStart;
  }

  // Trim results to requested limit
  const finalResults = results.slice(0, limit);

  return {
    results: finalResults,
    total: finalResults.length,
    searchMethod: 'pipeline',
    query,
    summary,
    executionTimeMs: Date.now() - start,
    hybridExecutionTimeMs,
    rerankExecutionTimeMs,
    summarizationTimeMs,
    llmProvider: getCurrentProvider(),
    pipelineSteps,
    weights: hybridResult.weights,
    ...(hybridResult.fallback && { fallback: hybridResult.fallback })
  };
}
