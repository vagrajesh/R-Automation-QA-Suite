import { Request, Response } from 'express';
import { getDb } from '../../infrastructure/persistence/mongoClient';

export class HealthController {
  async check(req: Request, res: Response) {
    let dbStatus = 'disconnected';
    
    try {
      const db = getDb();
      await db.admin().ping();
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };

    res.json(health);
  }
}