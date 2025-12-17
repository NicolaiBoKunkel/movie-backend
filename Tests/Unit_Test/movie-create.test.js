const request = require('supertest');

// Mock the movie service
const mockMovieService = {
  createMovie: jest.fn(),
  findMovieByTitle: jest.fn()
};

// Mock authentication middleware
const mockAuth = {
  verifyAdminToken: jest.fn()
};

// Mock app with movie creation endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Mock movie creation endpoint
app.post('/movies', async (req, res) => {
  const { title, year, genre, duration } = req.body;
  
  try {
    // Admin authorization check (mocked)
    const authResult = await mockAuth.verifyAdminToken(req.headers.authorization);
    if (!authResult.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validation logic
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'title required' });
    }
    if (title.length > 100) {
      return res.status(400).json({ error: 'title too long' });
    }
    if (year !== undefined) {
      if (typeof year !== 'number' || !Number.isInteger(year)) {
        return res.status(400).json({ error: 'invalid type' });
      }
      if (year <= 1899 || year > new Date().getFullYear() + 10) {
        return res.status(400).json({ error: 'year out of range' });
      }
    }
    if (!genre) {
      return res.status(400).json({ error: 'genre required' });
    }
    const validGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'];
    if (!validGenres.includes(genre)) {
      return res.status(400).json({ error: 'invalid genre' });
    }
    if (duration !== undefined && duration <= 0) {
      return res.status(400).json({ error: 'duration must be positive' });
    }

    const movie = await mockMovieService.createMovie({
      title: title.trim(),
      year,
      genre,
      duration
    });

    res.status(201).json({ 
      message: 'Movie created successfully', 
      movieId: movie.id,
      movie
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Create Movie Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.verifyAdminToken.mockResolvedValue({ isAdmin: true, userId: 1 });
    mockMovieService.createMovie.mockResolvedValue({
      id: 1,
      title: 'Inception',
      year: 2010,
      genre: 'Action',
      duration: 148
    });
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('MOV-CRT-001 - Successful movie creation (admin)', () => {
    test('should create movie successfully with valid data', async () => { //EP
      // Arrange
      const validMovieData = {
        title: 'Inception',
        year: 2010,
        genre: 'Action',
        duration: 148
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(validMovieData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Movie created successfully');
      expect(response.body).toHaveProperty('movieId', 1);
      expect(response.body.movie).toMatchObject(validMovieData);
      expect(mockAuth.verifyAdminToken).toHaveBeenCalledWith('Bearer admin-token');
      expect(mockMovieService.createMovie).toHaveBeenCalledWith(validMovieData);
    });
  });

  describe('MOV-CRT-002 - Missing title', () => {
    test('should return 400 when title is missing', async () => { //EP
      // Arrange
      const invalidMovieData = {
        title: '',
        year: 2010,
        genre: 'Action'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'title required');
    });
  });

  describe('MOV-CRT-003 - Title too long', () => {
    test('should return 400 when title is too long', async () => { //BVA
      // Arrange
      const invalidMovieData = {
        title: 'A'.repeat(101), // 101 characters
        year: 2010,
        genre: 'Action'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'title too long');
    });
  });

  describe('MOV-CRT-004 - Year below minimum (1899)', () => {
    test('should return 400 when year is 1899 or below', async () => { //BVA
      // Arrange
      const invalidMovieData = {
        title: 'Old Movie',
        year: 1899,
        genre: 'Drama'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'year out of range');
    });
  });

  describe('MOV-CRT-005 - Year above maximum (future)', () => {
    test('should return 400 when year is too far in future', async () => { //BVA
      // Arrange
      const invalidMovieData = {
        title: 'Future Movie',
        year: 3000,
        genre: 'Action'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'year out of range');
    });
  });

  describe('MOV-CRT-006 - Year not integer', () => {
    test('should return 400 when year is string instead of integer', async () => { //EP
      // Arrange
      const invalidMovieData = {
        title: 'Movie Title',
        year: '2010', // String instead of number
        genre: 'Action'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid type');
    });
  });

  describe('MOV-CRT-007 - Invalid genre', () => {
    test('should return 400 when genre is not in allowed list', async () => { //EP
      // Arrange
      const invalidMovieData = {
        title: 'Movie Title',
        year: 2010,
        genre: 'Sci-Fi' // Not in allowed list
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid genre');
    });
  });

  describe('MOV-CRT-008 - Missing genre', () => {
    test('should return 400 when genre field is missing', async () => { //EP
      // Arrange
      const invalidMovieData = {
        title: 'Movie Title',
        year: 2010
        // genre missing
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'genre required');
    });
  });

  describe('MOV-CRT-009 - Optional duration omitted', () => {
    test('should create movie successfully when duration is omitted', async () => { //EP
      // Arrange
      const validMovieData = {
        title: 'Movie Title',
        year: 2010,
        genre: 'Drama'
        // duration omitted
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };
      mockMovieService.createMovie.mockResolvedValue({
        id: 2,
        title: 'Movie Title',
        year: 2010,
        genre: 'Drama',
        duration: null
      });

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(validMovieData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Movie created successfully');
      expect(response.body.movie.duration).toBe(null);
    });
  });

  describe('MOV-CRT-010 - Duration below minimum (0)', () => {
    test('should return 400 when duration is 0 or negative', async () => { //BVA
      // Arrange
      const invalidMovieData = {
        title: 'Movie Title',
        year: 2010,
        genre: 'Action',
        duration: 0
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .post('/movies')
        .set(adminHeaders)
        .send(invalidMovieData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'duration must be positive');
    });
  });
});