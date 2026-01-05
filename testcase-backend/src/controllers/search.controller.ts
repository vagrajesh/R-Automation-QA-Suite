import { Request, Response } from 'express';
import { bm25Search } from '../services/search/bm25-search.service';
import { vectorSearch } from '../services/search/vector-search.service';
import { hybridSearch } from '../services/search/hybrid-search.service';
import { rerankSearch } from '../services/search/rerank.service';
import { summarizeSearch } from '../services/search/summarize.service';
import { pipelineSearch } from '../services/search/pipeline.service';
import logger from '../utils/logger';

export async function searchBM25(req: Request, res: Response) {
  const start = Date.now();

  try {
    const { query, limit, filters } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "query" as a non-empty string'
      });
    }

    const result = await bm25Search({
      query,
      limit: limit || 10,
      filters: filters || {}
    });

    const latencyMs = Date.now() - start;

    logger.info('BM25 search request completed', { latencyMs, resultCount: result.total });

    return res.status(200).json({
      success: true,
      data: {
        results: result.results,
        total: result.total,
        searchMethod: result.searchMethod,
        query: result.query
      },
      meta: {
        latencyMs,
        executionTimeMs: result.executionTimeMs
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('BM25 search request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'BM25 search failed',
      meta: { latencyMs }
    });
  }
}

export async function searchVector(req: Request, res: Response) {
  const start = Date.now();

  try {
    const { query, limit, numCandidates, filters } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "query" as a non-empty string'
      });
    }

    const result = await vectorSearch({
      query,
      limit: limit || 10,
      numCandidates,
      filters: filters || {}
    });

    const latencyMs = Date.now() - start;

    logger.info('Vector search request completed', { latencyMs, resultCount: result.total });

    return res.status(200).json({
      success: true,
      data: {
        results: result.results,
        total: result.total,
        searchMethod: result.searchMethod,
        query: result.query
      },
      meta: {
        latencyMs,
        executionTimeMs: result.executionTimeMs,
        embeddingTimeMs: result.embeddingTimeMs
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('Vector search request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Vector search failed',
      meta: { latencyMs }
    });
  }
}

export async function searchHybrid(req: Request, res: Response) {
  const start = Date.now();

  try {
    const { query, limit, bm25Weight, vectorWeight, filters } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "query" as a non-empty string'
      });
    }

    const result = await hybridSearch({
      query,
      limit: limit || 10,
      bm25Weight,
      vectorWeight,
      filters: filters || {}
    });

    const latencyMs = Date.now() - start;

    logger.info('Hybrid search request completed', { latencyMs, resultCount: result.total });

    return res.status(200).json({
      success: true,
      data: {
        results: result.results,
        total: result.total,
        searchMethod: result.searchMethod,
        query: result.query,
        weights: result.weights
      },
      meta: {
        latencyMs,
        executionTimeMs: result.executionTimeMs,
        bm25ExecutionTimeMs: result.bm25ExecutionTimeMs,
        vectorExecutionTimeMs: result.vectorExecutionTimeMs,
        embeddingTimeMs: result.embeddingTimeMs,
        ...(result.fallback && { fallback: result.fallback })
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('Hybrid search request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Hybrid search failed',
      meta: { latencyMs }
    });
  }
}

export async function searchRerank(req: Request, res: Response) {
  const start = Date.now();

  try {
    const { query, limit, rerankTopK, bm25Weight, vectorWeight, filters } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "query" as a non-empty string'
      });
    }

    const result = await rerankSearch({
      query,
      limit: limit || 10,
      rerankTopK,
      bm25Weight,
      vectorWeight,
      filters: filters || {}
    });

    const latencyMs = Date.now() - start;

    logger.info('Rerank search request completed', { latencyMs, resultCount: result.total });

    return res.status(200).json({
      success: true,
      data: {
        results: result.results,
        total: result.total,
        searchMethod: result.searchMethod,
        query: result.query
      },
      meta: {
        latencyMs,
        executionTimeMs: result.executionTimeMs,
        hybridExecutionTimeMs: result.hybridExecutionTimeMs,
        rerankExecutionTimeMs: result.rerankExecutionTimeMs,
        llmProvider: result.llmProvider,
        rerankTopK: result.rerankTopK
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('Rerank search request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Rerank search failed',
      meta: { latencyMs }
    });
  }
}

export async function searchSummarize(req: Request, res: Response) {
  const start = Date.now();

  try {
    const { query, limit, summarizeTopK, maxSentences, bm25Weight, vectorWeight, filters } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "query" as a non-empty string'
      });
    }

    const result = await summarizeSearch({
      query,
      limit: limit || 10,
      summarizeTopK,
      maxSentences,
      bm25Weight,
      vectorWeight,
      filters: filters || {}
    });

    const latencyMs = Date.now() - start;

    logger.info('Summarize search request completed', { latencyMs, resultCount: result.total });

    return res.status(200).json({
      success: true,
      data: {
        results: result.results,
        total: result.total,
        searchMethod: result.searchMethod,
        query: result.query,
        summary: result.summary
      },
      meta: {
        latencyMs,
        executionTimeMs: result.executionTimeMs,
        hybridExecutionTimeMs: result.hybridExecutionTimeMs,
        summarizationTimeMs: result.summarizationTimeMs,
        llmProvider: result.llmProvider,
        summarizeTopK: result.summarizeTopK
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('Summarize search request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Summarize search failed',
      meta: { latencyMs }
    });
  }
}

export async function searchPipeline(req: Request, res: Response) {
  const start = Date.now();

  try {
    const {
      query,
      limit,
      includeRerank,
      includeSummary,
      rerankTopK,
      summarizeTopK,
      maxSentences,
      bm25Weight,
      vectorWeight,
      filters
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "query" as a non-empty string'
      });
    }

    const result = await pipelineSearch({
      query,
      limit: limit || 10,
      includeRerank: includeRerank ?? false,
      includeSummary: includeSummary ?? false,
      rerankTopK,
      summarizeTopK,
      maxSentences,
      bm25Weight,
      vectorWeight,
      filters: filters || {}
    });

    const latencyMs = Date.now() - start;

    logger.info('Pipeline search request completed', {
      latencyMs,
      resultCount: result.total,
      steps: result.pipelineSteps
    });

    return res.status(200).json({
      success: true,
      data: {
        results: result.results,
        total: result.total,
        searchMethod: result.searchMethod,
        query: result.query,
        summary: result.summary,
        weights: result.weights,
        pipelineSteps: result.pipelineSteps
      },
      meta: {
        latencyMs,
        executionTimeMs: result.executionTimeMs,
        hybridExecutionTimeMs: result.hybridExecutionTimeMs,
        rerankExecutionTimeMs: result.rerankExecutionTimeMs,
        summarizationTimeMs: result.summarizationTimeMs,
        llmProvider: result.llmProvider,
        ...(result.fallback && { fallback: result.fallback })
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('Pipeline search request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Pipeline search failed',
      meta: { latencyMs }
    });
  }
}
