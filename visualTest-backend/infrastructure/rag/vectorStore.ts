import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { getDb } from '../persistence/mongoClient';
import { logger } from '../logging/logger';

export class VectorStoreService {
  private vectorStore: MongoDBAtlasVectorSearch | null = null;

  async initialize(embeddings: any): Promise<void> {
    try {
      const db = getDb();
      
      this.vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: db.collection('visual_embeddings'),
        indexName: 'vector_index',
        textKey: 'content',
        embeddingKey: 'embedding',
      });
      
      logger.info('Vector store initialized');
    } catch (error) {
      logger.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  async addDocuments(documents: any[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }
    
    await this.vectorStore.addDocuments(documents);
    logger.info(`Added ${documents.length} documents to vector store`);
  }

  async similaritySearch(query: string, k: number = 5): Promise<any[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }
    
    return await this.vectorStore.similaritySearch(query, k);
  }

  getVectorIndexDefinition(): Record<string, any> {
    return {
      name: 'vector_index',
      type: 'vectorSearch',
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'filter',
          path: 'projectId'
        },
        {
          type: 'filter',
          path: 'type'
        }
      ]
    };
  }
}