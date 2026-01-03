import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestCase, TestReport, ExecutionResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test Executor - Run and track test execution
 */
export class TestExecutor {
  /**
   * Generate Playwright test file from test cases
   */
  async generateTestFile(testCases: TestCase[], filename: string): Promise<string> {
    try {
      const testCode = this.generateTestCode(testCases);
      const filePath = path.join(__dirname, '../../..', 'tests/generated', filename);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, testCode);
      logger.info(`Generated test file: ${filePath}`);

      return filePath;
    } catch (error) {
      logger.error('Error generating test file', error);
      throw error;
    }
  }

  /**
   * Generate TypeScript test code from test cases
   */
  private generateTestCode(testCases: TestCase[]): string {
    const imports = `
import { test, expect } from '@playwright/test';
import config from '../../config/index.js';

test.describe('API Tests - Generated from Swagger', () => {
`;

    const tests = testCases.map(tc => this.generateSingleTest(tc)).join('\n\n');

    const closing = `
});
`;

    return imports + tests + closing;
  }

  /**
   * Generate a single test case
   */
  private generateSingleTest(tc: TestCase): string {
    return `
  test('${tc.name}', async ({ request }) => {
    const baseUrl = '${tc.request.path}';
    
    const response = await request.${tc.method.toLowerCase()}(baseUrl, {
      ${tc.request.headers ? `headers: ${JSON.stringify(tc.request.headers)},` : ''}
      ${tc.request.body ? `data: ${JSON.stringify(tc.request.body)},` : ''}
    });

    // Assertion: Status Code
    expect(response.status()).toBe(${tc.expected.statusCode});
    
    // Assertion: Response is JSON
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    ${tc.assertions ? tc.assertions.map(a => `expect(${a});`).join('\n    ') : ''}
  });
    `.trim();
  }

  /**
   * Parse Playwright test results
   */
  async parseTestResults(resultsFile: string): Promise<TestReport> {
    try {
      const content = fs.readFileSync(resultsFile, 'utf-8');
      const results = JSON.parse(content);

      const report: TestReport = {
        generatedAt: new Date(),
        totalTests: results.stats.expected,
        passed: results.stats.expected - results.stats.unexpected,
        failed: results.stats.unexpected,
        skipped: results.stats.skipped,
        duration: results.stats.duration,
        results: [],
        summary: ''
      };

      // Parse individual results
      results.suites.forEach((suite: any) => {
        suite.tests?.forEach((test: any) => {
          report.results.push({
            testId: test.title,
            testName: test.title,
            status: test.status as any,
            duration: test.duration || 0,
            error: test.error?.message,
            timestamp: new Date()
          });
        });
      });

      report.summary = `${report.passed}/${report.totalTests} tests passed`;

      return report;
    } catch (error) {
      logger.error('Error parsing test results', error);
      throw error;
    }
  }
}

export default new TestExecutor();
