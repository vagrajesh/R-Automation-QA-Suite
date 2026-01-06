import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../../infrastructure/logging/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info('Request received:', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
  });
  next();
};

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder for future auth implementation
  next();
};