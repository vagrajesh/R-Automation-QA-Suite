import { getDb } from '../rag/mongoClient.js';
import { TestCase, ExecutionResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Test Case Manager - Store and manage generated test cases
 */
export class TestCaseManager {
  private collectionName = 'test_cases';

  /**
   * Store generated test case
   */
  async storeTestCase(testCase: TestCase): Promise<string> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      const result = await collection.insertOne({
        ...testCase,
        createdAt: testCase.createdAt || new Date()
      });

      logger.debug(`Stored test case: ${testCase.name} (${result.insertedId})`);
      return result.insertedId.toString();
    } catch (error) {
      logger.error(`Error storing test case: ${testCase.name}`, error);
      throw error;
    }
  }

  /**
   * Store multiple test cases
   */
  async storeTestCases(testCases: TestCase[]): Promise<string[]> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      const casesWithDates = testCases.map(tc => ({
        ...tc,
        createdAt: tc.createdAt || new Date()
      }));

      const result = await collection.insertMany(casesWithDates);
      logger.info(`Stored ${testCases.length} test cases`);
      
      return Object.values(result.insertedIds).map(id => id.toString());
    } catch (error) {
      logger.error('Error storing batch test cases', error);
      throw error;
    }
  }

  /**
   * Get test cases by endpoint
   */
  async getByEndpoint(endpoint: string): Promise<TestCase[]> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      return await collection
        .find({ endpoint })
        .toArray();
    } catch (error) {
      logger.error(`Error retrieving tests for endpoint: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get test cases by type
   */
  async getByTestType(testType: TestCase['testType']): Promise<TestCase[]> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      return await collection
        .find({ testType })
        .toArray();
    } catch (error) {
      logger.error(`Error retrieving tests of type: ${testType}`, error);
      throw error;
    }
  }

  /**
   * Get critical tests (high priority)
   */
  async getCriticalTests(): Promise<TestCase[]> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      return await collection
        .find({ priority: { $in: ['critical', 'high'] } })
        .toArray();
    } catch (error) {
      logger.error('Error retrieving critical tests', error);
      throw error;
    }
  }

  /**
   * Update test execution result
   */
  async updateExecutionResult(testId: string, result: ExecutionResult): Promise<void> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      await collection.updateOne(
        { _id: { $oid: testId } } as any,
        {
          $set: {
            lastRunAt: new Date(),
            lastRunResult: (result.status === 'passed' ? 'pass' : result.status === 'failed' ? 'fail' : 'skip') as any
          }
        }
      );

      logger.debug(`Updated execution result for test: ${testId}`);
    } catch (error) {
      logger.error(`Error updating test result: ${testId}`, error);
      throw error;
    }
  }

  /**
   * Get test statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      const total = await collection.countDocuments();
      
      const byType = await collection
        .aggregate([
          { $group: { _id: '$testType', count: { $sum: 1 } } }
        ])
        .toArray();

      const byPriority = await collection
        .aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
        .toArray();

      const byStatus = await collection
        .aggregate([
          { $group: { _id: '$lastRunResult', count: { $sum: 1 } } }
        ])
        .toArray();

      return {
        total,
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
        byPriority: Object.fromEntries(byPriority.map(p => [p._id, p.count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id || 'not-run', s.count]))
      };
    } catch (error) {
      logger.error('Error retrieving statistics', error);
      throw error;
    }
  }

  /**
   * Delete test case
   */
  async deleteTestCase(testId: string): Promise<void> {
    const db = getDb();
    const collection = db.collection<TestCase>(this.collectionName);

    try {
      await collection.deleteOne({ _id: { $oid: testId } } as any);
      logger.debug(`Deleted test case: ${testId}`);
    } catch (error) {
      logger.error(`Error deleting test case: ${testId}`, error);
      throw error;
    }
  }
}

export default new TestCaseManager();
