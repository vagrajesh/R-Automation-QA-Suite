import { logger } from '../../utils/logger.js';
import { getDb } from './mongoClient.js';
import { RAGDocument } from '../../types/index.js';
import embeddingService from './embeddingService.js';

/**
 * Vector Store Operations for RAG
 */
export class VectorStore {
  private collectionName = 'rag_documents';

  /**
   * Store document with embedding
   */
  async addDocument(doc: RAGDocument): Promise<string> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      // Generate embedding if not provided
      let embedding = doc.embedding;
      if (!embedding || embedding.length === 0) {
        try {
          embedding = await embeddingService.generateEmbedding(doc.content);
        } catch (error) {
          logger.warn(`Failed to generate embedding for ${doc.title}, proceeding without it`);
          embedding = [];
        }
      }

      const result = await collection.insertOne({
        ...doc,
        embedding,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      });

      logger.info(`Stored RAG document: ${doc.title}`);
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error storing document', error);
      throw error;
    }
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(docs: RAGDocument[]): Promise<string[]> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      // Generate embeddings for documents that don't have them
      const textsNeedingEmbedding = docs
        .map((doc, idx) => ({ doc, idx }))
        .filter(item => !item.doc.embedding || item.doc.embedding.length === 0);

      let embeddingMap: Record<number, number[]> = {};
      if (textsNeedingEmbedding.length > 0) {
        try {
          const texts = textsNeedingEmbedding.map(item => item.doc.content);
          const embeddings = await embeddingService.generateEmbeddings(texts);
          textsNeedingEmbedding.forEach((item, i) => {
            embeddingMap[item.idx] = embeddings[i];
          });
          logger.info(`Generated ${embeddings.length} embeddings`);
        } catch (error) {
          logger.warn('Failed to generate batch embeddings, proceeding without them', error);
        }
      }

      const docsWithEmbeddings = docs.map((doc, idx) => ({
        ...doc,
        embedding: embeddingMap[idx] || doc.embedding || [],
        contentHash: doc.contentHash || this.generateContentHash(doc.content || ''),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      }));

      const result = await collection.insertMany(docsWithEmbeddings);
      logger.info(`Stored ${docs.length} RAG documents`);
      
      return Object.values(result.insertedIds).map(id => id.toString());
    } catch (error) {
      logger.error('Error storing batch documents', error);
      throw error;
    }
  }

  /**
   * Search documents by query (text search)
   */
  async search(query: string, limit: number = 5): Promise<RAGDocument[]> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      const results = await collection
        .find({
          $text: { $search: query }
        })
        .limit(limit)
        .toArray();

      logger.debug(`Text search returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Error in text search', error);
      return [];
    }
  }

  /**
   * Vector search (requires MongoDB Atlas with Vector Search index)
   */
  async vectorSearch(embedding: number[], limit: number = 5): Promise<RAGDocument[]> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      if (!embedding || embedding.length === 0) {
        logger.warn('Empty embedding provided to vector search, returning empty results');
        return [];
      }

      const results = await collection
        .aggregate<any>([
          {
            $search: {
              cosmosSearch: {
                vector: embedding,
                k: limit
              },
              returnStoredSource: true
            } as any
          },
          {
            $project: {
              similarityScore: { $meta: 'searchScore' },
              document: '$$ROOT'
            }
          },
          {
            $limit: limit
          }
        ])
        .toArray();

      logger.debug(`Vector search returned ${results.length} results`);
      return results.map(r => r.document || r as any);
    } catch (error) {
      logger.error('Error in vector search', error);
      logger.warn('Vector search failed (ensure Vector Search index is created in MongoDB Atlas)');
      return [];
    }
  }

  /**
   * Find documents by criteria
   */
  async findByQuery(query: Record<string, any>, limit: number = 10): Promise<RAGDocument[]> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      const results = await collection
        .find(query)
        .limit(limit)
        .toArray();

      logger.debug(`Query search returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Error querying documents', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<RAGDocument | null> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      const doc = await collection.findOne({ _id: { $oid: id } } as any);
      return doc || null;
    } catch (error) {
      logger.error(`Error retrieving document: ${id}`, error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument(id: string, update: Partial<RAGDocument>): Promise<void> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      await collection.updateOne(
        { _id: { $oid: id } } as any,
        {
          $set: {
            ...update,
            updatedAt: new Date()
          }
        }
      );
      logger.debug(`Updated document: ${id}`);
    } catch (error) {
      logger.error(`Error updating document: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete documents by query
   */
  async delete(query: Record<string, any>): Promise<number> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      const result = await collection.deleteMany(query);
      logger.debug(`Deleted ${result.deletedCount} documents`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error deleting documents', error);
      throw error;
    }
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get document statistics
   */
  async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
    const db = getDb();
    const collection = db.collection<RAGDocument>(this.collectionName);

    try {
      const total = await collection.countDocuments();
      
      const typeStats = await collection
        .aggregate([
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ])
        .toArray();

      const byType: Record<string, number> = {};
      typeStats.forEach(stat => {
        byType[stat._id] = stat.count;
      });

      return { total, byType };
    } catch (error) {
      logger.error('Error getting statistics', error);
      throw error;
    }
  }
}

export default new VectorStore();
