import axios from 'axios';
import {
  LLM_PROVIDER,
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION,
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_API_BASE
} from '../../config/llm';
import logger from '../../utils/logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMCompletionResult {
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

async function callAzureOpenAI(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
  if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) {
    throw new Error('Azure OpenAI credentials not configured');
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const response = await axios.post(
    url,
    {
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2000
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY
      },
      timeout: options.timeout || 30000
    }
  );

  const data = response.data;

  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'azure-openai',
    model: AZURE_OPENAI_DEPLOYMENT,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0
    }
  };
}

async function callGroq(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  const url = `${GROQ_API_BASE}/chat/completions`;

  const response = await axios.post(
    url,
    {
      model: GROQ_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2000
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      timeout: options.timeout || 30000
    }
  );

  const data = response.data;

  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'groq',
    model: GROQ_MODEL,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0
    }
  };
}

export async function completeLLM(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
  logger.info('Calling LLM', { provider: LLM_PROVIDER });

  try {
    if (LLM_PROVIDER === 'groq') {
      return await callGroq(options);
    } else {
      return await callAzureOpenAI(options);
    }
  } catch (err: any) {
    logger.error('LLM call failed', {
      provider: LLM_PROVIDER,
      error: err?.message || err,
      status: err?.response?.status
    });
    throw err;
  }
}

export function getCurrentProvider(): string {
  return LLM_PROVIDER;
}

export default { completeLLM, getCurrentProvider };
