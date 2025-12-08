const request = require('supertest');

// Mock the authentication service
const mockAuthService = {
  findUserByEmail: jest.fn(),
  validatePassword: jest.fn(),
  generateToken: jest.fn()
};

// Mock app with login endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Mock login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validation logic
    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'password required' });
    }

    // Find user by email
    const user = await mockAuthService.findUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await mockAuthService.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = await mockAuthService.generateToken(user.id);
    res.status(200).json({ token, message: 'Login successful' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Login Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'user@mail.com',
      password: 'hashedPassword123'
    });
    mockAuthService.validatePassword.mockResolvedValue(true);
    mockAuthService.generateToken.mockResolvedValue('jwt-token-123');
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('LOG-001 - Successful login', () => {
    test('should login user successfully with valid credentials', async () => {
      // Arrange
      const validCredentials = {
        email: 'user@mail.com',
        password: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(validCredentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'jwt-token-123');
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(mockAuthService.findUserByEmail).toHaveBeenCalledWith('user@mail.com');
      expect(mockAuthService.validatePassword).toHaveBeenCalledWith('Secret123', 'hashedPassword123');
      expect(mockAuthService.generateToken).toHaveBeenCalledWith(1);
    });
  });

  describe('LOG-002 - Incorrect password', () => {
    test('should return 401 when password is incorrect', async () => {
      // Arrange
      mockAuthService.validatePassword.mockResolvedValue(false);
      const invalidCredentials = {
        email: 'user@mail.com',
        password: 'WrongPass'
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('LOG-003 - Email not registered', () => {
    test('should return 401 when email is not registered', async () => {
      // Arrange
      mockAuthService.findUserByEmail.mockResolvedValue(null);
      const unregisteredCredentials = {
        email: 'nouser@mail.com',
        password: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(unregisteredCredentials);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('LOG-004 - Missing email', () => {
    test('should return 400 when email is missing', async () => {
      // Arrange
      const invalidCredentials = {
        email: '',
        password: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'email required');
    });
  });

  describe('LOG-005 - Missing password', () => {
    test('should return 400 when password is missing', async () => {
      // Arrange
      const invalidCredentials = {
        email: 'user@mail.com',
        password: ''
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'password required');
    });
  });

  describe('LOG-006 - Invalid email format', () => {
    test('should return 400 when email format is invalid', async () => {
      // Arrange
      const invalidCredentials = {
        email: 'mail.com',
        password: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid email');
    });
  });

  describe('LOG-009 - Leading/trailing spaces in email', () => {
    test('should handle email with leading/trailing spaces', async () => {
      // Arrange
      const credentialsWithSpaces = {
        email: ' user@mail.com ',
        password: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/login')
        .send(credentialsWithSpaces);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'jwt-token-123');
      expect(mockAuthService.findUserByEmail).toHaveBeenCalledWith('user@mail.com');
    });
  });
});