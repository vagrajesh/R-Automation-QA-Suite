import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ICEPOT_PROMPT_TEMPLATE } from './prompts.js';

export class TestGenerator {
  constructor(private llm: BaseChatModel) {}

  async generateTestsFromPrompt(prompt: string): Promise<any> {
    const messages = [
      new SystemMessage(ICEPOT_PROMPT_TEMPLATE),
      new HumanMessage(prompt)
    ];

    const response = await this.llm.invoke(messages);
    let content = response.content as string;
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse JSON response, returning raw content');
      return { rawResponse: response.content };
    }
  }

  async generateTestsFromContext(endpoint: string, context: string, count: number = 2, type: string = 'both', source: string = 'RAG Database'): Promise<any> {
    const prompt = `Generate ${count} ${type} test cases for endpoint: ${endpoint}

CONTEXT:
${context}

SOURCE: ${source}

Focus on comprehensive coverage including edge cases and error scenarios. Use the SOURCE information for sourceCitations in your response.`;

    return this.generateTestsFromPrompt(prompt);
  }
}