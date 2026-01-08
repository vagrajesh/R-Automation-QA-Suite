import { Collection } from 'mongodb';
import { TestResult } from '../../domain/models/TestResult';
import { ITestResultRepository } from '../../domain/repositories/ITestResultRepository';
import { getDb } from './mongoClient';

export class MongoTestResultRepository implements ITestResultRepository {
  private get collection(): Collection {
    return getDb().collection('test_results');
  }

  async create(testResult: TestResult): Promise<TestResult> {
    // Remove large images from database to prevent BSON overflow
    const cleanResult = { ...testResult };
    if (cleanResult.screenshots) {
      delete cleanResult.screenshots;
    }
    
    await this.collection.insertOne(cleanResult);
    return testResult;
  }

  async findById(id: string): Promise<TestResult | null> {
    const doc = await this.collection.findOne({ id });
    return doc ? this.toTestResult(doc) : null;
  }

  async findByTestRunId(testRunId: string): Promise<TestResult[]> {
    const docs = await this.collection
      .find({ testRunId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(doc => this.toTestResult(doc));
  }

  async findByBaselineId(baselineId: string): Promise<TestResult[]> {
    const docs = await this.collection
      .find({ baselineId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(doc => this.toTestResult(doc));
  }

  async update(id: string, updates: Partial<TestResult>): Promise<TestResult | null> {
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result ? this.toTestResult(result) : null;
  }

  async findByProjectId(projectId: string): Promise<TestResult[]> {
    // Join with test_runs to get projectId
    const docs = await this.collection.aggregate([
      {
        $lookup: {
          from: 'test_runs',
          localField: 'testRunId',
          foreignField: 'id',
          as: 'testRun'
        }
      },
      {
        $match: {
          'testRun.projectId': projectId
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    return docs.map(doc => this.toTestResult(doc));
  }

  private toTestResult(doc: any): TestResult {
    return new TestResult(
      doc.id,
      doc.testRunId,
      doc.baselineId,
      doc.status,
      doc.similarityScore,
      doc.createdAt,
      doc.screenshots,
      doc.diffRegions,
      doc.explanations,
      doc.metadata,
      doc.aiExplanation
    );
  }
}