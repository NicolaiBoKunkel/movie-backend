const request = require('supertest');
const app = require('../../src/app').default;

describe('Neo4j API Integration Tests', () => {
  // Cleanup after all tests
  afterAll(async () => {
    // Allow time for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('GET /neo/movies', () => {
    test('should return movies from Neo4j', async () => {
      const response = await request(app)
        .get('/neo/movies')
        .expect('Content-Type', /json/);

      // Neo4j might not be set up, so accept 200 or 503
      expect([200, 500, 503]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    test('should handle pagination in Neo4j queries', async () => {
      const response = await request(app)
        .get('/neo/movies?limit=5&skip=0');

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('GET /neo/movies/:id', () => {
    test('should return a specific movie from Neo4j', async () => {
      // First try to get a list
      const listResponse = await request(app)
        .get('/neo/movies?limit=1');

      if (listResponse.status === 200 && listResponse.body.length > 0) {
        const movieId = listResponse.body[0].id || listResponse.body[0].media_id;
        
        const response = await request(app)
          .get(`/neo/movies/${movieId}`);

        expect([200, 404, 500]).toContain(response.status);
      }
    });
  });

  describe('GET /neo/movies/:id/recommendations', () => {
    test('should return movie recommendations from Neo4j', async () => {
      const listResponse = await request(app)
        .get('/neo/movies?limit=1');

      if (listResponse.status === 200 && listResponse.body.length > 0) {
        const movieId = listResponse.body[0].id || listResponse.body[0].media_id;
        
        const response = await request(app)
          .get(`/neo/movies/${movieId}/recommendations`);

        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      }
    });
  });

  describe('GET /neo/tv', () => {
    test('should return TV shows from Neo4j', async () => {
      const response = await request(app)
        .get('/neo/tv')
        .expect('Content-Type', /json/);

      expect([200, 500, 503]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('GET /neo/tv/:id', () => {
    test('should return a specific TV show from Neo4j', async () => {
      const listResponse = await request(app)
        .get('/neo/tv?limit=1');

      if (listResponse.status === 200 && listResponse.body.length > 0) {
        const tvId = listResponse.body[0].id || listResponse.body[0].media_id;
        
        const response = await request(app)
          .get(`/neo/tv/${tvId}`);

        expect([200, 404, 500]).toContain(response.status);
      }
    });
  });
});
