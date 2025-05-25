const request = require('supertest');
const app = require('../../src/app');

describe('Menu Optimization Routes Integration', () => {

  describe('Route Registration', () => {
    it('should have menu optimization routes registered', async () => {
      // Test that routes exist by checking they return proper status codes (not 404)
      const optimizationResponse = await request(app)
        .post('/api/insights/menu-optimization')
        .send({});

      const statusResponse = await request(app)
        .get('/api/insights/menu-optimization-status');

      // Should not be 404 (route not found)
      expect(optimizationResponse.status).not.toBe(404);
      expect(statusResponse.status).not.toBe(404);

      // Should be 401 (authentication required) which proves routes exist
      expect(optimizationResponse.status).toBe(401);
      expect(statusResponse.status).toBe(401);
    });

    it('should require authentication for menu optimization', async () => {
      const response = await request(app)
        .post('/api/insights/menu-optimization')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });

    it('should require authentication for status endpoint', async () => {
      const response = await request(app)
        .get('/api/insights/menu-optimization-status');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });
  });
});