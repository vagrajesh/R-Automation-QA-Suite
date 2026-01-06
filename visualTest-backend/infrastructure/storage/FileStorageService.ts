import fs from 'fs/promises';
import path from 'path';
import { appConfig } from '../../core/config';
import { logger } from '../logging/logger';

export interface StoredImagePaths {
  baseline?: string;
  current?: string;
  diff?: string;
}

export class FileStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(appConfig.storage.screenshotsDir);
  }

  async initialize(): Promise<void> {
    if (!appConfig.storage.saveToFilesystem) {
      return;
    }

    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'baselines'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'current'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'diffs'), { recursive: true });
      
      logger.info(`File storage initialized: ${this.baseDir}`);
    } catch (error) {
      logger.error('Failed to initialize file storage:', error);
    }
  }

  async saveScreenshots(data: {
    testId: string;
    projectId: string;
    baselineImage?: string;
    currentImage?: string;
    diffImage?: string;
    timestamp?: Date;
  }): Promise<StoredImagePaths> {
    if (!appConfig.storage.saveToFilesystem) {
      return {};
    }

    const timestamp = data.timestamp || new Date();
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = timestamp.toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]; // HH-MM-SS
    
    const paths: StoredImagePaths = {};

    try {
      // Save baseline image
      if (data.baselineImage) {
        const baselinePath = path.join(this.baseDir, 'baselines', `${data.projectId}_${data.testId}_${dateStr}_${timeStr}_baseline.png`);
        await this.saveBase64Image(data.baselineImage, baselinePath);
        paths.baseline = baselinePath;
      }

      // Save current screenshot
      if (data.currentImage) {
        const currentPath = path.join(this.baseDir, 'current', `${data.projectId}_${data.testId}_${dateStr}_${timeStr}_current.png`);
        await this.saveBase64Image(data.currentImage, currentPath);
        paths.current = currentPath;
      }

      // Save diff image
      if (data.diffImage) {
        const diffPath = path.join(this.baseDir, 'diffs', `${data.projectId}_${data.testId}_${dateStr}_${timeStr}_diff.png`);
        await this.saveBase64Image(data.diffImage, diffPath);
        paths.diff = diffPath;
      }

      logger.info('Screenshots saved to filesystem', {
        testId: data.testId,
        paths: Object.keys(paths)
      });

      return paths;
    } catch (error) {
      logger.error('Failed to save screenshots to filesystem:', error);
      return {};
    }
  }

  async saveBaseline(data: {
    baselineId: string;
    projectId: string;
    name: string;
    image: string;
    version: number;
  }): Promise<string | undefined> {
    if (!appConfig.storage.saveToFilesystem) {
      return undefined;
    }

    try {
      const filename = `${data.projectId}_${data.name}_v${data.version}_${data.baselineId}.png`;
      const baselinePath = path.join(this.baseDir, 'baselines', filename);
      
      await this.saveBase64Image(data.image, baselinePath);
      
      logger.info('Baseline saved to filesystem', {
        baselineId: data.baselineId,
        path: baselinePath
      });

      return baselinePath;
    } catch (error) {
      logger.error('Failed to save baseline to filesystem:', error);
      return undefined;
    }
  }

  private async saveBase64Image(base64Image: string, filePath: string): Promise<void> {
    if (!base64Image || base64Image.trim() === '') {
      throw new Error('Empty base64 image data');
    }

    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    if (base64Data.length === 0) {
      throw new Error('No base64 data after prefix removal');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length === 0) {
      throw new Error('Empty buffer from base64 conversion');
    }
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    logger.info(`Image saved: ${filePath} (${buffer.length} bytes)`);
  }

  async cleanupOldFiles(daysOld: number = 7): Promise<void> {
    if (!appConfig.storage.saveToFilesystem) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const directories = ['baselines', 'current', 'diffs'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.baseDir, dir);
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            logger.info(`Cleaned up old file: ${filePath}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }
  }

  getStorageInfo(): { enabled: boolean; baseDir: string; } {
    return {
      enabled: appConfig.storage.saveToFilesystem,
      baseDir: this.baseDir,
    };
  }
}