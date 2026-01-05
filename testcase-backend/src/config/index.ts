import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_DB = process.env.MONGODB_DB || 'test_cases_db';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const RERANK_TOP_K = process.env.RERANK_TOP_K ? parseInt(process.env.RERANK_TOP_K, 10) : 5;

export default {
  PORT,
  MONGODB_URI,
  MONGODB_DB,
  LOG_LEVEL,
  RERANK_TOP_K
};
