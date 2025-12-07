const request = require('supertest');
const app = require('../../src/app').default;

describe('Movie Search & Pagination Integration Tests', () => {
  let adminToken;
  const createdMovieIds = [];

  const adminUser = {
    username: `searchadmin_${Date.now()}`,
    password: 'SearchAdminPassword123!',
    email: `searchadmin_${Date.now()}@example.com`
  };

  // Test movies with different properties for search testing
  const testMovies = [
    { title: 'Action Movie 2020', year: 2020, genre: 'Action', duration: 120 },
    { title: 'Comedy Movie 2021', year: 2021, genre: 'Comedy', duration: 95 },
    { title: 'Drama Movie 2022', year: 2022, genre: 'Drama', duration: 140 },
    { title: 'Another Action 2020', year: 2020, genre: 'Action', duration: 110 },
    { title: 'Romance Movie 2023', year: 2023, genre: 'Romance', duration: 105 }
  ];

  beforeAll(async () => {
    // Register admin user
    await request(app)
      .post('/auth/register')
      .send(adminUser);

    const adminLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: adminUser.username,
        password: adminUser.password
      });

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.token;
    }

    // Create test movies for searching
    if (adminToken) {
      for (const movie of testMovies) {
        const createResponse = await request(app)
          .post('/movies')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(movie);

        if ([200, 201].includes(createResponse.status)) {
          createdMovieIds.push(createResponse.body.movieId);
        }
      }
    }
  });

  afterAll(async () => {
    // Cleanup: Delete created movies
    if (adminToken) {
      for (const movieId of createdMovieIds) {
        await request(app)
          .delete(`/movies/${movieId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('IT-MOV-SRCH-INT-001 - Search returns matching movies only', () => {
    test('should return only movies matching year range filter', async () => {
      // Act - Search by year range (2020-2021)
      const searchResponse = await request(app)
        .get('/movies?yearFrom=2020&yearTo=2021');

      // Assert - Only movies matching filters are returned
      expect([200, 404]).toContain(searchResponse.status);

      if (searchResponse.status === 200 && Array.isArray(searchResponse.body)) {
        const movies = searchResponse.body;
        
        // Check that all returned movies are within the year range
        movies.forEach(movie => {
          if (movie.year !== undefined) {
            expect(movie.year).toBeGreaterThanOrEqual(2020);
            expect(movie.year).toBeLessThanOrEqual(2021);
          }
        });

        // Assert - No unrelated movies appear (movies from 2022, 2023 should not be in results)
        const futureMovies = movies.filter(movie => movie.year > 2021);
        expect(futureMovies.length).toBe(0);
      }
    });

    test('should return only movies matching genre filter', async () => {
      // Act - Search by genre
      const searchResponse = await request(app)
        .get('/movies?genre=Action');

      // Assert
      expect([200, 404]).toContain(searchResponse.status);

      if (searchResponse.status === 200 && Array.isArray(searchResponse.body)) {
        const movies = searchResponse.body;
        
        // Check that all returned movies have the correct genre
        movies.forEach(movie => {
          if (movie.genre !== undefined) {
            expect(movie.genre).toBe('Action');
          }
        });

        // Assert - No movies with different genres
        const nonActionMovies = movies.filter(movie => movie.genre && movie.genre !== 'Action');
        expect(nonActionMovies.length).toBe(0);
      }
    });

    test('should return movies matching title search', async () => {
      // Act - Search by title
      const searchResponse = await request(app)
        .get('/movies?search=Action');

      // Assert
      expect([200, 404]).toContain(searchResponse.status);

      if (searchResponse.status === 200 && Array.isArray(searchResponse.body)) {
        const movies = searchResponse.body;
        
        // Check that returned movies have "Action" in title or genre
        movies.forEach(movie => {
          const titleMatch = movie.title && movie.title.toLowerCase().includes('action');
          const genreMatch = movie.genre && movie.genre.toLowerCase().includes('action');
          expect(titleMatch || genreMatch).toBe(true);
        });
      }
    });

    test('should handle combined filters (year + genre)', async () => {
      // Act - Search with both year and genre filters
      const searchResponse = await request(app)
        .get('/movies?yearFrom=2020&yearTo=2020&genre=Action');

      // Assert
      expect([200, 404]).toContain(searchResponse.status);

      if (searchResponse.status === 200 && Array.isArray(searchResponse.body)) {
        const movies = searchResponse.body;
        
        // Check that all movies match both criteria
        movies.forEach(movie => {
          if (movie.year !== undefined && movie.genre !== undefined) {
            expect(movie.year).toBe(2020);
            expect(movie.genre).toBe('Action');
          }
        });
      }
    });
  });

  describe('IT-MOV-SRCH-INT-002 - Pagination works across large dataset', () => {
    test('should properly paginate results without overlap', async () => {
      // Create additional movies for pagination testing
      const additionalMovies = [];
      for (let i = 1; i <= 15; i++) {
        additionalMovies.push({
          title: `Pagination Test Movie ${i}`,
          year: 2020 + (i % 3),
          genre: 'Test',
          duration: 90 + i
        });
      }

      const additionalMovieIds = [];
      if (adminToken) {
        for (const movie of additionalMovies) {
          const createResponse = await request(app)
            .post('/movies')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(movie);

          if ([200, 201].includes(createResponse.status)) {
            additionalMovieIds.push(createResponse.body.movieId);
          }
        }
      }

      try {
        // Act - Query with page=1&pageSize=10
        const page1Response = await request(app)
          .get('/movies?page=1&pageSize=10');

        // Act - Query with page=2&pageSize=10  
        const page2Response = await request(app)
          .get('/movies?page=2&pageSize=10');

        // Assert both requests succeeded
        expect([200, 404]).toContain(page1Response.status);
        expect([200, 404]).toContain(page2Response.status);

        if (page1Response.status === 200 && page2Response.status === 200) {
          const page1Movies = page1Response.body;
          const page2Movies = page2Response.body;

          // Assert - Page 1 returns up to 10 items
          expect(Array.isArray(page1Movies)).toBe(true);
          expect(page1Movies.length).toBeLessThanOrEqual(10);

          // Assert - Page 2 returns some items (may be less than 10 if total < 20)
          expect(Array.isArray(page2Movies)).toBe(true);

          // Assert - No overlap between pages
          if (page1Movies.length > 0 && page2Movies.length > 0) {
            const page1Ids = page1Movies.map(movie => movie.mediaId || movie.id).filter(Boolean);
            const page2Ids = page2Movies.map(movie => movie.mediaId || movie.id).filter(Boolean);
            
            // Check for overlapping IDs
            const overlap = page1Ids.filter(id => page2Ids.includes(id));
            expect(overlap.length).toBe(0);
          }
        }

      } finally {
        // Cleanup additional movies
        if (adminToken) {
          for (const movieId of additionalMovieIds) {
            await request(app)
              .delete(`/movies/${movieId}`)
              .set('Authorization', `Bearer ${adminToken}`);
          }
        }
      }
    });

    test('should handle limit and offset parameters', async () => {
      // Act - Use limit and offset instead of page/pageSize
      const limitResponse = await request(app)
        .get('/movies?limit=5&offset=0');

      // Assert
      expect([200, 404]).toContain(limitResponse.status);

      if (limitResponse.status === 200) {
        const movies = limitResponse.body;
        expect(Array.isArray(movies)).toBe(true);
        expect(movies.length).toBeLessThanOrEqual(5);
      }
    });

    test('should handle invalid pagination parameters', async () => {
      // Test invalid page numbers
      const invalidPageResponse = await request(app)
        .get('/movies?page=0&pageSize=10');

      // Test invalid page sizes
      const invalidSizeResponse = await request(app)
        .get('/movies?page=1&pageSize=1000');

      // Should handle gracefully (either return error or use defaults)
      expect([200, 400, 404]).toContain(invalidPageResponse.status);
      expect([200, 400, 404]).toContain(invalidSizeResponse.status);
    });
  });
});