import vectorStore from './vectorStore.js';
import { RAGDocument } from '../../types/index.js';
import config from '../../config/index.js';
import { QueryProcessor, ProcessedQuery } from './queryProcessor.js';
import { DocumentDeduplicator, DeduplicationResult } from './deduplicator.js';
import { Document } from '@langchain/core/documents';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * RAG Retriever - handles document retrieval from MongoDB with preprocessing and deduplication
 */
export class RAGRetriever {
  private queryProcessor: QueryProcessor;
  private deduplicator: DocumentDeduplicator;

  constructor(llm?: BaseChatModel) {
    this.queryProcessor = new QueryProcessor(llm);
    this.deduplicator = new DocumentDeduplicator();
  }

  /**
   * Enhanced retrieve with query preprocessing and deduplication
   */
  async retrieve(query: string, filters?: Record<string, any>): Promise<RAGDocument[]> {
    try {
      // Preprocess query for better search
      const processedQuery = await this.queryProcessor.preprocessQuery(query);

      // Merge filters from query processing
      const combinedFilters = { ...filters, ...processedQuery.filters };

      // Search with expanded query
      let results = await vectorStore.search(processedQuery.expandedQuery, config.rag.topK * 2);

      // Fallback to original query if no results
      if (results.length === 0) {
        results = await vectorStore.search(query, config.rag.topK);
      }

      // Apply filters if no results from text search
      if (results.length === 0 && Object.keys(combinedFilters).length > 0) {
        results = await vectorStore.findByQuery(combinedFilters, config.rag.topK);
      }

      // Convert to Documents for deduplication
      const documents = results.map(doc => new Document({
        pageContent: doc.content,
        metadata: { ...doc.metadata, source: doc.metadata?.source || '', title: doc.title }
      }));

      // Deduplicate and filter
      const deduplicationResult = this.deduplicateResults(documents);

      // Convert back to RAGDocument format
      const finalResults = deduplicationResult.uniqueDocuments
        .slice(0, config.rag.topK)
        .map(doc => ({
          id: doc.metadata.id || '',
          content: doc.pageContent,
          title: doc.metadata.title || '',
          source: doc.metadata.source || '',
          type: doc.metadata.type || 'document',
          metadata: doc.metadata
        } as RAGDocument));

      return finalResults;
    } catch (error) {
      console.error('Error retrieving documents', error);
      return [];
    }
  }

  /**
   * Retrieve documents by endpoint
   */
  async retrieveByEndpoint(endpoint: string): Promise<RAGDocument[]> {
    try {
      return await vectorStore.findByQuery(
        { endpoint },
        config.rag.topK
      );
    } catch (error) {
      console.error(`Error retrieving documents for endpoint: ${endpoint}`, error);
      return [];
    }
  }

  /**
   * Retrieve documents by type
   */
  async retrieveByType(type: RAGDocument['type']): Promise<RAGDocument[]> {
    try {
      return await vectorStore.findByQuery(
        { type },
        config.rag.topK
      );
    } catch (error) {
      console.error(`Error retrieving documents of type: ${type}`, error);
      return [];
    }
  }

  /**
   * Retrieve error code documentation
   */
  async retrieveErrorDocs(statusCode: number): Promise<RAGDocument[]> {
    try {
      return await vectorStore.findByQuery(
        {
          type: 'error-code',
          'metadata.statusCode': statusCode
        },
        5
      );
    } catch (error) {
      console.error(`Error retrieving error code docs for ${statusCode}`, error);
      return [];
    }
  }

  /**
   * Deduplicate search results
   */
  private deduplicateResults(documents: Document[]): DeduplicationResult {
    // First filter low quality documents
    const filtered = this.deduplicator.filterLowQuality(documents, 30);
    
    // Then deduplicate
    const deduplicated = this.deduplicator.deduplicate(filtered, 0.85);
    
    // Finally merge very similar documents
    const merged = this.deduplicator.mergeSimilarDocuments(deduplicated.uniqueDocuments, 0.7);
    
    return {
      uniqueDocuments: merged,
      duplicatesRemoved: deduplicated.duplicatesRemoved + (filtered.length - documents.length),
      similarityThreshold: deduplicated.similarityThreshold
    };
  }

  /**
   * Format retrieved documents for LLM context with relevance scoring
   */
  formatContext(documents: RAGDocument[]): string {
    return documents
      .map((doc, index) => {
        const relevanceScore = Math.max(0.9 - (index * 0.1), 0.1);
        return `## ${doc.title} (Relevance: ${relevanceScore.toFixed(1)})\n${doc.content}\n`;
      })
      .join('\n---\n');
  }

  /**
   * Get query processing insights
   */
  async getQueryInsights(query: string): Promise<ProcessedQuery> {
    return this.queryProcessor.preprocessQuery(query);
  }
}

// Default instance without LLM
export default new RAGRetriever();
