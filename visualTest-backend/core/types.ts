export interface IProject {
  id: string;
  name: string;
  baseUrl: string;
  config: {
    diffThreshold: number;
    aiEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface IBaseline {
  id: string;
  projectId: string;
  name: string;
  image: string; // Base64 screenshot
  domSnapshot?: string; // JSON DOM structure
  metadata: {
    viewport: { width: number; height: number };
    url: string;
    timestamp: Date;
  };
  version: number;
  isActive: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestRun {
  id: string;
  projectId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  config: {
    url: string;
    viewport: { width: number; height: number };
    waitConditions?: string[];
  };
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: {
    screenshot: string;
    domSnapshot?: string;
    metadata: {
      url: string;
      viewport: { width: number; height: number };
      timestamp: Date;
      userAgent: string;
    };
  };
}

export interface ITestResult {
  id: string;
  testRunId: string;
  baselineId: string;
  status: 'PASSED' | 'FAILED' | 'UNRESOLVED';
  similarityScore: number;
  diffRegions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  screenshots: {
    current: string;
    diff?: string;
  };
  explanations?: string[];
  metadata: {
    executionTime: number;
    aiModel?: string;
    tokensUsed?: number;
  };
  createdAt: Date;
}