import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Baseline } from '../../domain/models/Baseline';
import { IBaselineRepository } from '../../domain/repositories/IBaselineRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { FileStorageService } from '../../infrastructure/storage/FileStorageService';
import { CreateBaselineRequest } from '../dtos';
import { CreateBaselineDto } from '../dtos';
import { NotFoundError } from '../../core/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';

export class BaselineController {
  constructor(
    private baselineRepository: IBaselineRepository,
    private projectRepository: IProjectRepository,
    private fileStorageService: FileStorageService
  ) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      let imageBase64: string;
      
      // Handle file upload or base64 string
      if (req.file) {
        imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.body.image) {
        imageBase64 = req.body.image;
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'Either upload an image file or provide base64 image string'
        });
      }

      const data = {
        projectId: req.body.projectId,
        name: req.body.name,
        image: imageBase64,
        viewport: typeof req.body.viewport === 'string' ? JSON.parse(req.body.viewport) : req.body.viewport,
        url: req.body.url,
        domSnapshot: req.body.domSnapshot,
        tags: typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags,
      };

      // Validate the processed data
      const validatedData = CreateBaselineDto.parse(data);
      
      // Verify project exists
      const project = await this.projectRepository.findById(data.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Deactivate existing baseline with same name
      const existing = await this.baselineRepository.findActiveByProjectAndName(
        data.projectId, 
        data.name
      );
      
      let version = 1;
      if (existing) {
        existing.deactivate();
        await this.baselineRepository.update(existing.id, existing);
        version = existing.version + 1;
      }

      const baseline = Baseline.create({
        id: uuidv4(),
        projectId: validatedData.projectId,
        name: validatedData.name,
        image: validatedData.image,
        viewport: validatedData.viewport,
        url: validatedData.url,
        domSnapshot: validatedData.domSnapshot,
        tags: validatedData.tags,
      });
      
      baseline.version = version;
      const created = await this.baselineRepository.create(baseline);
      
      // Save baseline to filesystem (if enabled)
      const filePath = await this.fileStorageService.saveBaseline({
        baselineId: created.id,
        projectId: created.projectId,
        name: created.name,
        image: created.image,
        version: created.version,
      });
      
      logger.info('Baseline created:', { 
        baselineId: created.id, 
        projectId: data.projectId,
        name: created.name,
        version: created.version,
        savedToFile: !!filePath
      });
      
      res.status(201).json({
        status: 'success',
        data: {
          ...created,
          filePath: filePath || undefined, // Include file path in response
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getByProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const baselines = await this.baselineRepository.findByProjectId(projectId);
      
      res.json({
        status: 'success',
        data: baselines,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const baseline = await this.baselineRepository.findById(id);
      
      if (!baseline) {
        throw new NotFoundError('Baseline not found');
      }

      res.json({
        status: 'success',
        data: baseline,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await this.baselineRepository.delete(id);
      
      if (!deleted) {
        throw new NotFoundError('Baseline not found');
      }

      logger.info('Baseline deleted:', { baselineId: id });
      
      res.json({
        status: 'success',
        message: 'Baseline deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}