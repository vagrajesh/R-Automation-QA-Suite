import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../../domain/models/Project';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { CreateProjectRequest, UpdateProjectRequest } from '../dtos';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';

export class ProjectController {
  constructor(private projectRepository: IProjectRepository) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateProjectRequest = req.body;
      
      const existing = await this.projectRepository.findByName(data.name);
      if (existing) {
        throw new ValidationError('Project with this name already exists');
      }

      const project = Project.create({
        id: uuidv4(),
        name: data.name,
        baseUrl: data.baseUrl,
        diffThreshold: data.diffThreshold,
        aiEnabled: data.aiEnabled,
      });

      const created = await this.projectRepository.create(project);
      
      logger.info('Project created:', { projectId: created.id, name: created.name });
      
      res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await this.projectRepository.findAll();
      
      res.json({
        status: 'success',
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const project = await this.projectRepository.findById(id);
      
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      res.json({
        status: 'success',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data: UpdateProjectRequest = req.body;
      
      const updated = await this.projectRepository.update(id, data);
      
      if (!updated) {
        throw new NotFoundError('Project not found');
      }

      logger.info('Project updated:', { projectId: id });
      
      res.json({
        status: 'success',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await this.projectRepository.delete(id);
      
      if (!deleted) {
        throw new NotFoundError('Project not found');
      }

      logger.info('Project deleted:', { projectId: id });
      
      res.json({
        status: 'success',
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}