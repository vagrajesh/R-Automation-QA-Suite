import { TestRun } from '../../domain/models/TestRun';
import { ITestRunRepository } from '../../domain/repositories/ITestRunRepository';
import { logger } from '../../infrastructure/logging/logger';
import { appConfig } from '../../core/config';

interface QueuedJob {
  testRun: TestRun;
  resolve: (result: TestRun) => void;
  reject: (error: Error) => void;
}

export class ConcurrentExecutionManager {
  private queues: {
    HIGH: QueuedJob[];
    NORMAL: QueuedJob[];
    LOW: QueuedJob[];
  };
  private running: Set<string> = new Set();
  private maxConcurrency: number;

  constructor(
    private testRunRepository: ITestRunRepository,
    private executeTest: (testRun: TestRun) => Promise<TestRun>
  ) {
    this.queues = { HIGH: [], NORMAL: [], LOW: [] };
    this.maxConcurrency = appConfig.app.queueConcurrency;
    this.startProcessing();
  }

  async enqueue(testRun: TestRun): Promise<TestRun> {
    return new Promise((resolve, reject) => {
      const job: QueuedJob = { testRun, resolve, reject };
      this.queues[testRun.priority].push(job);
      logger.info(`Test queued: ${testRun.id} (${testRun.priority})`);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.running.size >= this.maxConcurrency) {
      return;
    }

    const job = this.getNextJob();
    if (!job) {
      return;
    }

    const { testRun, resolve, reject } = job;
    this.running.add(testRun.id);

    try {
      testRun.start();
      await this.testRunRepository.update(testRun.id, testRun);
      
      logger.info(`Test started: ${testRun.id}`);
      const result = await this.executeTest(testRun);
      
      result.complete();
      await this.testRunRepository.update(result.id, result);
      
      logger.info(`Test completed: ${result.id}`, {
        hasResult: !!(result as any).result,
        hasTestResult: !!(result as any).testResult,
        hasDiffResult: !!(result as any).diffResult
      });
      resolve(result);
    } catch (error) {
      logger.error(`Test failed: ${testRun.id}`, error);
      
      if (testRun.retry()) {
        logger.info(`Retrying test: ${testRun.id} (attempt ${testRun.retryCount})`);
        await this.testRunRepository.update(testRun.id, testRun);
        this.queues[testRun.priority].unshift(job);
      } else {
        testRun.fail();
        await this.testRunRepository.update(testRun.id, testRun);
        reject(error as Error);
      }
    } finally {
      this.running.delete(testRun.id);
      this.processNext();
    }
  }

  private getNextJob(): QueuedJob | null {
    if (this.queues.HIGH.length > 0) {
      return this.queues.HIGH.shift()!;
    }
    if (this.queues.NORMAL.length > 0) {
      return this.queues.NORMAL.shift()!;
    }
    if (this.queues.LOW.length > 0) {
      return this.queues.LOW.shift()!;
    }
    return null;
  }

  private startProcessing(): void {
    setInterval(() => {
      this.processNext();
    }, 1000);
  }

  getQueueStatus() {
    return {
      queued: {
        HIGH: this.queues.HIGH.length,
        NORMAL: this.queues.NORMAL.length,
        LOW: this.queues.LOW.length,
      },
      running: this.running.size,
      maxConcurrency: this.maxConcurrency,
    };
  }
}