// LLM Provider Configuration
export const LLM_PROVIDER = process.env.LLM_PROVIDER || 'azure-openai'; // 'groq' or 'azure-openai'

// Azure OpenAI Configuration
export const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
export const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
export const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
export const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

// Groq Configuration
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
export const GROQ_API_BASE = process.env.GROQ_API_BASE || 'https://api.groq.com/openai/v1';

// Timeouts and limits
export const RERANK_TIMEOUT_MS = parseInt(process.env.RERANK_TIMEOUT_MS || '30000', 10);
export const RERANK_TOP_K = parseInt(process.env.RERANK_TOP_K || '5', 10);
export const SUMMARIZATION_TIMEOUT_MS = parseInt(process.env.SUMMARIZATION_TIMEOUT_MS || '30000', 10);
export const SUMMARIZATION_TOP_K = parseInt(process.env.SUMMARIZATION_TOP_K || '5', 10);

export default {
  LLM_PROVIDER,
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION,
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_API_BASE,
  RERANK_TIMEOUT_MS,
  RERANK_TOP_K,
  SUMMARIZATION_TIMEOUT_MS,
  SUMMARIZATION_TOP_K
};
