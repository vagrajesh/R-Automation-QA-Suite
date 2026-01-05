import { connectToDatabase } from '../../config/database';
import { COLLECTION_NAME, SEARCH_RESULT_LIMIT } from '../../config/search';
import logger from '../../utils/logger';

export interface BM25SearchOptions {
  query: string;
  limit?: number;
  filters?: {
    module?: string;
    priority?: string;
    type?: string;
    automationManual?: string;
  };
}

export interface BM25SearchResult {
  results: any[];
  total: number;
  searchMethod: 'bm25';
  query: string;
  executionTimeMs: number;
}

export async function bm25Search(options: BM25SearchOptions): Promise<BM25SearchResult> {
  const start = Date.now();
  const { query, limit = SEARCH_RESULT_LIMIT, filters = {} } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  // Build match filter for metadata filtering
  const matchFilter: any = {};
  if (filters.module) matchFilter.module = filters.module;
  if (filters.priority) matchFilter.priority = filters.priority;
  if (filters.type) matchFilter.type = filters.type;
  if (filters.automationManual) matchFilter.automationManual = filters.automationManual;

  try {
    logger.info('Executing BM25 search', { query, limit, filters });

    // MongoDB Atlas Search with $search aggregation for BM25-style text search
    const pipeline: any[] = [
      {
        $search: {
          index: process.env.BM25_INDEX_NAME || 'bm25_search',
          text: {
            query: query,
            path: ['id', 'title', 'module', 'description', 'steps', 'expectedResults', 'preRequisites'],
            fuzzy: {
              maxEdits: 1,
              prefixLength: 2
            }
          }
        }
      },
      {
        $addFields: {
          score: { $meta: 'searchScore' }
        }
      }
    ];

    // Add metadata filter if any filters provided
    if (Object.keys(matchFilter).length > 0) {
      pipeline.push({ $match: matchFilter });
    }

    // Sort by score and limit
    pipeline.push(
      { $sort: { score: -1 } },
      { $limit: limit }
    );

    // Project fields
    pipeline.push({
      $project: {
        _id: 1,
        id: 1,
        title: 1,
        module: 1,
        description: 1,
        steps: 1,
        expectedResults: 1,
        preRequisites: 1,
        priority: 1,
        type: 1,
        automationManual: 1,
        risk: 1,
        score: 1
      }
    });

    const results = await collection.aggregate(pipeline).toArray();

    const executionTimeMs = Date.now() - start;

    logger.info('BM25 search completed', {
      query,
      resultCount: results.length,
      executionTimeMs
    });

    return {
      results,
      total: results.length,
      searchMethod: 'bm25',
      query,
      executionTimeMs
    };
  } catch (err: any) {
    logger.error('BM25 search failed', { error: err?.message || err });

    // Fallback to basic text search if Atlas Search index not available
    if (err?.codeName === 'IndexNotFound' || err?.message?.includes('index')) {
      logger.info('Falling back to basic text search');
      return fallbackTextSearch(collection, query, limit, matchFilter, start);
    }

    throw err;
  }
}

// Fallback using MongoDB native $text search
async function fallbackTextSearch(
  collection: any,
  query: string,
  limit: number,
  matchFilter: any,
  startTime: number
): Promise<BM25SearchResult> {
  const searchQuery: any = {
    $text: { $search: query }
  };

  // Merge with filters
  Object.assign(searchQuery, matchFilter);

  const results = await collection
    .find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .toArray();

  const executionTimeMs = Date.now() - startTime;

  logger.info('Fallback text search completed', {
    query,
    resultCount: results.length,
    executionTimeMs
  });

  return {
    results,
    total: results.length,
    searchMethod: 'bm25',
    query,
    executionTimeMs
  };
}

export default { bm25Search };
