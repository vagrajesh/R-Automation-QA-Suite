import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/logging/logger';

export class UtilityController {
  async convertImageToBase64(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No image file provided'
        });
      }

      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      logger.info('Image converted to base64', {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      res.json({
        status: 'success',
        data: {
          base64Image,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      next(error);
    }
  }
}