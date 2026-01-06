import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRoutes } from '../api/routes';
import { errorHandler, requestLogger } from './middlewares/errorHandler';
import { logger } from '../infrastructure/logging/logger';

export const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json({ limit: '10mb' })); // Large limit for base64 images
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use(requestLogger);

  // API routes
  app.use('/api', apiRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Visual Testing Backend API',
      version: '1.0.0',
      status: 'running',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};