import { connectToDatabase } from '../../config/database';
import { COLLECTION_NAME, SEARCH_RESULT_LIMIT } from '../../config/search';
import { generateEmbedding } from '../embedding/mistral-embedding.service';
import logger from '../../utils/logger';

const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'vector_index_test_cases';

export interface VectorSearchOptions {
  query: string;
  limit?: number;
  numCandidates?: number;
  filters?: {
    module?: string;
    priority?: string;
    type?: string;
    automationManual?: string;
  };
}

export interface VectorSearchResult {
  results: any[];
  total: number;
  searchMethod: 'vector';
  query: string;
  executionTimeMs: number;
  embeddingTimeMs: number;
}

export async function vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult> {
  const start = Date.now();
  const { query, limit = SEARCH_RESULT_LIMIT, numCandidates, filters = {} } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query must be a non-empty string');
  }

  // Step 1: Generate embedding for the query
  const embeddingStart = Date.now();
  let queryEmbedding: number[];

  try {
    logger.info('Generating query embedding for vector search', { query });
    const embeddingResult = await generateEmbedding(query);
    queryEmbedding = embeddingResult.embedding;
  } catch (err: any) {
    logger.error('Failed to generate query embedding', { error: err?.message || err });
    throw new Error(`Embedding generation failed: ${err?.message || 'Unknown error'}`);
  }

  const embeddingTimeMs = Date.now() - embeddingStart;

  // Step 2: Execute vector search
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  // Build pre-filter for metadata filtering
  const preFilter: any = {};
  if (filters.module) preFilter.module = { $eq: filters.module };
  if (filters.priority) preFilter.priority = { $eq: filters.priority };
  if (filters.type) preFilter.type = { $eq: filters.type };
  if (filters.automationManual) preFilter.automationManual = { $eq: filters.automationManual };

  try {
    logger.info('Executing vector search', { limit, numCandidates: numCandidates || limit * 10 });

    // MongoDB Atlas Vector Search using $vectorSearch (NOT $knnBeta)
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: numCandidates || limit * 10,
          limit: limit,
          ...(Object.keys(preFilter).length > 0 && { filter: preFilter })
        }
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      },
      {
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
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();

    const executionTimeMs = Date.now() - start;

    logger.info('Vector search completed', {
      query,
      resultCount: results.length,
      executionTimeMs,
      embeddingTimeMs
    });

    return {
      results,
      total: results.length,
      searchMethod: 'vector',
      query,
      executionTimeMs,
      embeddingTimeMs
    };
  } catch (err: any) {
    logger.error('Vector search failed', { error: err?.message || err });
    throw err;
  }
}

export default { vectorSearch };
