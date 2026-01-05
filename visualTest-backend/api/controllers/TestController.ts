import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TestRun } from '../../domain/models/TestRun';
import { ITestRunRepository } from '../../domain/repositories/ITestRunRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { ConcurrentExecutionManager } from '../../application/execution/ConcurrentExecutionManager';
import { RunTestRequest } from '../dtos/testDtos';
import { NotFoundError } from '../../core/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';

export class TestController {
  constructor(
    private testRunRepository: ITestRunRepository,
    private projectRepository: IProjectRepository,
    private executionManager: ConcurrentExecutionManager
  ) {}

  async runTest(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RunTestRequest = req.body;
      
      // Verify project exists
      const project = await this.projectRepository.findById(data.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Create test run
      const testRun = TestRun.create({
        id: uuidv4(),
        projectId: data.projectId,
        url: data.url,
        viewport: data.viewport,
        priority: data.priority,
      });

      // Save to database
      await this.testRunRepository.create(testRun);

      // Queue for execution (don't await - return immediately)
      this.executionManager.enqueue(testRun).catch(error => {
        logger.error(`Test execution failed: ${testRun.id}`, error);
      });

      logger.info('Test queued:', { testId: testRun.id, projectId: data.projectId });

      res.status(202).json({
        status: 'success',
        data: {
          testId: testRun.id,
          status: testRun.status,
          priority: testRun.priority,
          queuePosition: this.getQueuePosition(testRun),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTestStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const testRun = await this.testRunRepository.findById(id);
      
      if (!testRun) {
        throw new NotFoundError('Test not found');
      }

      res.json({
        status: 'success',
        data: {
          id: testRun.id,
          projectId: testRun.projectId,
          status: testRun.status,
          priority: testRun.priority,
          config: testRun.config,
          retryCount: testRun.retryCount,
          maxRetries: testRun.maxRetries,
          createdAt: testRun.createdAt,
          startedAt: testRun.startedAt,
          completedAt: testRun.completedAt,
          result: testRun.result ? {
            metadata: testRun.result.metadata,
            testResult: testRun.result.testResult ? {
              ...testRun.result.testResult,
              screenshots: undefined
            } : undefined,
            diffResult: testRun.result.diffResult ? {
              isDifferent: testRun.result.diffResult.isDifferent,
              confidence: testRun.result.diffResult.confidence,
              method: testRun.result.diffResult.method,
              pixelAnalysis: testRun.result.diffResult.pixelAnalysis,
              aiAnalysis: testRun.result.diffResult.aiAnalysis,
              changes: testRun.result.diffResult.changes,
              explanation: testRun.result.diffResult.explanation,
              aiExplanation: testRun.result.diffResult.aiExplanation,
              metadata: testRun.result.diffResult.metadata
            } : undefined
          } : undefined,
          testResult: (testRun as any).testResult,
          diffResult: (testRun as any).diffResult ? {
            isDifferent: (testRun as any).diffResult.isDifferent,
            confidence: (testRun as any).diffResult.confidence,
            method: (testRun as any).diffResult.method,
            pixelAnalysis: (testRun as any).diffResult.pixelAnalysis,
            aiAnalysis: (testRun as any).diffResult.aiAnalysis,
            changes: (testRun as any).diffResult.changes,
            explanation: (testRun as any).diffResult.explanation,
            aiExplanation: (testRun as any).diffResult.aiExplanation,
            metadata: (testRun as any).diffResult.metadata
          } : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueueStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const queueStatus = this.executionManager.getQueueStatus();
      
      res.json({
        status: 'success',
        data: queueStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  private getQueuePosition(testRun: TestRun): number {
    // Simplified queue position calculation
    const queueStatus = this.executionManager.getQueueStatus();
    return queueStatus.queued[testRun.priority] + 1;
  }
}