import swaggerParser from '../swagger/parser.js';
import path from 'path';
import { DocumentParser, ParsedDocument } from './DocumentParser.js';

export class SwaggerDocumentParser implements DocumentParser {
  canHandle(filePath: string): boolean {
    const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
    if (isUrl) {
      // For URLs, accept spec files or Swagger UI base URLs
      return /\.(yaml|yml|json)$/i.test(filePath) || 
             /\/(openapi|swagger)\.(json|yaml|yml)$/i.test(filePath) ||
             /\/api\/.*\.(json|yaml|yml)$/i.test(filePath) ||
             this.isSwaggerUIUrl(filePath);
    }
    return /\.(yaml|yml|json)$/i.test(filePath) && 
           (filePath.includes('swagger') || filePath.includes('openapi') || filePath.includes('api'));
  }

  private isSwaggerUIUrl(url: string): boolean {
    // Check if it's a Swagger UI base URL (not ending with a file extension)
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // If path is just "/" or doesn't end with a file extension, it might be a Swagger UI
    if (path === '/' || !/\.(html|json|yaml|yml|js|css)$/i.test(path)) {
      // Check for common Swagger UI indicators in the hostname
      return /swagger/i.test(urlObj.hostname) || 
             urlObj.hostname.includes('petstore') ||
             urlObj.hostname.includes('api');
    }
    return false;
  }

  private async resolveSwaggerUIUrl(uiUrl: string): Promise<string> {
    try {
      // Known mappings for common Swagger UI instances
      const knownMappings: { [key: string]: string } = {
        'petstore3.swagger.io': 'https://petstore3.swagger.io/api/v3/openapi.json',
        'petstore.swagger.io': 'https://petstore.swagger.io/v2/swagger.json',
        'petstore31.swagger.io': 'https://petstore31.swagger.io/api/v31/openapi.json',
        'generator.swagger.io': 'https://generator.swagger.io/api/swagger.json',
        'generator3.swagger.io': 'https://generator3.swagger.io/openapi.json',
        'validator.swagger.io': 'https://validator.swagger.io/validator/openapi.json',
        'oai.swagger.io': 'https://oai.swagger.io/api/openapi.json',
        'converter.swagger.io': 'https://converter.swagger.io/api/openapi.json'
      };

      const urlObj = new URL(uiUrl);
      const hostname = urlObj.hostname;

      // Check if we have a known mapping
      if (knownMappings[hostname]) {
        return knownMappings[hostname];
      }

      // Try common spec URL patterns
      const commonPatterns = [
        `${uiUrl.replace(/\/$/, '')}/api/v3/openapi.json`,
        `${uiUrl.replace(/\/$/, '')}/v3/api-docs`,
        `${uiUrl.replace(/\/$/, '')}/swagger.json`,
        `${uiUrl.replace(/\/$/, '')}/openapi.json`
      ];

      // Try each pattern and see if it returns valid JSON
      for (const pattern of commonPatterns) {
        try {
          const axios = (await import('axios')).default;
          const response = await axios.get(pattern, { timeout: 5000 });
          if (response.status === 200 && response.headers['content-type']?.includes('json')) {
            // Quick check if it's a valid OpenAPI spec
            const data = response.data;
            if (data.openapi || data.swagger) {
              return pattern;
            }
          }
        } catch (error) {
          // Continue to next pattern
          continue;
        }
      }

      // If no pattern works, try to fetch the swagger-initializer.js and extract the URL
      try {
        const axios = (await import('axios')).default;
        const initializerUrl = `${uiUrl.replace(/\/$/, '')}/swagger-initializer.js`;
        const response = await axios.get(initializerUrl, { timeout: 5000 });
        
        // Look for the definitionURL in the JavaScript
        const jsContent = response.data;
        const urlMatch = jsContent.match(/definitionURL\s*=\s*["']([^"']+)["']/);
        if (urlMatch && urlMatch[1]) {
          return urlMatch[1];
        }
        
        // Look for the ossServices mapping
        const ossMatch = jsContent.match(/ossServices\s*=\s*`([^`]+)`/);
        if (ossMatch && ossMatch[1]) {
          const services = ossMatch[1].split(',').map((s: string) => s.split('='));
          const service = services.find(([host]: [string]) => hostname.includes(host));
          if (service && service[1]) {
            return service[1];
          }
        }
      } catch (error) {
        // Continue
      }

      throw new Error(`Could not resolve Swagger spec URL from ${uiUrl}`);
    } catch (error) {
      throw new Error(`Failed to resolve Swagger UI URL ${uiUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    let specUrl = filePath;
    
    // If it's a Swagger UI URL, resolve it to the actual spec URL
    if (this.isSwaggerUIUrl(filePath)) {
      specUrl = await this.resolveSwaggerUIUrl(filePath);
    }
    
    const spec = await swaggerParser.parse(specUrl);
    const endpoints = swaggerParser.extractEndpoints(spec);
    
    const content = endpoints.map(ep => 
      `${ep.method} ${ep.path}: ${ep.summary || ep.description || ''}`
    ).join('\n');

    return {
      title: spec.info?.title || path.basename(filePath),
      content,
      endpoints,
      metadata: {
        version: spec.info?.version,
        description: spec.info?.description,
        source: filePath
      },
      type: 'swagger'
    };
  }
}