const request = require('supertest');

// Mock the movie service
const mockMovieService = {
  updateMovie: jest.fn(),
  findMovieById: jest.fn()
};

// Mock authentication middleware
const mockAuth = {
  verifyAdminToken: jest.fn()
};

// Mock app with movie update endpoint
const express = require('express');
const app = express();
app.use(express.json());

// Mock movie update endpoint
app.put('/movies/:id', async (req, res) => {
  const { id } = req.params;
  const { title, year, genre, duration } = req.body;
  
  try {
    // Admin authorization check (mocked)
    const authResult = await mockAuth.verifyAdminToken(req.headers.authorization);
    if (!authResult.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // ID validation
    const movieId = parseInt(id);
    if (isNaN(movieId) || movieId < 0) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if movie exists
    const existingMovie = await mockMovieService.findMovieById(movieId);
    if (!existingMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Check if request body is empty
    const updateFields = { title, year, genre, duration };
    const hasUpdates = Object.values(updateFields).some(value => value !== undefined);
    if (!hasUpdates) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    // Validation logic for provided fields
    if (title !== undefined) {
      if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'title required' });
      }
      if (title.length > 100) {
        return res.status(400).json({ error: 'title too long' });
      }
    }

    if (year !== undefined) {
      if (typeof year !== 'number' || !Number.isInteger(year)) {
        return res.status(400).json({ error: 'invalid type' });
      }
      if (year <= 1899 || year > new Date().getFullYear() + 10) {
        return res.status(400).json({ error: 'year out of range' });
      }
    }

    if (genre !== undefined) {
      const validGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'];
      if (!validGenres.includes(genre)) {
        return res.status(400).json({ error: 'invalid genre' });
      }
    }

    if (duration !== undefined && duration > 300) {
      return res.status(400).json({ error: 'duration too long' });
    }

    const updatedMovie = await mockMovieService.updateMovie(movieId, updateFields);
    res.status(200).json({ 
      message: 'Movie updated successfully', 
      movie: updatedMovie
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Update Movie Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.verifyAdminToken.mockResolvedValue({ isAdmin: true, userId: 1 });
    mockMovieService.findMovieById.mockResolvedValue({
      id: 42,
      title: 'Original Title',
      year: 2010,
      genre: 'Action',
      duration: 120
    });
    mockMovieService.updateMovie.mockResolvedValue({
      id: 42,
      title: 'New Title',
      year: 2015,
      genre: 'Drama',
      duration: 120
    });
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('MOV-UPD-001 - Successful full update (admin)', () => {
    test('should update all movie fields successfully', async () => {
      // Arrange
      const updateData = {
        title: 'New Title',
        year: 2015,
        genre: 'Drama',
        duration: 120
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/42')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Movie updated successfully');
      expect(response.body.movie).toMatchObject({
        id: 42,
        title: 'New Title',
        year: 2015,
        genre: 'Drama'
      });
      expect(mockMovieService.findMovieById).toHaveBeenCalledWith(42);
      expect(mockMovieService.updateMovie).toHaveBeenCalledWith(42, updateData);
    });
  });

  describe('MOV-UPD-002 - Partial update (only title)', () => {
    test('should update only title when other fields are omitted', async () => {
      // Arrange
      const updateData = {
        title: 'New Title Only'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };
      mockMovieService.updateMovie.mockResolvedValue({
        id: 42,
        title: 'New Title Only',
        year: 2010,
        genre: 'Action',
        duration: 120
      });

      // Act
      const response = await request(app)
        .put('/movies/42')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Movie updated successfully');
      expect(response.body.movie.title).toBe('New Title Only');
      expect(mockMovieService.updateMovie).toHaveBeenCalledWith(42, {
        title: 'New Title Only',
        year: undefined,
        genre: undefined,
        duration: undefined
      });
    });
  });

  describe('MOV-UPD-003 - Invalid id format', () => {
    test('should return 400 when id is not a number', async () => {
      // Arrange
      const updateData = { title: 'New Title' };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/abc')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid ID format');
    });
  });

  describe('MOV-UPD-004 - Movie not found', () => {
    test('should return 404 when movie does not exist', async () => {
      // Arrange
      mockMovieService.findMovieById.mockResolvedValue(null);
      const updateData = { title: 'New Title' };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/9999')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Movie not found');
    });
  });

  describe('MOV-UPD-005 - Invalid year (below range)', () => {
    test('should return 400 when year is below valid range', async () => {
      // Arrange
      const updateData = {
        year: 1800
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/42')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'year out of range');
    });
  });

  describe('MOV-UPD-006 - Invalid genre', () => {
    test('should return 400 when genre is not allowed', async () => {
      // Arrange
      const updateData = {
        genre: 'Sci-Fi'
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/42')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'invalid genre');
    });
  });

  describe('MOV-UPD-007 - Invalid duration (>300)', () => {
    test('should return 400 when duration is above maximum', async () => {
      // Arrange
      const updateData = {
        duration: 400
      };
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/42')
        .set(adminHeaders)
        .send(updateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'duration too long');
    });
  });

  describe('MOV-UPD-008 - Empty update body', () => {
    test('should return 400 when update body is empty', async () => {
      // Arrange
      const emptyUpdateData = {};
      const adminHeaders = { authorization: 'Bearer admin-token' };

      // Act
      const response = await request(app)
        .put('/movies/42')
        .set(adminHeaders)
        .send(emptyUpdateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No update fields provided');
    });
  });
});