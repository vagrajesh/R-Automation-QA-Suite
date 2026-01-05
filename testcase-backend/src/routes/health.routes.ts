import { Router } from 'express';
import { healthCheck, dbHealthCheck, indicesHealthCheck } from '../controllers/health.controller';

const router = Router();

router.get('/api/health', healthCheck);
router.get('/api/health/db', dbHealthCheck);
router.get('/api/health/indices', indicesHealthCheck);

export default router;
