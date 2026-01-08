import { ITestRun } from '../../core/types';

export class TestRun implements ITestRun {
  constructor(
    public id: string,
    public projectId: string,
    public status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED',
    public priority: 'HIGH' | 'NORMAL' | 'LOW',
    public config: {
      url: string;
      viewport: { width: number; height: number };
      waitConditions?: string[];
      dynamicContent?: {
        disableAnimations?: boolean;
        blockAds?: boolean;
        scrollToTriggerLazyLoad?: boolean;
        multipleScreenshots?: boolean;
        stabilityCheck?: boolean;
        maskSelectors?: string[];
      };
    },
    public retryCount: number,
    public maxRetries: number,
    public createdAt: Date,
    public startedAt?: Date,
    public completedAt?: Date,
    public result?: {
      screenshot: string;
      domSnapshot?: string;
      metadata: {
        url: string;
        viewport: { width: number; height: number };
        timestamp: Date;
        userAgent: string;
      };
      testResult?: any;
      diffResult?: any;
    }
  ) {}

  static create(data: {
    id: string;
    projectId: string;
    url: string;
    viewport?: { width: number; height: number };
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
    maxRetries?: number;
  }): TestRun {
    const now = new Date();
    return new TestRun(
      data.id,
      data.projectId,
      'QUEUED',
      data.priority ?? 'NORMAL',
      {
        url: data.url,
        viewport: data.viewport ?? { width: 1920, height: 1080 },
      },
      0,
      data.maxRetries ?? 1,
      now
    );
  }

  start(): void {
    this.status = 'RUNNING';
    this.startedAt = new Date();
  }

  complete(): void {
    this.status = 'COMPLETED';
    this.completedAt = new Date();
  }

  fail(): void {
    this.status = 'FAILED';
    this.completedAt = new Date();
  }

  retry(): boolean {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.status = 'QUEUED';
      this.startedAt = undefined;
      this.completedAt = undefined;
      return true;
    }
    return false;
  }
}