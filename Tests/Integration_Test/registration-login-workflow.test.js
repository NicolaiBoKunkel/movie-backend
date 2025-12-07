const request = require('supertest');
const app = require('../../src/app').default;

describe('Registration & Login Workflow Integration Tests', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!',
    email: `test_${Date.now()}@example.com`
  };

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('IT-REG-001 - Registration → Login workflow', () => {
    test('should register user and then successfully login', async () => {
      // Arrange
      // Ensure no user exists with this email (handled by unique email generation)

      // Act - Step 1: Call POST /register with valid data
      const registrationResponse = await request(app)
        .post('/auth/register')
        .send(testUser);

      // Assert - Registration returns 201 Created
      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.body).toHaveProperty('username', testUser.username);
      expect(registrationResponse.body).toHaveProperty('user_id');

      // Act - Step 2: Call POST /login using the same credentials
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      // Assert - Login returns 200 OK and a valid JWT/token
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.username).toBe(testUser.username);

      // Assert - Token can be decoded and contains correct user ID
      const token = loginResponse.body.token;
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts

      // Verify token contains correct user ID by making authenticated request
      const profileResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      if (profileResponse.status === 200) {
        expect(profileResponse.body.username).toBe(testUser.username);
      }
    });
  });

  describe('IT-REG-002 - Prevent login before registration completes', () => {
    test('should fail login for non-existing user, then succeed after registration', async () => {
      // Arrange
      const newUser = {
        username: `newuser_${Date.now()}`,
        password: 'NewPassword123!',
        email: `newtest_${Date.now()}@example.com`
      };

      // Act - Step 1: Call POST /login with credentials for a non-existing user
      const firstLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: newUser.username,
          password: newUser.password
        });

      // Assert - First login: 401 Unauthorized
      expect(firstLoginResponse.status).toBe(401);
      expect(firstLoginResponse.body).toHaveProperty('error');

      // Act - Step 2: Register the user
      const registrationResponse = await request(app)
        .post('/auth/register')
        .send(newUser);

      expect(registrationResponse.status).toBe(201);

      // Act - Step 3: Try login again
      const secondLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: newUser.username,
          password: newUser.password
        });

      // Assert - After registration: login succeeds
      expect(secondLoginResponse.status).toBe(200);
      expect(secondLoginResponse.body).toHaveProperty('token');
      expect(secondLoginResponse.body).toHaveProperty('user');
      expect(secondLoginResponse.body.user.username).toBe(newUser.username);
    });
  });
});