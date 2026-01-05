import { bm25Search } from './bm25-search.service';
import { vectorSearch } from './vector-search.service';
import { SEARCH_RESULT_LIMIT } from '../../config/search';
import logger from '../../utils/logger';

const BM25_WEIGHT = parseFloat(process.env.HYBRID_SEARCH_BM25_WEIGHT || '0.4');
const VECTOR_WEIGHT = parseFloat(process.env.HYBRID_SEARCH_VECTOR_WEIGHT || '0.6');

export interface HybridSearchOptions {
  query: string;
  limit?: number;
  bm25Weight?: number;
  vectorWeight?: number;
  filters?: {
    module?: string;
    priority?: string;
    type?: string;
    automationManual?: string;
  };
}

export interface HybridSearchResult {
  results: any[];
  total: number;
  searchMethod: 'hybrid';
  query: string;
  executionTimeMs: number;
  bm25ExecutionTimeMs: number;
  vectorExecutionTimeMs: number;
  embeddingTimeMs: number;
  weights: {
    bm25: number;
    vector: number;
  };
  fallback?: string;
}

/**
 * Normalize scores to [0, 1] range using min-max normalization
 */
function normalizeScores(results: any[]): any[] {
  if (results.length === 0) return [];

  const scores = results.map(r => r.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  return results.map(r => ({
    ...r,
    normalizedScore: (r.score - minScore) / range
  }));
}

/**
 * Merge BM25 and Vector results with weighted scoring
 */
function mergeAndRankResults(
  bm25Results: any[],
  vectorResults: any[],
  bm25Weight: number,
  vectorWeight: number
): any[] {
  // Normalize both result sets
  const normalizedBM25 = normalizeScores(bm25Results);
  const normalizedVector = normalizeScores(vectorResults);

  // Create a map for merging by document ID
  const resultMap = new Map<string, any>();

  // Add BM25 results
  for (const result of normalizedBM25) {
    const docId = result.id || result._id?.toString();
    resultMap.set(docId, {
      ...result,
      bm25Score: result.normalizedScore,
      vectorScore: 0,
      searchSources: ['bm25']
    });
  }

  // Merge vector results
  for (const result of normalizedVector) {
    const docId = result.id || result._id?.toString();
    const existing = resultMap.get(docId);

    if (existing) {
      existing.vectorScore = result.normalizedScore;
      existing.searchSources.push('vector');
    } else {
      resultMap.set(docId, {
        ...result,
        bm25Score: 0,
        vectorScore: result.normalizedScore,
        searchSources: ['vector']
      });
    }
  }

  // Calculate hybrid scores and sort
  const mergedResults = Array.from(resultMap.values()).map(result => ({
    ...result,
    hybridScore: (result.bm25Score * bm25Weight) + (result.vectorScore * vectorWeight),
    score: (result.bm25Score * bm25Weight) + (result.vectorScore * vectorWeight)
  }));

  // Sort by hybrid score descending
  mergedResults.sort((a, b) => b.hybridScore - a.hybridScore);

  return mergedResults;
}

export async function hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult> {
  const start = Date.now();
  const {
    query,
    limit = SEARCH_RESULT_LIMIT,
    bm25Weight = BM25_WEIGHT,
    vectorWeight = VECTOR_WEIGHT,
    filters = {}
  } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  logger.info('Executing hybrid search', { query, limit, bm25Weight, vectorWeight });

  let bm25Results: any[] = [];
  let vectorResults: any[] = [];
  let bm25ExecutionTimeMs = 0;
  let vectorExecutionTimeMs = 0;
  let embeddingTimeMs = 0;
  let fallback: string | undefined;

  // Execute BM25 and Vector searches in parallel
  const searchPromises = await Promise.allSettled([
    bm25Search({ query, limit: limit * 2, filters }),
    vectorSearch({ query, limit: limit * 2, filters })
  ]);

  // Process BM25 results
  if (searchPromises[0].status === 'fulfilled') {
    const bm25Result = searchPromises[0].value;
    bm25Results = bm25Result.results;
    bm25ExecutionTimeMs = bm25Result.executionTimeMs;
    logger.info('BM25 search completed', { resultCount: bm25Results.length });
  } else {
    logger.error('BM25 search failed', { error: searchPromises[0].reason?.message });
  }

  // Process Vector results
  if (searchPromises[1].status === 'fulfilled') {
    const vectorResult = searchPromises[1].value;
    vectorResults = vectorResult.results;
    vectorExecutionTimeMs = vectorResult.executionTimeMs;
    embeddingTimeMs = vectorResult.embeddingTimeMs;
    logger.info('Vector search completed', { resultCount: vectorResults.length });
  } else {
    logger.error('Vector search failed', { error: searchPromises[1].reason?.message });
    fallback = 'Vector search failed, using BM25 results only';
  }

  // Handle fallback scenarios
  if (bm25Results.length === 0 && vectorResults.length === 0) {
    throw new Error('Both BM25 and Vector search returned no results');
  }

  if (vectorResults.length === 0 && bm25Results.length > 0) {
    fallback = fallback || 'Vector search returned no results, using BM25 only';
  }

  if (bm25Results.length === 0 && vectorResults.length > 0) {
    fallback = 'BM25 search returned no results, using Vector only';
  }

  // Merge and rank results
  const mergedResults = mergeAndRankResults(bm25Results, vectorResults, bm25Weight, vectorWeight);

  // Limit to requested number
  const finalResults = mergedResults.slice(0, limit);

  const executionTimeMs = Date.now() - start;

  logger.info('Hybrid search completed', {
    query,
    bm25Count: bm25Results.length,
    vectorCount: vectorResults.length,
    mergedCount: finalResults.length,
    executionTimeMs
  });

  return {
    results: finalResults,
    total: finalResults.length,
    searchMethod: 'hybrid',
    query,
    executionTimeMs,
    bm25ExecutionTimeMs,
    vectorExecutionTimeMs,
    embeddingTimeMs,
    weights: {
      bm25: bm25Weight,
      vector: vectorWeight
    },
    ...(fallback && { fallback })
  };
}

export default { hybridSearch };
