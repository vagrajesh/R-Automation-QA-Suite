import { hybridSearch, HybridSearchResult } from './hybrid-search.service';
import { completeLLM, getCurrentProvider } from '../llm/llm.service';
import { SUMMARIZATION_TIMEOUT_MS, SUMMARIZATION_TOP_K } from '../../config/llm';
import logger from '../../utils/logger';

export interface SummarizeOptions {
  query: string;
  limit?: number;
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

export interface SummarizeResult {
  results: any[];
  total: number;
  searchMethod: 'summarize';
  query: string;
  summary: {
    summary: string;
    highlights: string[];
    gaps: string[];
  } | null;
  executionTimeMs: number;
  hybridExecutionTimeMs: number;
  summarizationTimeMs: number;
  llmProvider: string;
  summarizeTopK: number;
}

const SUMMARIZE_SYSTEM_PROMPT = `You are an enterprise summarization assistant. Given a query and a set of top test cases, produce a concise, factual summary of what the results collectively validate and list 3-5 key highlights and any notable risk or gaps.

Instructions:
1. Produce a short summary paragraph (no more than the specified sentence limit) describing the coverage of the returned test cases relative to the query.
2. Provide a bullet list of 3-5 key takeaways including: scope covered, high-priority items, and missing coverage if applicable.
3. Provide gaps or missing coverage if you identify any based on the query intent.
4. Keep tone neutral and technical.
5. Return only valid JSON (no commentary or markdown).

Required Output JSON schema:
{
  "summary": "These test cases validate user authentication flows including ...",
  "highlights": [
    "Contains P1 cases for login with valid credentials",
    "Includes integration tests for SSO"
  ],
  "gaps": [
    "No negative tests for expired sessions",
    "No performance/throughput cases"
  ]
}`;

function buildSummarizeUserPrompt(
  query: string,
  results: any[],
  topK: number,
  maxSentences: number
): string {
  // Prepare compact results for LLM - include relevant fields for summarization
  const compactResults = results.slice(0, topK).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description?.substring(0, 500) || '',
    expectedResults: r.expectedResults?.substring(0, 300) || '',
    module: r.module,
    priority: r.priority
  }));

  return `Query: "${query}"
Max sentences for summary: ${maxSentences}

Top ${topK} search results to summarize:
${JSON.stringify(compactResults, null, 2)}

Analyze these test cases and produce a summary of their coverage relative to the query. Return only valid JSON.`;
}

function parseSummarizeResponse(response: string): {
  summary: string;
  highlights: string[];
  gaps: string[];
} | null {
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

export async function summarizeSearch(options: SummarizeOptions): Promise<SummarizeResult> {
  const start = Date.now();
  const {
    query,
    limit = 10,
    summarizeTopK = SUMMARIZATION_TOP_K,
    maxSentences = 3,
    bm25Weight,
    vectorWeight,
    filters = {}
  } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  logger.info('Executing summarize search', { query, limit, summarizeTopK, maxSentences });

  // Step 1: Execute hybrid search to get results
  const hybridStart = Date.now();
  let hybridResult: HybridSearchResult;

  try {
    hybridResult = await hybridSearch({
      query,
      limit: Math.max(limit, summarizeTopK),
      bm25Weight,
      vectorWeight,
      filters
    });
  } catch (err) {
    logger.error('Hybrid search failed during summarize', { error: (err as Error).message });
    throw new Error(`Search phase failed: ${(err as Error).message}`);
  }

  const hybridExecutionTimeMs = Date.now() - hybridStart;

  // If no results, return early
  if (hybridResult.results.length === 0) {
    return {
      results: [],
      total: 0,
      searchMethod: 'summarize',
      query,
      summary: null,
      executionTimeMs: Date.now() - start,
      hybridExecutionTimeMs,
      summarizationTimeMs: 0,
      llmProvider: getCurrentProvider(),
      summarizeTopK
    };
  }

  // Step 2: Send top results to LLM for summarization
  const summarizeStart = Date.now();
  let summary: { summary: string; highlights: string[]; gaps: string[] } | null = null;

  try {
    const userPrompt = buildSummarizeUserPrompt(
      query,
      hybridResult.results,
      summarizeTopK,
      maxSentences
    );

    const llmResult = await completeLLM({
      messages: [
        { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      maxTokens: 1500,
      timeout: SUMMARIZATION_TIMEOUT_MS
    });

    logger.info('LLM summarization completed', {
      provider: llmResult.provider,
      tokens: llmResult.usage.totalTokens
    });

    summary = parseSummarizeResponse(llmResult.content);

    if (!summary) {
      logger.info('Failed to parse LLM summarization response, retrying with stricter instruction');

      // Retry with stricter instruction
      const retryResult = await completeLLM({
        messages: [
          { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: llmResult.content },
          { role: 'user', content: 'Your response was not valid JSON. Please return ONLY valid JSON matching the schema, no markdown or commentary.' }
        ],
        temperature: 0.0,
        maxTokens: 1500,
        timeout: SUMMARIZATION_TIMEOUT_MS
      });

      summary = parseSummarizeResponse(retryResult.content);
    }
  } catch (err) {
    logger.error('LLM summarization failed', { error: (err as Error).message });
    // Continue without summary rather than failing the whole request
    summary = {
      summary: `Search returned ${hybridResult.results.length} results for "${query}". Summarization failed due to LLM error.`,
      highlights: [`Found ${hybridResult.results.length} test cases related to the query`],
      gaps: ['Unable to analyze coverage gaps due to summarization error']
    };
  }

  const summarizationTimeMs = Date.now() - summarizeStart;

  // Return results with summary
  const results = hybridResult.results.slice(0, limit);

  return {
    results,
    total: results.length,
    searchMethod: 'summarize',
    query,
    summary,
    executionTimeMs: Date.now() - start,
    hybridExecutionTimeMs,
    summarizationTimeMs,
    llmProvider: getCurrentProvider(),
    summarizeTopK
  };
}
