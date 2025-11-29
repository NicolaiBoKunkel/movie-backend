const request = require('supertest');
const app = require('../../src/app').default;

describe('Health Check Integration Tests', () => {
  describe('GET /health', () => {
    test('should return 200 status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should return health status object', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    test('should respond quickly (performance check)', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  // Note: /health/db endpoint doesn't exist in current implementation
  // The health check only returns { status: 'ok' }
});
