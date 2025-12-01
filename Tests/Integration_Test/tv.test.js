const request = require('supertest');
const app = require('../../src/app').default;

describe('TV Shows API Integration Tests', () => {
  describe('GET /tv', () => {
    test('should return a list of TV shows', async () => {
      const response = await request(app)
        .get('/tv')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return TV shows with pagination', async () => {
      const response = await request(app)
        .get('/tv?limit=5&offset=0')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    test('should search TV shows by title', async () => {
      const response = await request(app)
        .get('/tv?search=Friends')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/tv?limit=1000')
        .expect(200);

      // Should cap at max limit
      expect(response.body.length).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /tv/:id', () => {
    test('should return a specific TV show by ID', async () => {
      // First, get a TV show ID from the list
      const listResponse = await request(app)
        .get('/tv?limit=1')
        .expect(200);

      if (listResponse.body.length > 0) {
        const tvId = listResponse.body[0].mediaId;
        
        const response = await request(app)
          .get(`/tv/${tvId}`)
          .expect(200);

        expect(response.body).toHaveProperty('mediaId', tvId);
        expect(response.body).toHaveProperty('originalTitle');
      }
    });

    test('should return 404 for non-existent TV show', async () => {
      const response = await request(app)
        .get('/tv/999999999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  // Note: Seasons and cast endpoints are not implemented in the current routes
  // These would need to be added to src/routes/tv.ts
});
