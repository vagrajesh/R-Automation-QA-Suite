import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'swagger_test_generator'
  },

  // LLM Provider
  llm: {
    provider: (process.env.MODEL_PROVIDER || 'groq') as 'groq' | 'openai' | 'anthropic',
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
    }
  },

  // Embedding
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'mistral',
    mistralKey: process.env.MISTRAL_API_KEY || ''
  },

  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10)
  },

  // Test Configuration
  test: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    timeout: parseInt(process.env.TEST_TIMEOUT || '60000', 10),
    retries: parseInt(process.env.TEST_RETRIES || '1', 10)
  },

  // RAG Configuration
  rag: {
    topK: parseInt(process.env.RAG_TOP_K || '5', 10),
    similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7')
  },

  // Reporting
  report: {
    format: process.env.REPORT_FORMAT || 'html',
    outputDir: path.join(__dirname, '../../reports')
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

export default config;
