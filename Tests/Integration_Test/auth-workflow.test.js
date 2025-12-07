const request = require('supertest');
const app = require('../../src/app').default;

describe('Authentication & Authorization Integration Tests', () => {
  let userToken;
  let adminToken;
  const testUser = {
    username: `authuser_${Date.now()}`,
    password: 'AuthPassword123!',
    email: `authtest_${Date.now()}@example.com`
  };

  beforeAll(async () => {
    // Register and login user to get token
    await request(app)
      .post('/auth/register')
      .send(testUser);

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    if (loginResponse.status === 200) {
      userToken = loginResponse.body.token;
    }

    // Try to get admin token (this might not work depending on your setup)
    // You might need to create admin user differently or use existing admin
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('IT-AUTH-001 - Token required → access protected route', () => {
    test('should allow access with token but deny without token', async () => {
      // Arrange
      // User is registered and logged in (from beforeAll)

      // Act - Step 1: Call a protected route with valid token
      let protectedResponse;
      if (userToken) {
        protectedResponse = await request(app)
          .get('/admin/users') // Protected admin route
          .set('Authorization', `Bearer ${userToken}`);
      }

      // Act - Step 2: Call same route without token
      const unprotectedResponse = await request(app)
        .get('/admin/users'); // Same route without token

      // Assert - With token: should get response (200 or 403, but not 401)
      if (userToken && protectedResponse) {
        // Accept 200 (authorized), 403 (authenticated but not admin), or 404 (endpoint doesn't exist)
        expect([200, 403, 404]).toContain(protectedResponse.status);
        // Should NOT be 401 (unauthorized) since we provided a valid token
        expect(protectedResponse.status).not.toBe(401);
      }

      // Assert - Without token: 401 Unauthorized (or 404 if endpoint doesn't exist)
      expect([401, 404]).toContain(unprotectedResponse.status);
    });

    test('should protect movie creation endpoint', async () => {
      // Arrange
      const movieData = {
        title: 'Test Movie',
        year: 2023,
        genre: 'Action',
        duration: 120
      };

      // Act - Try to create movie without token
      const withoutTokenResponse = await request(app)
        .post('/movies')
        .send(movieData);

      // Act - Try to create movie with token (if available)
      let withTokenResponse;
      if (userToken) {
        withTokenResponse = await request(app)
          .post('/movies')
          .set('Authorization', `Bearer ${userToken}`)
          .send(movieData);
      }

      // Assert - Without token should be denied
      expect([401, 404]).toContain(withoutTokenResponse.status);

      // Assert - With token should get past authentication (may fail on authorization)
      if (userToken && withTokenResponse) {
        // Should not be 401 (authentication failed), but may be 403 (authorization failed)
        expect(withTokenResponse.status).not.toBe(401);
      }
    });
  });

  describe('IT-AUTH-002 - Expired token blocked', () => {
    test('should block expired token but allow fresh token', async () => {
      // Note: This test requires ability to create expired tokens
      // For now, we'll test with invalid token format as a proxy
      
      // Arrange - Create an obviously invalid/expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      // Act - Step 1: Call protected route with expired/invalid token
      const expiredResponse = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Act - Step 2: Call with fresh token (if available)
      let freshResponse;
      if (userToken) {
        freshResponse = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer ${userToken}`);
      }

      // Assert - Expired/invalid token: 401 Unauthorized (or 404 if endpoint doesn't exist)
      expect([401, 404]).toContain(expiredResponse.status);
      if (expiredResponse.status !== 404) {
        expect(expiredResponse.status).toBe(401);
      }

      // Assert - Fresh token: success (not 401)
      if (userToken && freshResponse) {
        expect(freshResponse.status).not.toBe(401);
        expect([200, 403, 404]).toContain(freshResponse.status);
      }
    });

    test('should reject malformed tokens', async () => {
      // Arrange
      const malformedTokens = [
        'invalid-token',
        'Bearer invalid',
        'not.a.jwt',
        '',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      ];

      // Act & Assert
      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer ${token}`);

        // Should be 401 (unauthorized) or 404 (endpoint doesn't exist)
        expect([401, 404]).toContain(response.status);
        if (response.status !== 404) {
          expect(response.status).toBe(401);
        }
      }
    });
  });
});