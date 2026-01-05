import { MongoClient, Db } from 'mongodb';
import { MONGODB_URI, MONGODB_DB } from './index';
import logger from '../utils/logger';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);
  logger.info('Connected to MongoDB', { db: MONGODB_DB });
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected. Call connectToDatabase first.');
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
}
