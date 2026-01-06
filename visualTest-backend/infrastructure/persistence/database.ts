import { connectMongo, disconnectMongo, createIndexes } from './mongoClient';
import { logger } from '../logging/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    await connectMongo();
    await createIndexes();
    logger.info('Database setup completed');
  } catch (error) {
    logger.error('Database setup failed:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await disconnectMongo();
  } catch (error) {
    logger.error('Database disconnection failed:', error);
  }
};