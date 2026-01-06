import { MongoClient, Db } from 'mongodb';
import { appConfig } from '../../core/config';
import { logger } from '../logging/logger';

let mongoInstance: MongoClient | null = null;
let dbInstance: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (dbInstance) {
    logger.info('Using existing MongoDB connection');
    return dbInstance;
  }

  try {
    logger.info(`Connecting to MongoDB: ${appConfig.database.uri.split('@')[1]}`);
    
    mongoInstance = new MongoClient(appConfig.database.uri);
    await mongoInstance.connect();
    
    dbInstance = mongoInstance.db(appConfig.database.name);
    
    // Verify connection
    await dbInstance.admin().ping();
    logger.info(`Connected to MongoDB database: ${appConfig.database.name}`);
    
    return dbInstance;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

export function getDb(): Db {
  if (!dbInstance) {
    throw new Error('MongoDB not connected. Call connectMongo() first.');
  }
  return dbInstance;
}

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

export async function createIndexes(): Promise<void> {
  const db = getDb();
  
  try {
    // Indexes for projects
    const projectsCollection = db.collection('projects');
    await projectsCollection.createIndex({ id: 1 }, { unique: true });
    await projectsCollection.createIndex({ name: 1 });
    await projectsCollection.createIndex({ isActive: 1 });
    await projectsCollection.createIndex({ createdAt: -1 });
    
    // Indexes for baselines
    const baselinesCollection = db.collection('baselines');
    await baselinesCollection.createIndex({ id: 1 }, { unique: true });
    await baselinesCollection.createIndex({ projectId: 1 });
    await baselinesCollection.createIndex({ projectId: 1, name: 1 });
    await baselinesCollection.createIndex({ projectId: 1, name: 1, version: -1 });
    await baselinesCollection.createIndex({ isActive: 1 });
    await baselinesCollection.createIndex({ createdAt: -1 });
    
    // Indexes for test runs
    const testRunsCollection = db.collection('test_runs');
    await testRunsCollection.createIndex({ id: 1 }, { unique: true });
    await testRunsCollection.createIndex({ projectId: 1 });
    await testRunsCollection.createIndex({ status: 1 });
    await testRunsCollection.createIndex({ priority: 1 });
    await testRunsCollection.createIndex({ createdAt: -1 });
    await testRunsCollection.createIndex({ projectId: 1, status: 1 });
    
    // Indexes for test results
    const testResultsCollection = db.collection('test_results');
    await testResultsCollection.createIndex({ id: 1 }, { unique: true });
    await testResultsCollection.createIndex({ testRunId: 1 });
    await testResultsCollection.createIndex({ baselineId: 1 });
    await testResultsCollection.createIndex({ status: 1 });
    await testResultsCollection.createIndex({ similarityScore: 1 });
    await testResultsCollection.createIndex({ createdAt: -1 });
    
    logger.info('Created database indexes');
    
  } catch (error) {
    logger.error('Error creating indexes', error);
    throw error;
  }
}