import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import config from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize chat model based on configuration
 */
export function createChatModel(): any {
  const provider = config.llm.provider;
  
  logger.info(`Initializing LLM provider: ${provider}`);

  switch (provider) {
    case 'groq':
      return new ChatGroq({
        apiKey: config.llm.groq.apiKey,
        model: config.llm.groq.model,
        temperature: 0.3, // Lower temperature for more consistent test generation
        maxTokens: 2048
      });

    case 'openai':
      return new ChatOpenAI({
        apiKey: config.llm.openai.apiKey,
        model: config.llm.openai.model,
        temperature: 0.3,
        maxTokens: 2048
      });

    case 'anthropic':
      return new ChatAnthropic({
        apiKey: config.llm.anthropic.apiKey,
        model: config.llm.anthropic.model,
        temperature: 0.3,
        maxTokens: 2048
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Get model information
 */
export function getModelInfo(): { provider: string; model: string } {
  const provider = config.llm.provider;
  
  let model = '';
  switch (provider) {
    case 'groq':
      model = config.llm.groq.model;
      break;
    case 'openai':
      model = config.llm.openai.model;
      break;
    case 'anthropic':
      model = config.llm.anthropic.model;
      break;
  }

  return { provider, model };
}
