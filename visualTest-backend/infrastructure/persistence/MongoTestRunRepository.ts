import { Collection } from 'mongodb';
import { TestRun } from '../../domain/models/TestRun';
import { ITestRunRepository } from '../../domain/repositories/ITestRunRepository';
import { getDb } from './mongoClient';

export class MongoTestRunRepository implements ITestRunRepository {
  private get collection(): Collection {
    return getDb().collection('test_runs');
  }

  async create(testRun: TestRun): Promise<TestRun> {
    await this.collection.insertOne(testRun);
    return testRun;
  }

  async findById(id: string): Promise<TestRun | null> {
    const doc = await this.collection.findOne({ id });
    return doc ? this.toTestRun(doc) : null;
  }

  async findByProjectId(projectId: string): Promise<TestRun[]> {
    const docs = await this.collection
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(doc => this.toTestRun(doc));
  }

  async update(id: string, updates: Partial<TestRun>): Promise<TestRun | null> {
    // Create clean updates without large data but preserve diffResult structure
    const cleanUpdates = { ...updates };
    if (cleanUpdates.result) {
      delete cleanUpdates.result.screenshot;
      if (cleanUpdates.result.diffResult?.diffImage) {
        cleanUpdates.result.diffResult.diffImage = 'STORED_IN_FILESYSTEM';
      }
    }
    
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: cleanUpdates },
      { returnDocument: 'after' }
    );
    return result ? this.toTestRun(result) : null;
  }

  async findByStatus(status: string): Promise<TestRun[]> {
    const docs = await this.collection
      .find({ status })
      .sort({ createdAt: 1 })
      .toArray();
    return docs.map(doc => this.toTestRun(doc));
  }

  private toTestRun(doc: any): TestRun {
    return new TestRun(
      doc.id,
      doc.projectId,
      doc.status,
      doc.priority,
      doc.config,
      doc.retryCount,
      doc.maxRetries,
      doc.createdAt,
      doc.startedAt,
      doc.completedAt,
      doc.result
    );
  }
}