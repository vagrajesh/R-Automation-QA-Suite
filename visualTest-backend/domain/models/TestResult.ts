import { ITestResult } from '../../core/types';
import { appConfig } from '../../core/config';

export class TestResult implements ITestResult {
  constructor(
    public id: string,
    public testRunId: string,
    public baselineId: string,
    public status: 'PASSED' | 'FAILED' | 'UNRESOLVED',
    public similarityScore: number,
    public createdAt: Date,
    public diffRegions?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
    public screenshots?: {
      current: string;
      diff?: string;
    },
    public explanations?: string[],
    public aiExplanation?: any,
    public metadata?: {
      executionTime: number;
      aiModel?: string;
      tokensUsed?: number;
    }
  ) {}

  static create(data: {
    id: string;
    testRunId: string;
    baselineId: string;
    similarityScore: number;
    isDifferent?: boolean;
    diffRegions?: Array<{ x: number; y: number; width: number; height: number }>;
    screenshots?: { current: string; diff?: string };
    explanations?: string[];
    aiExplanation?: any;
    metadata?: { executionTime: number; aiModel?: string; tokensUsed?: number };
  }): TestResult {
    const status = data.isDifferent !== undefined 
      ? (data.isDifferent ? 'FAILED' : 'PASSED')
      : (data.similarityScore >= appConfig.app.defaultDiffThreshold ? 'PASSED' : 'FAILED');
    
    return new TestResult(
      data.id,
      data.testRunId,
      data.baselineId,
      status,
      data.similarityScore,
      new Date(),
      data.diffRegions,
      data.screenshots,
      data.explanations,
      data.aiExplanation,
      data.metadata
    );
  }

  markAsUnresolved(): void {
    this.status = 'UNRESOLVED';
  }

  updateStatus(threshold: number): void {
    this.status = this.similarityScore >= threshold ? 'PASSED' : 'FAILED';
  }
}