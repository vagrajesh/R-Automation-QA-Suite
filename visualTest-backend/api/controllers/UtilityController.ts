import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/logging/logger';
import path from 'path';
import fs from 'fs';

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

  async getScreenshot(req: Request, res: Response, next: NextFunction) {
    try {
      // Add CORS headers for image serving
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      
      const { type, filename } = req.params;
      const screenshotsDir = path.join(__dirname, '../../screenshots');
      const dirPath = path.join(screenshotsDir, type);
      
      if (!fs.existsSync(dirPath)) {
        return res.status(404).json({ status: 'error', message: 'Directory not found' });
      }
      
      const files = fs.readdirSync(dirPath);
      
      // Extract projectId and testId from filename
      const parts = filename.replace('.png', '').split('_');
      if (parts.length >= 2) {
        const projectId = parts[0];
        const testId = parts[1];
        
        // Find any file that contains both IDs and is a diff
        const matchingFile = files.find(f => 
          f.includes(projectId) && 
          f.includes(testId) && 
          f.includes('_diff.png')
        );
        
        if (matchingFile) {
          return res.sendFile(path.join(dirPath, matchingFile));
        }
      }
      
      return res.status(404).json({
        status: 'error',
        message: 'Screenshot not found',
        availableFiles: files.slice(0, 5) // Show first 5 files for debugging
      });
    } catch (error) {
      next(error);
    }
  }
}