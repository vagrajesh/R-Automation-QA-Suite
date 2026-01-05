import app from './app';
import { connectToDatabase } from './config/database';
import config from './config';
import logger from './utils/logger';

const start = async () => {
  try {
    await connectToDatabase();

    app.listen(config.PORT, () => {
      logger.info(`Server listening`, { port: config.PORT });
    });
  } catch (err: any) {
    logger.error('Failed to start server', { error: err?.message || String(err) });
    process.exit(1);
  }
};

start();
