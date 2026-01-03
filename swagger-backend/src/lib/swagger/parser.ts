import SwaggerParserLib from '@apidevtools/swagger-parser';
import { Endpoint, Parameter, Response, SchemaObject } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Parse and validate OpenAPI/Swagger specifications
 */
export class SwaggerParser {
  /**
   * Parse Swagger/OpenAPI file or URL
   */
  async parse(source: string): Promise<any> {
    try {
      logger.info(`Parsing Swagger spec from: ${source}`);
      
      const api = await SwaggerParserLib.validate(source);
      logger.info(`Successfully parsed Swagger spec`);
      
      return api;
    } catch (error) {
      logger.error(`Error parsing Swagger spec: ${source}`, error);
      throw error;
    }
  }

  /**
   * Extract all endpoints from OpenAPI spec
   */
  extractEndpoints(spec: any): Endpoint[] {
    const endpoints: Endpoint[] = [];
    const basePath = spec.basePath || '';

    const paths = spec.paths || {};

    Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
          return;
        }

        const endpoint: Endpoint = {
          path: `${basePath}${path}`,
          method: method.toUpperCase() as any,
          summary: operation.summary,
          description: operation.description,
          parameters: this.extractParameters(operation.parameters || []),
          requestBody: this.extractRequestBody(operation.requestBody),
          responses: this.extractResponses(operation.responses || {}),
          tags: operation.tags || [],
          operationId: operation.operationId,
          deprecated: operation.deprecated || false
        };

        endpoints.push(endpoint);
      });
    });

    logger.info(`Extracted ${endpoints.length} endpoints from Swagger spec`);
    return endpoints;
  }

  /**
   * Extract parameters from operation
   */
  private extractParameters(params: any[]): Parameter[] {
    return params.map(param => ({
      name: param.name,
      in: param.in as any,
      description: param.description,
      required: param.required || false,
      schema: param.schema || { type: param.type },
      example: param.example
    }));
  }

  /**
   * Extract request body from operation
   */
  private extractRequestBody(requestBody: any): any {
    if (!requestBody) return undefined;

    return {
      required: requestBody.required || false,
      content: requestBody.content || {}
    };
  }

  /**
   * Extract responses from operation
   */
  private extractResponses(responses: Record<string, any>): Record<string, Response> {
    const extracted: Record<string, Response> = {};

    Object.entries(responses).forEach(([statusCode, response]: [string, any]) => {
      extracted[statusCode] = {
        description: response.description,
        content: response.content,
        headers: response.headers
      };
    });

    return extracted;
  }

  /**
   * Get schema information from spec
   */
  getSchema(spec: any, schemaRef: string): SchemaObject | null {
    try {
      // Handle $ref like "#/components/schemas/User"
      if (schemaRef.startsWith('#/')) {
        const parts = schemaRef.substring(2).split('/');
        let current = spec;

        for (const part of parts) {
          current = current[part];
          if (!current) return null;
        }

        return current;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting schema: ${schemaRef}`, error);
      return null;
    }
  }

  /**
   * Validate request against schema
   */
  validateAgainstSchema(data: any, schema: SchemaObject): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema) {
      return { valid: true, errors: [] };
    }

    // Check required fields
    if (schema.required) {
      schema.required.forEach(field => {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    // Check field types
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([field, fieldSchema]: [string, any]) => {
        if (field in data) {
          const fieldValue = data[field];
          const expectedType = fieldSchema.type;

          if (expectedType && typeof fieldValue !== expectedType) {
            errors.push(`Field ${field}: expected ${expectedType}, got ${typeof fieldValue}`);
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new SwaggerParser();
