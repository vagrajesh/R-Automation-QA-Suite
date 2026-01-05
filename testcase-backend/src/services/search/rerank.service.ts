import { hybridSearch, HybridSearchResult } from './hybrid-search.service';
import { completeLLM, getCurrentProvider } from '../llm/llm.service';
import { RERANK_TOP_K, RERANK_TIMEOUT_MS } from '../../config/llm';
import logger from '../../utils/logger';

export interface RerankOptions {
  query: string;
  limit?: number;
  rerankTopK?: number;
  bm25Weight?: number;
  vectorWeight?: number;
  filters?: {
    module?: string;
    priority?: string;
    type?: string;
    automationManual?: string;
  };
}

export interface RerankResult {
  results: any[];
  total: number;
  searchMethod: 'rerank';
  query: string;
  executionTimeMs: number;
  hybridExecutionTimeMs: number;
  rerankExecutionTimeMs: number;
  llmProvider: string;
  rerankTopK: number;
  originalResults?: any[];
}

const RERANK_SYSTEM_PROMPT = `You are an expert search reranker for enterprise QA/test-case documents. You should evaluate relevance of candidate test cases to the user's search query, prefer exact ID/title matches, consider module and priority metadata, and penalize duplicates. Output must be valid JSON containing a "rankings" array of objects sorted by descending relevance score.

Instructions:
1. Consider the original scores but re-evaluate semantic relevance to the query.
2. Boost exact matches on "id" (strong boost) and "title" (moderate boost).
3. Favor higher "priority" (P1 > P2 > P3) when semantic relevance is comparable.
4. If documents are near-duplicates (>= 0.9 textual overlap), keep only the best one and mark duplicates as "duplicate: true".
5. Output normalized scores in range [0.0, 1.0]. Use 0.000 precision at minimum.
6. Strictly return JSON only (no commentary).

Required Output JSON schema:
{
  "rankings": [
    {
      "id": "TC_005",
      "final_score": 0.950,
      "orig_score": 12.34,
      "notes": "exact id match; boosted",
      "duplicate": false
    }
  ]
}`;

function buildRerankUserPrompt(query: string, results: any[], topK: number): string {
  // Prepare compact results for LLM
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

Re-rank these results based on relevance to the query. Return only valid JSON.`;
}

function parseRerankResponse(response: string): any[] {
  try {
    // Try to extract JSON from response
    let jsonStr = response.trim();

    // Handle markdown code blocks
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

function mergeRerankResults(originalResults: any[], rankings: any[]): any[] {
  if (rankings.length === 0) {
    return originalResults;
  }

  // Create a map of original results by ID
  const resultMap = new Map<string, any>();
  for (const result of originalResults) {
    resultMap.set(result.id, result);
  }

  // Build reranked results
  const rerankedResults: any[] = [];
  const processedIds = new Set<string>();

  // First, add reranked results in order
  for (const ranking of rankings) {
    const original = resultMap.get(ranking.id);
    if (original && !processedIds.has(ranking.id)) {
      rerankedResults.push({
        ...original,
        originalScore: original.score || original.hybridScore,
        score: ranking.final_score,
        rerankNotes: ranking.notes,
        duplicate: ranking.duplicate || false
      });
      processedIds.add(ranking.id);
    }
  }

  // Add any results that weren't in the reranking (shouldn't happen, but safety)
  for (const result of originalResults) {
    if (!processedIds.has(result.id)) {
      rerankedResults.push(result);
    }
  }

  return rerankedResults;
}

export async function rerankSearch(options: RerankOptions): Promise<RerankResult> {
  const start = Date.now();
  const {
    query,
    limit = 10,
    rerankTopK = RERANK_TOP_K,
    bm25Weight,
    vectorWeight,
    filters = {}
  } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  logger.info('Executing rerank search', { query, limit, rerankTopK });

  // Step 1: Execute hybrid search
  const hybridStart = Date.now();
  let hybridResult: HybridSearchResult;

  try {
    hybridResult = await hybridSearch({
      query,
      limit: Math.max(limit, rerankTopK) * 2, // Get more results for reranking
      bm25Weight,
      vectorWeight,
      filters
    });
  } catch (err: any) {
    logger.error('Hybrid search failed in rerank', { error: err?.message || err });
    throw new Error(`Hybrid search failed: ${err?.message || 'Unknown error'}`);
  }

  const hybridExecutionTimeMs = Date.now() - hybridStart;

  if (hybridResult.results.length === 0) {
    return {
      results: [],
      total: 0,
      searchMethod: 'rerank',
      query,
      executionTimeMs: Date.now() - start,
      hybridExecutionTimeMs,
      rerankExecutionTimeMs: 0,
      llmProvider: getCurrentProvider(),
      rerankTopK
    };
  }

  // Step 2: Rerank using LLM
  const rerankStart = Date.now();
  let rerankedResults: any[];

  try {
    const userPrompt = buildRerankUserPrompt(query, hybridResult.results, rerankTopK);

    const llmResult = await completeLLM({
      messages: [
        { role: 'system', content: RERANK_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      maxTokens: 2000,
      timeout: RERANK_TIMEOUT_MS
    });

    const rankings = parseRerankResponse(llmResult.content);
    rerankedResults = mergeRerankResults(hybridResult.results, rankings);

    logger.info('LLM reranking completed', {
      originalCount: hybridResult.results.length,
      rerankedCount: rankings.length,
      provider: llmResult.provider,
      tokens: llmResult.usage.totalTokens
    });
  } catch (err: any) {
    logger.error('LLM reranking failed, returning hybrid results', { error: err?.message || err });
    // Fallback to hybrid results if reranking fails
    rerankedResults = hybridResult.results;
  }

  const rerankExecutionTimeMs = Date.now() - rerankStart;

  // Limit to requested number
  const finalResults = rerankedResults.slice(0, limit);

  const executionTimeMs = Date.now() - start;

  logger.info('Rerank search completed', {
    query,
    resultCount: finalResults.length,
    executionTimeMs
  });

  return {
    results: finalResults,
    total: finalResults.length,
    searchMethod: 'rerank',
    query,
    executionTimeMs,
    hybridExecutionTimeMs,
    rerankExecutionTimeMs,
    llmProvider: getCurrentProvider(),
    rerankTopK
  };
}

export default { rerankSearch };
