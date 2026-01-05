import { TestRun } from '../models/TestRun';

export interface ITestRunRepository {
  create(testRun: TestRun): Promise<TestRun>;
  findById(id: string): Promise<TestRun | null>;
  findByProjectId(projectId: string): Promise<TestRun[]>;
  update(id: string, testRun: Partial<TestRun>): Promise<TestRun | null>;
  findByStatus(status: string): Promise<TestRun[]>;
}