import { Router } from 'express';
import { createEmbedding, getEmbeddingConfig } from '../controllers/embedding.controller';

const router = Router();

// POST /api/embeddings - Generate embedding for input text
router.post('/api/embeddings', createEmbedding);

// GET /api/embeddings/config - Get embedding configuration
router.get('/api/embeddings/config', getEmbeddingConfig);

export default router;
