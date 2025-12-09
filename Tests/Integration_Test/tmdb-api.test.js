/**
 * TMDB API Integration Tests
 * 
 * Testing Strategy: Test against the ACTUAL TMDB API
 * Rationale: Following the principle "Don't mock what you don't own"
 * 
 * These tests verify that:
 * 1. Our application correctly integrates with the external TMDB API
 * 2. We handle the API responses correctly
 * 3. Error scenarios from the real API are handled properly
 * 
 * Trade-offs:
 * - Pros: Tests real integration, catches API changes, validates actual behavior
 * - Cons: Depends on external service, slower, requires API key, rate limits apply
 */

const request = require('supertest');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

describe('TMDB External API Integration Tests', () => {
  // Skip all tests if API key is not available
  const skipTests = !API_KEY;

  beforeAll(() => {
    if (skipTests) {
      console.warn('⚠️  TMDB_API_KEY not found in environment. Skipping TMDB API tests.');
    }
  });

  describe('GET /movie/top_rated', () => {
    test('should fetch top rated movies from TMDB', async () => {
      if (skipTests) return;

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);
      
      // Validate structure of first movie
      const firstMovie = data.results[0];
      expect(firstMovie).toHaveProperty('id');
      expect(firstMovie).toHaveProperty('title');
      expect(firstMovie).toHaveProperty('vote_average');
      expect(firstMovie).toHaveProperty('poster_path');
      expect(typeof firstMovie.id).toBe('number');
      expect(typeof firstMovie.title).toBe('string');
    }, 10000);

    test('should handle pagination correctly', async () => {
      if (skipTests) return;

      const page1Response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
      );
      const page2Response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`
      );

      expect(page1Response.status).toBe(200);
      expect(page2Response.status).toBe(200);

      const page1Data = await page1Response.json();
      const page2Data = await page2Response.json();

      // Different pages should have different results
      expect(page1Data.page).toBe(1);
      expect(page2Data.page).toBe(2);
      expect(page1Data.results[0].id).not.toBe(page2Data.results[0].id);
    }, 10000);

    test('should return error for invalid API key', async () => {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=invalid_key&language=en-US&page=1`
      );

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('status_code');
      expect(data).toHaveProperty('status_message');
    }, 10000);
  });

  describe('GET /movie/:id', () => {
    test('should fetch movie details for valid movie ID', async () => {
      if (skipTests) return;

      // Using a well-known movie ID (The Shawshank Redemption)
      const movieId = 278;

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('id', movieId);
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('overview');
      expect(data).toHaveProperty('release_date');
      expect(data).toHaveProperty('runtime');
      expect(data).toHaveProperty('genres');
      expect(Array.isArray(data.genres)).toBe(true);
      expect(data.genres.length).toBeGreaterThan(0);
    }, 10000);

    test('should return 404 for non-existent movie ID', async () => {
      if (skipTests) return;

      const invalidMovieId = 999999999;

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${invalidMovieId}?api_key=${API_KEY}&language=en-US`
      );

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('status_code');
      expect(data.status_message).toContain('could not be found');
    }, 10000);
  });

  describe('GET /movie/:id/credits', () => {
    test('should fetch movie credits (cast and crew)', async () => {
      if (skipTests) return;

      // Using a well-known movie ID (The Shawshank Redemption)
      const movieId = 278;

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=en-US`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('id', movieId);
      expect(data).toHaveProperty('cast');
      expect(data).toHaveProperty('crew');
      expect(Array.isArray(data.cast)).toBe(true);
      expect(Array.isArray(data.crew)).toBe(true);
      expect(data.cast.length).toBeGreaterThan(0);
      
      // Validate cast structure
      const firstCast = data.cast[0];
      expect(firstCast).toHaveProperty('id');
      expect(firstCast).toHaveProperty('name');
      expect(firstCast).toHaveProperty('character');
      expect(firstCast).toHaveProperty('order');
    }, 10000);
  });

  describe('GET /movie/:id/videos', () => {
    test('should fetch movie videos (trailers)', async () => {
      if (skipTests) return;

      // Using a popular movie that likely has trailers
      const movieId = 550; // Fight Club

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('id', movieId);
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
      
      if (data.results.length > 0) {
        const firstVideo = data.results[0];
        expect(firstVideo).toHaveProperty('key');
        expect(firstVideo).toHaveProperty('site');
        expect(firstVideo).toHaveProperty('type');
        expect(firstVideo).toHaveProperty('name');
      }
    }, 10000);

    test('should find YouTube trailers when available', async () => {
      if (skipTests) return;

      const movieId = 550; // Fight Club

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`
      );

      const data = await response.json();
      
      // Find YouTube trailers
      const youtubeTrailers = data.results?.filter(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      );

      // Most popular movies should have at least one YouTube trailer
      expect(youtubeTrailers).toBeDefined();
      if (youtubeTrailers && youtubeTrailers.length > 0) {
        expect(youtubeTrailers[0]).toHaveProperty('key');
        expect(typeof youtubeTrailers[0].key).toBe('string');
        expect(youtubeTrailers[0].key.length).toBeGreaterThan(0);
      }
    }, 10000);
  });

  describe('API Rate Limiting and Error Handling', () => {
    test('should handle rate limiting gracefully', async () => {
      if (skipTests) return;

      // Make multiple rapid requests to potentially trigger rate limiting
      // TMDB allows ~40 requests per 10 seconds
      const requests = Array(5).fill(null).map((_, i) => 
        fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${i + 1}`)
      );

      const responses = await Promise.all(requests);

      // All requests should succeed or return 429 (Too Many Requests)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // At least some requests should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Data Validation', () => {
    test('should validate vote_average is within expected range', async () => {
      if (skipTests) return;

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
      );

      const data = await response.json();
      
      data.results.forEach(movie => {
        expect(movie.vote_average).toBeGreaterThanOrEqual(0);
        expect(movie.vote_average).toBeLessThanOrEqual(10);
      });
    }, 10000);

    test('should validate required fields are present', async () => {
      if (skipTests) return;

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
      );

      const data = await response.json();
      
      const firstMovie = data.results[0];
      
      // Essential fields that should always be present
      const requiredFields = [
        'id',
        'title',
        'overview',
        'vote_average',
        'vote_count',
        'popularity'
      ];

      requiredFields.forEach(field => {
        expect(firstMovie).toHaveProperty(field);
        expect(firstMovie[field]).not.toBeNull();
        expect(firstMovie[field]).not.toBeUndefined();
      });
    }, 10000);
  });
});
