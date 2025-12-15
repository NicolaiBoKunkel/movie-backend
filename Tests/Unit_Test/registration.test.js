const request = require('supertest');

// Mock the registration service/controller
const mockRegistrationService = {
  registerUser: jest.fn(),
  checkEmailExists: jest.fn(),
  hashPassword: jest.fn()
};

// Mock app with registration endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Mock registration endpoint
app.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  try {
    // Validation logic
    if (!username) {
      return res.status(400).json({ error: 'username required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'username too short' });
    }
    if (username.length > 20) {
      return res.status(400).json({ error: 'username too long' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'invalid characters' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password too short' });
    }
    if (!confirmPassword) {
      return res.status(400).json({ error: 'confirmation required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'passwords do not match' });
    }

    const emailExists = await mockRegistrationService.checkEmailExists(email);
    if (emailExists) {
      return res.status(400).json({ error: 'email already in use' });
    }

    const hashedPassword = await mockRegistrationService.hashPassword(password);
    const user = await mockRegistrationService.registerUser({
      username,
      email: email.trim(),
      password: hashedPassword
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Registration Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistrationService.checkEmailExists.mockResolvedValue(false);
    mockRegistrationService.hashPassword.mockResolvedValue('hashedPassword123');
    mockRegistrationService.registerUser.mockResolvedValue({ id: 1, username: 'User01', email: 'user@example.com' });
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('REG-001 - Successful registration', () => {
    test('should register user successfully with valid data', async () => {
      // Arrange
      const validUserData = {
        username: 'User01',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(validUserData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('userId');
      expect(mockRegistrationService.checkEmailExists).toHaveBeenCalledWith('user@example.com');
      expect(mockRegistrationService.hashPassword).toHaveBeenCalledWith('Secret123');
      expect(mockRegistrationService.registerUser).toHaveBeenCalled();
    });
  });

  describe('REG-002 - Missing username', () => {
    test('should return 400 when username is empty', async () => {
      // Arrange
      const invalidUserData = {
        username: '',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'username required');
    });
  });

  describe('REG-003 - Username too short', () => {
    test('should return 400 when username is too short', async () => {
      // Arrange
      const invalidUserData = {
        username: 'ab',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'username too short');
    });
  });

  describe('REG-004 - Username too long', () => {
    test('should return 400 when username is too long', async () => {
      // Arrange
      const invalidUserData = {
        username: 'averylongusernamethatis21',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'username too long');
    });
  });

  describe('REG-005 - Username with invalid characters', () => {
    test('should return 400 when username contains invalid characters', async () => {
      // Arrange
      const invalidUserData = {
        username: 'bad user!',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid characters');
    });
  });

  describe('REG-006 - Missing email', () => {
    test('should return 400 when email is empty', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: '',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'email required');
    });
  });

  describe('REG-007 - Invalid email (missing @)', () => {
    test('should return 400 when email is missing @', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: 'userexample.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid email');
    });
  });

  describe('REG-008 - Invalid email (missing dot after @)', () => {
    test('should return 400 when email is missing dot after @', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: 'user@example',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid email');
    });
  });

  describe('REG-009 - Invalid email (multiple @)', () => {
    test('should return 400 when email has multiple @', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: 'user@@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid email');
    });
  });

  describe('REG-010 - Invalid email (leading/trailing spaces)', () => {
    test('should handle email with leading/trailing spaces', async () => {
      // Arrange
      const userDataWithSpaces = {
        username: 'User01',
        email: ' user@example.com ',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(userDataWithSpaces);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(mockRegistrationService.registerUser).toHaveBeenCalledWith({
        username: 'User01',
        email: 'user@example.com',
        password: 'hashedPassword123'
      });
    });
  });

  describe('REG-011 - Email already registered', () => {
    test('should return 400 when email already exists', async () => {
      // Arrange
      mockRegistrationService.checkEmailExists.mockResolvedValue(true);
      const duplicateEmailData = {
        username: 'User01',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(duplicateEmailData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'email already in use');
    });
  });

  describe('REG-012 - Missing password', () => {
    test('should return 400 when password is empty', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: 'user@example.com',
        password: '',
        confirmPassword: 'Secret123'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'password required');
    });
  });

  describe('REG-013 - Password too short', () => {
    test('should return 400 when password is too short', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: 'user@example.com',
        password: 'short1',
        confirmPassword: 'short1'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'password too short');
    });
  });

  describe('REG-014 - Missing confirmPassword', () => {
    test('should return 400 when confirmPassword is empty', async () => {
      // Arrange
      const invalidUserData = {
        username: 'User01',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: ''
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(invalidUserData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'confirmation required');
    });
  });

  describe('REG-015 - confirmPassword does not match', () => {
    test('should return 400 when passwords do not match', async () => {
      // Arrange
      const mismatchedPasswordData = {
        username: 'User01',
        email: 'user@example.com',
        password: 'Secret123',
        confirmPassword: 'Secret321'
      };

      // Act
      const response = await request(app)
        .post('/register')
        .send(mismatchedPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'passwords do not match');
    });
  });
});