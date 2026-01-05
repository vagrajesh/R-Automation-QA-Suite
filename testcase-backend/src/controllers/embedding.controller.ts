import { Request, Response } from 'express';
import { generateEmbedding } from '../services/embedding/mistral-embedding.service';
import { MISTRAL_EMBEDDING_MODEL, MISTRAL_EMBEDDING_DIMENSIONS } from '../config/embedding';
import logger from '../utils/logger';

export async function createEmbedding(req: Request, res: Response) {
  const start = Date.now();

  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain "input" as a non-empty string'
      });
    }

    const result = await generateEmbedding(input);

    const latencyMs = Date.now() - start;

    logger.info('Embedding request completed', { latencyMs, tokens: result.usage.total_tokens });

    return res.status(200).json({
      success: true,
      data: {
        embedding: result.embedding,
        dimensions: result.embedding.length,
        model: result.model,
        usage: result.usage
      },
      meta: {
        latencyMs,
        expectedDimensions: MISTRAL_EMBEDDING_DIMENSIONS
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logger.error('Embedding request failed', { error: err?.message || err, latencyMs });

    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate embedding',
      meta: { latencyMs }
    });
  }
}

export async function getEmbeddingConfig(_req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    data: {
      model: MISTRAL_EMBEDDING_MODEL,
      dimensions: MISTRAL_EMBEDDING_DIMENSIONS,
      provider: 'mistral'
    }
  });
}
