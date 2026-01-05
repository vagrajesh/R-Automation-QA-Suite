import { Router } from 'express';
import {
  searchBM25,
  searchVector,
  searchHybrid,
  searchRerank,
  searchSummarize,
  searchPipeline
} from '../controllers/search.controller';

const router = Router();

// POST /api/search - End-to-end pipeline search (hybrid + optional rerank + optional summary)
router.post('/api/search', searchPipeline);

// POST /api/search/bm25 - BM25 text search
router.post('/api/search/bm25', searchBM25);

// POST /api/search/vector - Vector similarity search
router.post('/api/search/vector', searchVector);

// POST /api/search/hybrid - Hybrid BM25 + Vector search
router.post('/api/search/hybrid', searchHybrid);

// POST /api/search/rerank - Hybrid search with LLM reranking
router.post('/api/search/rerank', searchRerank);

// POST /api/search/summarize - Hybrid search with LLM summarization
router.post('/api/search/summarize', searchSummarize);

export default router;
