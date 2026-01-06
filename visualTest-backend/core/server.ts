import { createApp } from './app';
import { connectDatabase } from '../infrastructure/persistence/database';
import { appConfig } from './config';
import { logger } from '../infrastructure/logging/logger';

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Create Express app
    const app = createApp();
    
    // Start server
    const server = app.listen(appConfig.port, () => {
      logger.info(`Server running on port ${appConfig.port} in ${appConfig.nodeEnv} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();