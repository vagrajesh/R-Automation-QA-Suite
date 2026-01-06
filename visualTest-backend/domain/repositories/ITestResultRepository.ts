import { TestResult } from '../models/TestResult';

export interface ITestResultRepository {
  create(testResult: TestResult): Promise<TestResult>;
  findById(id: string): Promise<TestResult | null>;
  findByTestRunId(testRunId: string): Promise<TestResult[]>;
  findByBaselineId(baselineId: string): Promise<TestResult[]>;
  update(id: string, testResult: Partial<TestResult>): Promise<TestResult | null>;
  findByProjectId(projectId: string): Promise<TestResult[]>;
}