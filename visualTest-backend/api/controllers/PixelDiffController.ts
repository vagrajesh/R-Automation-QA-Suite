import { Request, Response, NextFunction } from 'express';
import { PixelDiffService } from '../../infrastructure/diff/PixelDiffService';
import { FileStorageService } from '../../infrastructure/storage/FileStorageService';
import { IBaselineRepository } from '../../domain/repositories/IBaselineRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { PlaywrightService } from '../../infrastructure/browser/PlaywrightService';
import { PixelDiffRequest } from '../dtos/pixelDtos';
import { NotFoundError } from '../../core/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export class PixelDiffController {
  constructor(
    private pixelDiffService: PixelDiffService,
    private baselineRepository: IBaselineRepository,
    private projectRepository: IProjectRepository,
    private fileStorageService: FileStorageService,
    private playwrightService: PlaywrightService
  ) {}

  async compare(req: Request, res: Response, next: NextFunction) {
    try {
      const data: PixelDiffRequest = req.body;
      const startTime = Date.now();
      
      // Verify project exists
      const project = await this.projectRepository.findById(data.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Get baseline
      const baseline = await this.baselineRepository.findById(data.baselineId);
      if (!baseline) {
        throw new NotFoundError('Baseline not found');
      }

      logger.info('Starting pixel-only diff comparison', {
        projectId: data.projectId,
        baselineId: data.baselineId,
        threshold: data.threshold,
        url: data.url
      });

      // Capture current screenshot if URL provided
      let currentImage = data.currentImage;
      if (data.url) {
        const result = await this.playwrightService.captureScreenshot(
          data.url,
          data.viewport || { width: 1920, height: 1080 },
          {
            waitTime: data.waitTime,
            fullPage: true
          }
        );
        currentImage = result.screenshot;
        logger.info('Screenshot captured for pixel comparison');
      }

      if (!currentImage) {
        return res.status(400).json({
          status: 'error',
          message: 'Either currentImage or url must be provided'
        });
      }

      // Run pixel diff only
      const pixelResult = await this.pixelDiffService.compareImages(
        baseline.image,
        currentImage,
        data.threshold
      );

      const processingTime = Date.now() - startTime;
      const testId = uuidv4();

      // Save images to filesystem (if enabled)
      const storedPaths = await this.fileStorageService.saveScreenshots({
        testId,
        projectId: data.projectId,
        baselineImage: baseline.image,
        currentImage: currentImage,
        diffImage: pixelResult.diffImage,
        timestamp: new Date(),
      });

      // Calculate similarity score
      const similarityScore = Math.max(0, 100 - pixelResult.mismatchPercentage);

      const result = {
        id: testId,
        method: 'pixel',
        isDifferent: pixelResult.isDifferent,
        similarityScore,
        confidence: pixelResult.isDifferent ? 95 : 98, // High confidence for pixel diff
        mismatchPercentage: pixelResult.mismatchPercentage,
        diffPixels: pixelResult.diffPixels,
        totalPixels: pixelResult.totalPixels,
        diffImage: pixelResult.diffImage,
        baseline: {
          id: baseline.id,
          name: baseline.name,
          version: baseline.version,
        },
        metadata: {
          processingTime,
          threshold: data.threshold,
          method: 'pixel-only',
          filePaths: storedPaths,
        },
      };

      logger.info('Pixel diff completed', {
        testId,
        isDifferent: result.isDifferent,
        similarityScore: result.similarityScore,
        processingTime,
        filesStored: Object.keys(storedPaths).length
      });

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async quickCompare(req: Request, res: Response, next: NextFunction) {
    try {
      const { baselineImage, currentImage, threshold = 0.1 } = req.body;
      
      if (!baselineImage || !currentImage) {
        return res.status(400).json({
          status: 'error',
          message: 'Both baselineImage and currentImage are required',
        });
      }

      logger.info('Starting quick pixel comparison');
      const startTime = Date.now();

      // Run pixel diff only
      const pixelResult = await this.pixelDiffService.compareImages(
        baselineImage,
        currentImage,
        threshold
      );

      const processingTime = Date.now() - startTime;
      const similarityScore = Math.max(0, 100 - pixelResult.mismatchPercentage);

      const result = {
        method: 'pixel',
        isDifferent: pixelResult.isDifferent,
        similarityScore,
        mismatchPercentage: pixelResult.mismatchPercentage,
        diffPixels: pixelResult.diffPixels,
        totalPixels: pixelResult.totalPixels,
        diffImage: pixelResult.diffImage,
        metadata: {
          processingTime,
          threshold,
          method: 'pixel-only-quick',
        },
      };

      logger.info('Quick pixel diff completed', {
        isDifferent: result.isDifferent,
        similarityScore: result.similarityScore,
        processingTime
      });

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}