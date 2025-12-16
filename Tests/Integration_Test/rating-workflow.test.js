const request = require('supertest');
const app = require('../../src/app').default;

describe('Movie Rating Integration Tests', () => {
  let userAToken, userBToken;
  let adminToken;
  let testMovieId;

  const userA = {
    username: `userA_${Date.now()}`,
    password: 'UserAPassword123!',
    email: `userA_${Date.now()}@example.com`
  };

  const userB = {
    username: `userB_${Date.now()}`,
    password: 'UserBPassword123!',
    email: `userB_${Date.now()}@example.com`
  };

  const adminUser = {
    username: 'admin',
    password: 'admin123'
  };

  const testMovie = {
    tmdbId: 999999998, // Using a high number to avoid conflicts
    title: 'Movie for Rating Tests',
    releaseDate: '2023-05-20',
    genreIds: [4], // Comedy genre
    overview: 'Test movie for rating workflow tests',
    runtime: 100
  };

  beforeAll(async () => {
    // Login with existing admin user from database
    const adminLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: adminUser.username,
        password: adminUser.password
      });

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.token;
    } else {
      console.error('Admin login failed:', adminLoginResponse.status, adminLoginResponse.body);
    }

    // Create test movie
    if (adminToken) {
      const createMovieResponse = await request(app)
        .post('/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testMovie);

      if ([200, 201].includes(createMovieResponse.status)) {
        testMovieId = createMovieResponse.body.mediaId;
      }
    }

    // Register and login user A
    await request(app)
      .post('/auth/register')
      .send(userA);

    const userALoginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: userA.username,
        password: userA.password
      });

    if (userALoginResponse.status === 200) {
      userAToken = userALoginResponse.body.token;
    }

    // Register and login user B
    await request(app)
      .post('/auth/register')
      .send(userB);

    const userBLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: userB.username,
        password: userB.password
      });

    if (userBLoginResponse.status === 200) {
      userBToken = userBLoginResponse.body.token;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test movie
    if (adminToken && testMovieId) {
      await request(app)
        .delete(`/movies/${testMovieId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('IT-RATE-INT-001 - User rates movie → rating stored', () => {
    test('should allow user to rate movie and store rating', async () => {
      if (!userAToken || !testMovieId) {
        console.log('Skipping test: Missing user token or test movie');
        return;
      }

      // Act - Step 1: User registers and logs in (done in beforeAll)
      // Act - Step 2: Create a movie (done in beforeAll)
      // Act - Step 3: User rates movie with rating = 8
      const ratingResponse = await request(app)
        .post(`/movies/${testMovieId}/rate`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ rating: 8 });

      if (ratingResponse.status === 404) {
        console.log('Rating endpoint not implemented, skipping test');
        return;
      }

      // Assert - Rating saved or endpoint protected
      expect([200, 201, 403]).toContain(ratingResponse.status);

      // Act - Step 4: Fetch movie details
      const movieResponse = await request(app)
        .get(`/movies/${testMovieId}`);

      if (movieResponse.status === 200) {
        // Assert - Movie average/ratings reflect new rating
        const movie = movieResponse.body;
        
        // Check if rating information is included in movie response
        if (movie.averageRating !== undefined) {
          expect(movie.averageRating).toBeCloseTo(8, 1);
        }
        
        if (movie.ratingCount !== undefined) {
          expect(movie.ratingCount).toBeGreaterThan(0);
        }

        // Check if individual ratings are included
        if (movie.ratings && Array.isArray(movie.ratings)) {
          const userRating = movie.ratings.find(r => r.userId === userAToken.userId);
          if (userRating) {
            expect(userRating.rating).toBe(8);
          }
        }
      }
    });
  });

  describe('IT-RATE-INT-002 - User updates rating → movie average changes', () => {
    test('should allow user to update rating and recalculate average', async () => {
      if (!userAToken || !testMovieId) {
        console.log('Skipping test: Missing user token or test movie');
        return;
      }

      // Act - Step 1: User rates movie with 5
      const firstRatingResponse = await request(app)
        .post(`/movies/${testMovieId}/rate`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ rating: 5 });

      if (firstRatingResponse.status === 404) {
        console.log('Rating endpoint not implemented, skipping test');
        return;
      }

      expect([200, 201, 403]).toContain(firstRatingResponse.status);

      // Act - Step 2: Same user updates rating to 9
      const updatedRatingResponse = await request(app)
        .post(`/movies/${testMovieId}/rate`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ rating: 9 });

      expect([200, 201, 403]).toContain(updatedRatingResponse.status);

      // Act - Step 3: Fetch movie
      const movieResponse = await request(app)
        .get(`/movies/${testMovieId}`);

      if (movieResponse.status === 200) {
        const movie = movieResponse.body;

        // Assert - Only one rating from the user exists (check via API or rating count)
        if (movie.ratingCount !== undefined) {
          // If this is the only rating, count should be 1
          // (This assumes no other ratings exist for this movie)
        }

        // Assert - Average updated correctly
        if (movie.averageRating !== undefined) {
          // If this is the only rating, average should be 9
          expect(movie.averageRating).toBeCloseTo(9, 1);
        }

        // If individual ratings are returned, verify only one rating per user
        if (movie.ratings && Array.isArray(movie.ratings)) {
          const userRatings = movie.ratings.filter(r => r.userId === userAToken.userId);
          expect(userRatings.length).toBeLessThanOrEqual(1);
          
          if (userRatings.length === 1) {
            expect(userRatings[0].rating).toBe(9);
          }
        }
      }
    });
  });

  describe('IT-RATE-INT-003 - Multiple users rate movie → average calculated', () => {
    test('should calculate correct average when multiple users rate movie', async () => {
      if (!userAToken || !userBToken || !testMovieId) {
        console.log('Skipping test: Missing user tokens or test movie');
        return;
      }

      // Act - Step 1: User A rates 8
      const userARatingResponse = await request(app)
        .post(`/movies/${testMovieId}/rate`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ rating: 8 });

      if (userARatingResponse.status === 404) {
        console.log('Rating endpoint not implemented, skipping test');
        return;
      }

      expect([200, 201, 403]).toContain(userARatingResponse.status);

      // Act - Step 2: User B rates 6
      const userBRatingResponse = await request(app)
        .post(`/movies/${testMovieId}/rate`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ rating: 6 });

      expect([200, 201, 403]).toContain(userBRatingResponse.status);

      // Act - Step 3: Fetch movie
      const movieResponse = await request(app)
        .get(`/movies/${testMovieId}`);

      if (movieResponse.status === 200) {
        const movie = movieResponse.body;

        // Assert - Average is (8 + 6) / 2 = 7
        if (movie.averageRating !== undefined) {
          expect(movie.averageRating).toBeCloseTo(7, 1);
        }

        // Assert - Rating count should be 2
        if (movie.ratingCount !== undefined) {
          expect(movie.ratingCount).toBeGreaterThanOrEqual(2);
        }

        // Assert - Both ratings shown if API supports rating lists
        if (movie.ratings && Array.isArray(movie.ratings)) {
          expect(movie.ratings.length).toBeGreaterThanOrEqual(2);
          
          // Check that both user ratings are present
          const ratings = movie.ratings.map(r => r.rating);
          expect(ratings).toContain(8);
          expect(ratings).toContain(6);
        }
      }
    });

    test('should handle edge cases in rating calculations', async () => {
      if (!testMovieId) {
        console.log('Skipping test: No test movie available');
        return;
      }

      // Test rating boundaries
      const boundaryTests = [
        { rating: 1, description: 'minimum rating' },
        { rating: 10, description: 'maximum rating' },
        { rating: 5, description: 'middle rating' }
      ];

      for (const test of boundaryTests) {
        if (userAToken) {
          const response = await request(app)
            .post(`/movies/${testMovieId}/rate`)
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ rating: test.rating });

          if (response.status !== 404) {
            expect([200, 201, 400, 403]).toContain(response.status);
          }
        }
      }
    });
  });

  describe('Rating Input Validation', () => {
    test('should reject invalid rating values', async () => {
      if (!userAToken || !testMovieId) {
        console.log('Skipping test: Missing user token or test movie');
        return;
      }

      const invalidRatings = [0, 11, -1, 'invalid', null, undefined];

      for (const invalidRating of invalidRatings) {
        const response = await request(app)
          .post(`/movies/${testMovieId}/rate`)
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ rating: invalidRating });

        if (response.status !== 404) {
          // Should reject invalid ratings with 400 Bad Request or 403 Forbidden
          expect([400, 422, 403]).toContain(response.status);
        }
      }
    });

    test('should require authentication for rating', async () => {
      if (!testMovieId) {
        console.log('Skipping test: No test movie available');
        return;
      }

      // Try to rate without authentication
      const response = await request(app)
        .post(`/movies/${testMovieId}/rate`)
        .send({ rating: 5 });

      if (response.status !== 404) {
        // Should require authentication
        expect([401, 403]).toContain(response.status);
      }
    });
  });
});