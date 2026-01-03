import { HfInference } from '@huggingface/inference';
import { Mistral } from '@mistralai/mistralai';
import config from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Embedding Service - Generate vector embeddings for documents
 */
export class EmbeddingService {
  private hf: HfInference | null = null;
  private mistral: Mistral | null = null;
  private embeddingDimension: number = 1024;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize embedding provider
   */
  private initialize() {
    const provider = config.embedding.model;
    
    try {
      if (provider === 'huggingface') {
        const hfToken = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
        if (!hfToken) {
          logger.warn('HuggingFace API key not configured, embeddings will be disabled');
          return;
        }
        this.hf = new HfInference(hfToken);
        logger.info('HuggingFace embedding provider initialized');
      } else if (provider === 'mistral') {
        const mistralKey = config.embedding.mistralKey;
        if (!mistralKey) {
          logger.warn('Mistral API key not configured, embeddings will be disabled');
          return;
        }
        this.mistral = new Mistral({
          apiKey: mistralKey
        });
        this.embeddingDimension = 1024;
        logger.info('Mistral embedding provider initialized (1024 dimensions)');
      }
    } catch (error) {
      logger.warn(`Error initializing embedding service: ${error}`);
    }
  }

  /**
   * Generate embedding for text using HuggingFace
   */
  private async generateViaHuggingFace(text: string): Promise<number[]> {
    if (!this.hf) {
      throw new Error('HuggingFace provider not initialized');
    }

    try {
      const response = await this.hf.featureExtraction({
        model: 'BAAI/bge-large-en-v1.5',
        inputs: text,
        truncate: true
      });

      // Convert to array if needed
      const embedding = (Array.isArray(response) ? response : Array.from(response as any)) as number[];
      logger.debug(`Generated HuggingFace embedding (${embedding.length} dimensions)`);
      
      return embedding;
    } catch (error) {
      logger.error('Error generating HuggingFace embedding', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text using Mistral
   */
  private async generateViaMistral(text: string): Promise<number[]> {
    if (!this.mistral) {
      throw new Error('Mistral provider not initialized');
    }

    try {
      const response = await this.mistral.embeddings.create({
        model: 'mistral-embed',
        inputs: [text]
      });

      const embedding = response.data[0]?.embedding as number[];
      if (!embedding) {
        throw new Error('No embedding returned from Mistral');
      }

      logger.debug(`Generated Mistral embedding (${embedding.length} dimensions)`);
      return embedding;
    } catch (error) {
      logger.error('Error generating Mistral embedding', error);
      throw error;
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const provider = config.embedding.model;

      if (provider === 'huggingface') {
        return await this.generateViaHuggingFace(text);
      } else if (provider === 'mistral') {
        return await this.generateViaMistral(text);
      } else {
        // Fallback: return zero vector if no provider configured
        logger.warn(`Unknown embedding provider: ${provider}, returning zero vector`);
        return Array(this.embeddingDimension).fill(0);
      }
    } catch (error) {
      logger.error('Error generating embedding', error);
      // Return zero vector on error instead of throwing
      return Array(this.embeddingDimension).fill(0);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const provider = config.embedding.model;

      if (provider === 'mistral') {
        // Mistral supports batch embeddings
        if (!this.mistral) {
          throw new Error('Mistral provider not initialized');
        }

        const response = await this.mistral.embeddings.create({
          model: 'mistral-embed',
          inputs: texts
        });

        return response.data.map((item: any) => item.embedding as number[]);
      } else {
        // HuggingFace or other providers: generate one by one
        const embeddings: number[][] = [];
        for (const text of texts) {
          const embedding = await this.generateEmbedding(text);
          embeddings.push(embedding);
        }
        return embeddings;
      }
    } catch (error) {
      logger.error('Error generating batch embeddings', error);
      // Return zero vectors on error
      return texts.map(() => Array(this.embeddingDimension).fill(0));
    }
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension(): number {
    return this.embeddingDimension;
  }
}

export default new EmbeddingService();
