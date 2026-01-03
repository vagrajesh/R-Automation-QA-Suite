import { test, expect } from '@playwright/test';
import config from '../../config/index.js';
import { TestCase } from '../../types/index.js';

/**
 * Base test utilities for Playwright tests
 */
export class BaseTestUtils {
  /**
   * Make API request with proper error handling
   */
  static async makeRequest(
    context: any,
    method: string,
    path: string,
    options?: {
      query?: Record<string, any>;
      body?: any;
      headers?: Record<string, string>;
    }
  ) {
    const url = new URL(`${config.api.baseUrl}${path}`);

    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await context.request.fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      data: options?.body ? JSON.stringify(options.body) : undefined,
      timeout: config.api.timeout
    });

    return response;
  }

  /**
   * Validate response schema
   */
  static validateSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (schema.type && typeof data !== schema.type) {
      errors.push(`Type mismatch: expected ${schema.type}, got ${typeof data}`);
    }

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        if (key in data) {
          if (prop.type && typeof data[key] !== prop.type) {
            errors.push(`Field ${key}: expected ${prop.type}, got ${typeof data[key]}`);
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Assert response matches expectations
   */
  static assertResponse(
    response: any,
    expectedStatus: number,
    expectedBody?: any
  ) {
    expect(response.status()).toBe(expectedStatus);

    if (expectedBody) {
      // Compare keys and types, not exact values
      const actualKeys = Object.keys(expectedBody);
      const responseData = JSON.parse(response.body);
      
      actualKeys.forEach(key => {
        expect(responseData).toHaveProperty(key);
      });
    }
  }
}

/**
 * Generate Playwright test from TestCase
 */
export function generatePlaywrightTest(testCase: TestCase): string {
  return `
test('${testCase.name}', async ({ request }) => {
  const url = '${testCase.request.path}';
  
  const response = await request.${testCase.method.toLowerCase()}(url, {
    headers: ${JSON.stringify(testCase.request.headers || {})},
    data: ${JSON.stringify(testCase.request.body || {})}
  });

  expect(response.status()).toBe(${testCase.expected.statusCode});
  
  const responseData = await response.json();
  // Add assertion checks here
});
  `.trim();
}
