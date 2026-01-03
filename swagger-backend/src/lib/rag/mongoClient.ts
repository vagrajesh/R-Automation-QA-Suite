import { MongoClient, Db } from 'mongodb';
import config from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import embeddingService from './embeddingService.js';

let mongoInstance: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Initialize MongoDB connection
 */
export async function connectMongo(): Promise<Db> {
  if (dbInstance) {
    logger.info('Using existing MongoDB connection');
    return dbInstance;
  }

  try {
    logger.info(`Connecting to MongoDB: ${config.mongodb.uri.split('@')[1]}`);
    
    mongoInstance = new MongoClient(config.mongodb.uri);
    await mongoInstance.connect();
    
    dbInstance = mongoInstance.db(config.mongodb.dbName);
    
    // Verify connection
    await dbInstance.admin().ping();
    logger.info(`Connected to MongoDB database: ${config.mongodb.dbName}`);
    
    return dbInstance;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDb(): Db {
  if (!dbInstance) {
    throw new Error('MongoDB not connected. Call connectMongo() first.');
  }
  return dbInstance;
}

/**
 * Close MongoDB connection
 */
export async function disconnectMongo(): Promise<void> {
  if (mongoInstance) {
    try {
      await mongoInstance.close();
      mongoInstance = null;
      dbInstance = null;
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection', error);
      throw error;
    }
  }
}

/**
 * Create indexes for RAG collections
 */
export async function createIndexes(): Promise<void> {
  const db = getDb();
  
  try {
    // Indexes for RAG documents
    const ragCollection = db.collection('rag_documents');
    
    // Standard indexes
    await ragCollection.createIndex({ type: 1 });
    await ragCollection.createIndex({ endpoint: 1 });
    await ragCollection.createIndex({ tags: 1 });
    await ragCollection.createIndex({ createdAt: -1 });
    
    // Text index for full-text search
    await ragCollection.createIndex({ 
      content: 'text', 
      title: 'text',
      endpoint: 'text'
    });
    
    logger.info('Created RAG document indexes');
    logger.info('⚠️  IMPORTANT: Create Vector Search Index in MongoDB Atlas UI:');
    logger.info('   Collection: rag_documents');
    logger.info('   Field: embedding');
    logger.info('   Type: vector');
    logger.info('   Dimensions: 1024');
    logger.info('   Similarity: cosine');
    
    // Indexes for test cases
    const testCollection = db.collection('test_cases');
    
    await testCollection.createIndex({ endpoint: 1 });
    await testCollection.createIndex({ method: 1 });
    await testCollection.createIndex({ tags: 1 });
    await testCollection.createIndex({ testType: 1 });
    await testCollection.createIndex({ priority: 1 });
    await testCollection.createIndex({ createdAt: -1 });
    
    // Compound indexes for common queries
    await testCollection.createIndex({ endpoint: 1, method: 1 });
    await testCollection.createIndex({ priority: 1, testType: 1 });
    
    logger.info('Created test case indexes');
    
  } catch (error) {
    logger.error('Error creating indexes', error);
    throw error;
  }
}

/**
 * Create vector search index via MongoDB API
 * Note: Vector search indexes in MongoDB Atlas must be created via the UI or Atlas API
 * This is a reference for the index configuration
 */
export function getVectorIndexDefinition(): Record<string, any> {
  return {
    name: 'vector_index',
    type: 'vectorSearch',
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 1024,
        similarity: 'cosine'
      },
      {
        type: 'filter',
        path: 'type'
      },
      {
        type: 'filter',
        path: 'endpoint'
      },
      {
        type: 'filter',
        path: 'tags'
      }
    ]
  };
}
