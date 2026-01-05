import axios, { AxiosError } from 'axios';
import {
  MISTRAL_API_KEY,
  MISTRAL_EMBEDDING_MODEL,
  MISTRAL_API_BASE,
  EMBEDDING_RETRY_MAX,
  EMBEDDING_RETRY_BACKOFF_MS
} from '../../config/embedding';
import logger from '../../utils/logger';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEmbedding(input: string): Promise<EmbeddingResult> {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY is not configured');
  }

  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  const url = `${MISTRAL_API_BASE}/v1/embeddings`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= EMBEDDING_RETRY_MAX; attempt++) {
    try {
      logger.info('Generating embedding', { attempt, model: MISTRAL_EMBEDDING_MODEL });

      const response = await axios.post(
        url,
        {
          model: MISTRAL_EMBEDDING_MODEL,
          input: input
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MISTRAL_API_KEY}`
          },
          timeout: 30000
        }
      );

      const data = response.data;

      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid response structure from Mistral API');
      }

      logger.info('Embedding generated successfully', {
        dimensions: data.data[0].embedding.length,
        tokens: data.usage?.total_tokens
      });

      return {
        embedding: data.data[0].embedding,
        model: data.model || MISTRAL_EMBEDDING_MODEL,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        }
      };
    } catch (err) {
      const error = err as AxiosError;
      lastError = error;

      logger.error('Embedding generation failed', {
        attempt,
        status: error.response?.status,
        message: error.message
      });

      if (attempt < EMBEDDING_RETRY_MAX) {
        const backoff = EMBEDDING_RETRY_BACKOFF_MS * attempt;
        logger.info(`Retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }

  throw lastError || new Error('Failed to generate embedding after retries');
}

export default { generateEmbedding };
