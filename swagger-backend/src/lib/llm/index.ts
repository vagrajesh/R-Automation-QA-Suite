/**
 * LLM module index
 */
export { createChatModel, getModelInfo } from './chatModel.js';
export {
  createTestGenerationPrompt,
  createFilteringPrompt,
  TEST_GENERATION_SYSTEM_PROMPT,
  TEST_GENERATION_HUMAN_PROMPT,
  FILTER_GENERATION_SYSTEM_PROMPT,
  FILTER_GENERATION_HUMAN_PROMPT,
  SWAGGER_ANALYSIS_PROMPT,
  ASSERTION_GENERATION_PROMPT
} from './prompts.js';

import { createChatModel } from './chatModel.js';

export default {
  createChatModel
};
