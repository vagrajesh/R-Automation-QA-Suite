import { Request, Response } from 'express';
import { connectToDatabase, getDb } from '../config/database';
import logger from '../utils/logger';

const COLLECTION_NAME = process.env.COLLECTION_NAME || 'test_cases';
const BM25_INDEX_NAME = process.env.BM25_INDEX_NAME || 'bm25_search';
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'vector_index_test_cases';

export async function healthCheck(_req: Request, res: Response) {
  const start = Date.now();
  const result: any = { status: 'healthy', services: {}, timestamp: new Date().toISOString() };

  try {
    await connectToDatabase();
    result.services.mongodb = { status: 'connected' };
  } catch (err: any) {
    logger.error('MongoDB health check failed', { error: err?.message || err });
    result.services.mongodb = { status: 'unavailable', error: err?.message || String(err) };
    result.status = 'degraded';
  }

  result.latencyMs = Date.now() - start;
  return res.status(result.status === 'healthy' ? 200 : 503).json(result);
}

export async function dbHealthCheck(_req: Request, res: Response) {
  const start = Date.now();
  const result: any = { status: 'healthy', services: {}, timestamp: new Date().toISOString() };

  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c: any) => c.name);
    result.services.mongodb = {
      status: 'connected',
      dbName: db.databaseName,
      collections: collectionNames,
      collectionsCount: collectionNames.length
    };
  } catch (err: any) {
    logger.error('MongoDB dbHealthCheck failed', { error: err?.message || err });
    result.services.mongodb = { status: 'unavailable', error: err?.message || String(err) };
    result.status = 'degraded';
  }

  result.latencyMs = Date.now() - start;
  return res.status(result.status === 'healthy' ? 200 : 503).json(result);
}

export async function indicesHealthCheck(_req: Request, res: Response) {
  const start = Date.now();
  const result: any = { status: 'healthy', services: {}, timestamp: new Date().toISOString() };

  try {
    const db = await connectToDatabase();
    const coll = db.collection(COLLECTION_NAME);

    // Get regular MongoDB indexes (includes BM25 text index)
    const indexes = await coll.indexes();
    const indexNames = indexes.map((i: any) => i.name);

    // Check for BM25 text index
    const bm25Found = indexNames.includes(BM25_INDEX_NAME) || indexes.some((i: any) =>
      i.weights || Object.values(i.key || {}).some((v: any) => v === 'text')
    );

    // Get Atlas Search indexes (includes vector search indexes)
    let atlasSearchIndexes: any[] = [];
    let vectorFound = false;
    try {
      const searchIndexCursor = coll.aggregate([{ $listSearchIndexes: {} }]);
      atlasSearchIndexes = await searchIndexCursor.toArray();
      vectorFound = atlasSearchIndexes.some((i: any) =>
        i.name === VECTOR_INDEX_NAME || i.type === 'vectorSearch'
      );
    } catch (searchErr: any) {
      // $listSearchIndexes may not be available on all MongoDB versions
      logger.info('Could not list Atlas Search indexes', { error: searchErr?.message });
    }

    result.services.indexes = {
      collection: COLLECTION_NAME,
      mongoIndexes: indexNames,
      atlasSearchIndexes: atlasSearchIndexes.map((i: any) => i.name),
      bm25: bm25Found ? { status: 'ready' } : { status: 'missing' },
      vector: vectorFound ? { status: 'ready' } : { status: 'missing' }
    };

    if (!bm25Found || !vectorFound) result.status = 'degraded';
  } catch (err: any) {
    logger.error('indicesHealthCheck failed', { error: err?.message || err });
    result.services.indexes = { status: 'error', error: err?.message || String(err) };
    result.status = 'degraded';
  }

  result.latencyMs = Date.now() - start;
  return res.status(result.status === 'healthy' ? 200 : 503).json(result);
}
