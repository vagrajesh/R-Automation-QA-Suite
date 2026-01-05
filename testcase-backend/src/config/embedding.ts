import dotenv from 'dotenv';
dotenv.config();

export const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
export const MISTRAL_EMBEDDING_MODEL = process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed';
export const MISTRAL_EMBEDDING_DIMENSIONS = parseInt(process.env.MISTRAL_EMBEDDING_DIMENSIONS || '1024', 10);
export const MISTRAL_API_BASE = process.env.MISTRAL_API_BASE || 'https://api.mistral.ai';

export const EMBEDDING_RETRY_MAX = parseInt(process.env.EMBEDDING_RETRY_MAX || '3', 10);
export const EMBEDDING_RETRY_BACKOFF_MS = parseInt(process.env.EMBEDDING_RETRY_BACKOFF_MS || '1000', 10);

export default {
  MISTRAL_API_KEY,
  MISTRAL_EMBEDDING_MODEL,
  MISTRAL_EMBEDDING_DIMENSIONS,
  MISTRAL_API_BASE,
  EMBEDDING_RETRY_MAX,
  EMBEDDING_RETRY_BACKOFF_MS
};
