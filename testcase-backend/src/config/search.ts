// BM25 Search Configuration
export const BM25_FIELD_WEIGHTS = {
  id: 10.0,              // Exact ID match is most important
  title: 5.0,            // Title match is high priority
  module: 3.0,           // Module grouping important
  description: 2.0,      // Description relevance
  steps: 1.5,            // Step content
  expectedResults: 1.5,  // Expected results
  preRequisites: 0.8     // Prerequisites less important
};

export const COLLECTION_NAME = process.env.COLLECTION_NAME || 'test_cases';
export const BM25_INDEX_NAME = process.env.BM25_INDEX_NAME || 'bm25_search';
export const SEARCH_RESULT_LIMIT = parseInt(process.env.SEARCH_RESULT_LIMIT || '10', 10);

export default {
  BM25_FIELD_WEIGHTS,
  COLLECTION_NAME,
  BM25_INDEX_NAME,
  SEARCH_RESULT_LIMIT
};
