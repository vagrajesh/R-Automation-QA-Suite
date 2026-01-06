/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../../core/app';

const app = createApp();

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Root endpoint', () => {
    it('should return API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Visual Testing Backend API');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });
});