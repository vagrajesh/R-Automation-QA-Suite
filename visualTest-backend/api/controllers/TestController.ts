import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TestRun } from '../../domain/models/TestRun';
import { ITestRunRepository } from '../../domain/repositories/ITestRunRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { IBaselineRepository } from '../../domain/repositories/IBaselineRepository';
import { ConcurrentExecutionManager } from '../../application/execution/ConcurrentExecutionManager';
import { RunTestRequest } from '../dtos/testDtos';
import { NotFoundError } from '../../core/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';

export class TestController {
  constructor(
    private testRunRepository: ITestRunRepository,
    private projectRepository: IProjectRepository,
    private baselineRepository: IBaselineRepository,
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

      // Verify baseline exists if provided
      if (data.baselineId) {
        const baseline = await this.baselineRepository.findById(data.baselineId);
        if (!baseline) {
          throw new NotFoundError('Baseline not found');
        }
      }

      // Create test run
      const testRun = TestRun.create({
        id: uuidv4(),
        projectId: data.projectId,
        url: data.url,
        viewport: data.viewport,
        priority: data.priority,
      });

      // Add baselineId to config if provided
      if (data.baselineId) {
        (testRun.config as any).baselineId = data.baselineId;
      }

      // Save to database
      await this.testRunRepository.create(testRun);

      // Queue for execution (don't await - return immediately)
      this.executionManager.enqueue(testRun).catch(error => {
        logger.error(`Test execution failed: ${testRun.id}`, error);
      });

      logger.info('Test queued:', { testId: testRun.id, projectId: data.projectId, baselineId: data.baselineId });

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

      // Extract diffResult from nested result or direct property
      const diffResult = (testRun as any).diffResult || 
                        (testRun.result && (testRun.result as any).diffResult);

      const responseData = {
        ...testRun,
        diffResult: diffResult
      };

      res.json({
        status: 'success',
        data: responseData,
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