import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface ProcessedQuery {
  originalQuery: string;
  expandedQuery: string;
  keywords: string[];
  intent: 'endpoint' | 'schema' | 'error' | 'auth' | 'general';
  filters: {
    method?: string;
    path?: string;
    module?: string;
  };
}

export class QueryProcessor {
  constructor(private llm?: BaseChatModel) {}

  async preprocessQuery(query: string): Promise<ProcessedQuery> {
    const keywords = this.extractKeywords(query);
    const intent = this.detectIntent(query);
    const filters = this.extractFilters(query);
    
    let expandedQuery = query;
    if (this.llm) {
      expandedQuery = await this.expandQueryWithLLM(query);
    } else {
      expandedQuery = this.expandQueryWithRules(query);
    }

    return {
      originalQuery: query,
      expandedQuery,
      keywords,
      intent,
      filters
    };
  }

  private extractKeywords(query: string): string[] {
    const apiTerms = ['endpoint', 'api', 'request', 'response', 'parameter', 'schema', 'error', 'auth'];
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const statusCodes = ['200', '400', '401', '403', '404', '500'];
    
    const words = query.toLowerCase().split(/\s+/);
    const keywords = new Set<string>();
    
    words.forEach(word => {
      if (apiTerms.includes(word) || httpMethods.includes(word.toUpperCase()) || statusCodes.includes(word)) {
        keywords.add(word);
      }
      if (word.startsWith('/')) keywords.add(word); // API paths
      if (word.includes('_') || word.includes('-')) keywords.add(word); // API naming
    });
    
    return Array.from(keywords);
  }

  private detectIntent(query: string): ProcessedQuery['intent'] {
    const lower = query.toLowerCase();
    
    if (lower.includes('endpoint') || lower.includes('path') || /\/([\w\-\/{}]+)/.test(query)) {
      return 'endpoint';
    }
    if (lower.includes('schema') || lower.includes('model') || lower.includes('field')) {
      return 'schema';
    }
    if (lower.includes('error') || lower.includes('exception') || /[45]\d{2}/.test(query)) {
      return 'error';
    }
    if (lower.includes('auth') || lower.includes('token') || lower.includes('login')) {
      return 'auth';
    }
    
    return 'general';
  }

  private extractFilters(query: string): ProcessedQuery['filters'] {
    const filters: ProcessedQuery['filters'] = {};
    
    // Extract HTTP method
    const methodMatch = query.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/i);
    if (methodMatch) {
      filters.method = methodMatch[1].toUpperCase();
    }
    
    // Extract API path
    const pathMatch = query.match(/\/[\w\-\/{}]+/);
    if (pathMatch) {
      filters.path = pathMatch[0];
    }
    
    // Extract module/service name
    const moduleMatch = query.match(/\b(user|order|product|payment|auth|search)\w*/i);
    if (moduleMatch) {
      filters.module = moduleMatch[0].toLowerCase();
    }
    
    return filters;
  }

  private expandQueryWithRules(query: string): string {
    let expanded = query;
    
    // Add synonyms
    const synonyms = {
      'endpoint': 'endpoint API route path',
      'error': 'error exception failure',
      'auth': 'authentication authorization security',
      'test': 'test case scenario validation',
      'response': 'response output result'
    };
    
    Object.entries(synonyms).forEach(([term, expansion]) => {
      if (query.toLowerCase().includes(term)) {
        expanded += ` ${expansion}`;
      }
    });
    
    return expanded;
  }

  private async expandQueryWithLLM(query: string): Promise<string> {
    if (!this.llm) return query;
    
    const prompt = `Expand this API testing query with relevant synonyms and technical terms:
Query: "${query}"

Add related terms for better document retrieval. Keep it concise.
Response format: expanded query only, no explanations.`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      console.warn('LLM query expansion failed, using rule-based expansion');
      return this.expandQueryWithRules(query);
    }
  }
}