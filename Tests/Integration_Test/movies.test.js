const request = require('supertest');
const app = require('../../src/app').default;

describe('Movies API Integration Tests', () => {
  describe('GET /movies', () => {
    test('should return a list of movies', async () => {
      const response = await request(app)
        .get('/movies')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return movies with pagination', async () => {
      const response = await request(app)
        .get('/movies?limit=5&offset=0')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    test('should search movies by title', async () => {
      const response = await request(app)
        .get('/movies?search=Matrix')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('media_id');
        expect(response.body[0]).toHaveProperty('original_title');
      }
    });

    test('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/movies?limit=1000')
        .expect(200);

      // Should cap at max limit (100)
      expect(response.body.length).toBeLessThanOrEqual(100);
    });

    test('should handle empty search results', async () => {
      const response = await request(app)
        .get('/movies?search=xyznonexistentmovie12345')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /movies/:id', () => {
    test('should return a specific movie by ID', async () => {
      // First, get a movie ID from the list
      const listResponse = await request(app)
        .get('/movies?limit=1')
        .expect(200);

      if (listResponse.body.length > 0) {
        const movieId = listResponse.body[0].media_id;
        
        const response = await request(app)
          .get(`/movies/${movieId}`)
          .expect(200);

        expect(response.body).toHaveProperty('media_id', movieId);
        expect(response.body).toHaveProperty('original_title');
      }
    });

    test('should return 404 for non-existent movie', async () => {
      const response = await request(app)
        .get('/movies/999999999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for invalid movie ID format', async () => {
      await request(app)
        .get('/movies/invalid')
        .expect(400);
    });
  });

  // Note: Cast and crew endpoints are not implemented in the current routes
  // These would need to be added to src/routes/movies.ts
});
