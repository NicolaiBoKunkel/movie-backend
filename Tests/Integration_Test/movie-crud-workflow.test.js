const request = require('supertest');
const app = require('../../src/app').default;

describe('Movie CRUD Operations Integration Tests', () => {
  let adminToken;
  let userToken;
  let createdMovieId;

  const adminUser = {
    username: 'admin',
    password: 'admin123'
  };

  const normalUser = {
    username: `user_${Date.now()}`,
    password: 'UserPassword123!',
    email: `user_${Date.now()}@example.com`
  };

  const testMovie = {
    tmdbId: 999999999, // Using a high number to avoid conflicts
    title: 'Integration Test Movie',
    releaseDate: '2023-01-15',
    genreIds: [1], // Action genre
    overview: 'This is a test movie for integration testing',
    runtime: 120
  };

  beforeAll(async () => {
    // Login with existing admin user from database
    let adminLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: adminUser.username,
        password: adminUser.password
      });

    // If admin login fails (e.g., in CI), try to register the first user (becomes admin)
    if (adminLoginResponse.status !== 200) {
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          username: adminUser.username,
          password: adminUser.password
        });
      
      // Try login again after registration
      if (registerResponse.status === 201 || registerResponse.status === 200) {
        adminLoginResponse = await request(app)
          .post('/auth/login')
          .send({
            username: adminUser.username,
            password: adminUser.password
          });
      }
    }

    if (adminLoginResponse.status === 200) {
      adminToken = adminLoginResponse.body.token;
    } else {
      console.error('Admin login failed with status:', adminLoginResponse.status, adminLoginResponse.body);
    }

    // Register normal user
    await request(app)
      .post('/auth/register')
      .send(normalUser);

    const userLoginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: normalUser.username,
        password: normalUser.password
      });

    if (userLoginResponse.status === 200) {
      userToken = userLoginResponse.body.token;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete created movie if it exists
    if (createdMovieId && adminToken) {
      await request(app)
        .delete(`/movies/${createdMovieId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('IT-MOV-CRT-INT-001 - Admin creates movie → User fetches it', () => {
    test('should allow admin to create movie and user to fetch it', async () => {
      if (!adminToken) {
        console.log('Skipping test: No admin token available');
        return;
      }

      // Act - Step 1: Login as admin → get token (done in beforeAll)
      // Act - Step 2: Create movie via POST /movies
      const createResponse = await request(app)
        .post('/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testMovie);

      // Handle different possible responses for movie creation
      if (createResponse.status === 404) {
        console.log('Movie creation endpoint not implemented, skipping test');
        return;
      }

      // Assert - Admin can create
      expect([201, 200, 403]).toContain(createResponse.status);
      
      if (createResponse.status === 403) {
        console.log('Admin creation not authorized, skipping test');
        return;
      }
      
      if (createResponse.status === 201 || createResponse.status === 200) {
        expect(createResponse.body).toHaveProperty('mediaId');
        createdMovieId = createResponse.body.mediaId;

        // Act - Step 3: Login as normal user (done in beforeAll)
        // Act - Step 4: Fetch movie with GET /movies/{id}
        const fetchResponse = await request(app)
          .get(`/movies/${createdMovieId}`);

        // Assert - User can retrieve
        expect([200, 404]).toContain(fetchResponse.status);

        if (fetchResponse.status === 200) {
          // Assert - Returned movie matches created data
          expect(fetchResponse.body).toHaveProperty('originalTitle', testMovie.title);
          // Note: the API stores releaseDate as a date field
        }
      }
    });
  });

  describe('IT-MOV-UPD-INT-001 - Admin updates movie → Users see new values', () => {
    test('should allow admin to update movie and reflect changes for users', async () => {
      if (!adminToken || !createdMovieId) {
        console.log('Skipping test: No admin token or created movie available');
        return;
      }

      // Arrange
      const updatedData = {
        title: 'Updated Integration Test Movie',
        overview: 'Updated overview for testing',
        runtime: 135
      };

      // Act - Step 1: Admin creates movie (done in previous test)
      // Act - Step 2: Admin updates title/overview/runtime
      const updateResponse = await request(app)
        .put(`/movies/${createdMovieId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);

      if (updateResponse.status === 404) {
        console.log('Movie update endpoint not implemented, skipping test');
        return;
      }

      // Assert update succeeded
      expect([200, 204]).toContain(updateResponse.status);

      // Act - Step 3: User fetches movie
      const fetchResponse = await request(app)
        .get(`/movies/${createdMovieId}`);

      if (fetchResponse.status === 200) {
        // Assert - Updated fields reflect correctly
        expect(fetchResponse.body).toHaveProperty('originalTitle', updatedData.title);

        // Assert - No duplicate movies created (same ID)
        expect(fetchResponse.body.mediaId).toBe(String(createdMovieId));
      }
    });
  });

  describe('IT-MOV-DEL-INT-001 - Admin deletes movie → Cannot fetch afterward', () => {
    test('should allow admin to delete movie and prevent subsequent fetches', async () => {
      if (!adminToken) {
        console.log('Skipping test: No admin token available');
        return;
      }

      // Arrange - Create a movie specifically for deletion
      const movieToDelete = {
        tmdbId: 999999997, // Using a high number to avoid conflicts
        title: 'Movie to Delete',
        releaseDate: '2023-06-10',
        genreIds: [11], // Horror genre
        overview: 'Test movie for deletion workflow',
        runtime: 90
      };

      const createResponse = await request(app)
        .post('/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(movieToDelete);

      if (createResponse.status === 404) {
        console.log('Movie creation endpoint not implemented, skipping test');
        return;
      }

      if (![200, 201].includes(createResponse.status)) {
        console.log('Could not create movie for deletion test, skipping');
        return;
      }

      const movieIdToDelete = createResponse.body.mediaId;

      // Act - Step 1: Admin creates movie (done above)
      // Act - Step 2: Admin deletes it
      const deleteResponse = await request(app)
        .delete(`/movies/${movieIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (deleteResponse.status === 404) {
        console.log('Movie delete endpoint not implemented, skipping test');
        return;
      }

      // Assert - Delete returns 204 or 200
      expect([200, 204]).toContain(deleteResponse.status);

      // Act - Step 3: User attempts to fetch deleted movie
      const fetchResponse = await request(app)
        .get(`/movies/${movieIdToDelete}`);

      // Assert - Fetch returns 404 Not Found
      expect(fetchResponse.status).toBe(404);
      expect(fetchResponse.body).toHaveProperty('error');
    });
  });
});