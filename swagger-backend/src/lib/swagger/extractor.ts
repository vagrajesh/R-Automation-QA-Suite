import { logger } from '../../utils/logger.js';
import { Endpoint } from '../../types/index.js';

/**
 * Extract test-relevant information from Swagger endpoints
 */
export class SwaggerExtractor {
  /**
   * Extract endpoint chunks for RAG ingestion
   */
  extractEndpointChunks(endpoint: Endpoint): string[] {
    const chunks: string[] = [];

    // Chunk 1: Basic endpoint info
    chunks.push(`
Endpoint: ${endpoint.method} ${endpoint.path}
Summary: ${endpoint.summary || 'N/A'}
Description: ${endpoint.description || 'N/A'}
Tags: ${endpoint.tags.join(', ') || 'N/A'}
Deprecated: ${endpoint.deprecated ? 'Yes' : 'No'}
    `.trim());

    // Chunk 2: Parameters
    if (endpoint.parameters.length > 0) {
      const paramInfo = endpoint.parameters
        .map(p => `- ${p.name} (${p.in}): ${p.description || 'N/A'} - ${p.required ? 'Required' : 'Optional'}`)
        .join('\n');
      
      chunks.push(`Parameters for ${endpoint.method} ${endpoint.path}:\n${paramInfo}`);
    }

    // Chunk 3: Request body
    if (endpoint.requestBody) {
      const bodyInfo = JSON.stringify(endpoint.requestBody, null, 2);
      chunks.push(`Request Body for ${endpoint.method} ${endpoint.path}:\n${bodyInfo}`);
    }

    // Chunk 4: Response codes and descriptions
    const responseInfo = Object.entries(endpoint.responses)
      .map(([code, resp]) => `${code}: ${resp.description}`)
      .join('\n');
    
    chunks.push(`Responses for ${endpoint.method} ${endpoint.path}:\n${responseInfo}`);

    return chunks;
  }

  /**
   * Extract error scenarios from endpoint responses
   */
  extractErrorScenarios(endpoint: Endpoint): Array<{ code: string; description: string; testScenario: string }> {
    const scenarios: Array<{ code: string; description: string; testScenario: string }> = [];

    Object.entries(endpoint.responses).forEach(([statusCode, response]) => {
      const code = parseInt(statusCode);

      // Focus on error codes
      if (code >= 400) {
        scenarios.push({
          code: statusCode,
          description: response.description,
          testScenario: `Should return ${statusCode} when ${this.generateScenarioDescription(code)}`
        });
      }
    });

    return scenarios;
  }

  /**
   * Extract success scenarios
   */
  extractSuccessScenarios(endpoint: Endpoint): Array<{ code: string; description: string }> {
    const scenarios: Array<{ code: string; description: string }> = [];

    Object.entries(endpoint.responses).forEach(([statusCode, response]) => {
      const code = parseInt(statusCode);

      if (code >= 200 && code < 300) {
        scenarios.push({
          code: statusCode,
          description: response.description
        });
      }
    });

    return scenarios;
  }

  /**
   * Generate scenario description from HTTP status code
   */
  private generateScenarioDescription(statusCode: number): string {
    const descriptions: Record<number, string> = {
      400: 'invalid request data is provided',
      401: 'authentication is missing or invalid',
      403: 'user does not have permission',
      404: 'resource is not found',
      409: 'resource conflict occurs',
      422: 'request validation fails',
      429: 'rate limit is exceeded',
      500: 'server error occurs',
      503: 'service is unavailable'
    };

    return descriptions[statusCode] || 'error response is returned';
  }

  /**
   * Extract test data requirements from endpoint
   */
  extractTestDataRequirements(endpoint: Endpoint): Record<string, any> {
    const requirements: Record<string, any> = {
      pathParameters: {},
      queryParameters: {},
      bodySchema: null
    };

    // Path and query parameters
    endpoint.parameters.forEach(param => {
      const paramDef = {
        type: param.schema.type,
        required: param.required,
        example: param.example
      };

      if (param.in === 'path') {
        requirements.pathParameters[param.name] = paramDef;
      } else if (param.in === 'query') {
        requirements.queryParameters[param.name] = paramDef;
      }
    });

    // Request body schema
    if (endpoint.requestBody) {
      const contentType = Object.keys(endpoint.requestBody.content)[0];
      if (contentType) {
        requirements.bodySchema = endpoint.requestBody.content[contentType].schema;
      }
    }

    return requirements;
  }
}

export default new SwaggerExtractor();
