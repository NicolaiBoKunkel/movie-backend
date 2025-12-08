const request = require('supertest');

// Mock authentication service
const mockAuthService = {
  verifyToken: jest.fn(),
  isTokenExpired: jest.fn()
};

// Mock app with authentication endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Mock protected endpoint
app.get('/protected', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Check if token is expired
    const isExpired = await mockAuthService.isTokenExpired(token);
    if (isExpired) {
      return res.status(401).json({ error: 'token expired' });
    }

    // Verify token
    const authResult = await mockAuthService.verifyToken(token);
    if (!authResult.isValid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.status(200).json({ 
      message: 'Access granted',
      userId: authResult.userId 
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Authentication Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.verifyToken.mockResolvedValue({ isValid: true, userId: 1 });
    mockAuthService.isTokenExpired.mockResolvedValue(false);
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('AUTH-001 - Access with expired token', () => {
    test('should return 401 when token is expired', async () => {
      // Arrange
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      mockAuthService.isTokenExpired.mockResolvedValue(true);
      
      const headers = { 
        authorization: `Bearer ${expiredToken}` 
      };

      // Act
      const response = await request(app)
        .get('/protected')
        .set(headers);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'token expired');
      expect(mockAuthService.isTokenExpired).toHaveBeenCalledWith(expiredToken);
    });
  });

  describe('Additional Authentication Tests', () => {
    test('should return 401 when no authorization header is provided', async () => {
      // Arrange
      // No headers

      // Act
      const response = await request(app)
        .get('/protected');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token required');
    });

    test('should return 401 when authorization header is malformed', async () => {
      // Arrange
      const headers = { 
        authorization: 'InvalidFormat token123' 
      };

      // Act
      const response = await request(app)
        .get('/protected')
        .set(headers);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token required');
    });

    test('should return 401 when token is invalid', async () => {
      // Arrange
      mockAuthService.verifyToken.mockResolvedValue({ isValid: false });
      const headers = { 
        authorization: 'Bearer invalid-token' 
      };

      // Act
      const response = await request(app)
        .get('/protected')
        .set(headers);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    test('should return 200 when token is valid and not expired', async () => {
      // Arrange
      const validToken = 'valid-jwt-token';
      const headers = { 
        authorization: `Bearer ${validToken}` 
      };

      // Act
      const response = await request(app)
        .get('/protected')
        .set(headers);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Access granted');
      expect(response.body).toHaveProperty('userId', 1);
      expect(mockAuthService.isTokenExpired).toHaveBeenCalledWith(validToken);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(validToken);
    });
  });
});