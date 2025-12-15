const request = require('supertest');

// Mock the movie service
const mockMovieService = {
  searchMovies: jest.fn(),
  getMovieById: jest.fn(),
  deleteMovie: jest.fn(),
  rateMovie: jest.fn()
};

// Mock authentication middleware
const mockAuth = {
  verifyToken: jest.fn(),
  verifyAdminToken: jest.fn()
};

// Mock app with various movie endpoints
const express = require('express');
const app = express();
app.use(express.json());

// Mock movie search endpoint
app.get('/movies/search', async (req, res) => {
  const { yearFrom, yearTo, minRating, genre } = req.query;
  
  try {
    // Validate yearFrom and yearTo
    if (yearFrom !== undefined) {
      const yearFromNum = parseInt(yearFrom);
      if (isNaN(yearFromNum)) {
        return res.status(400).json({ error: 'invalid type' });
      }
    }
    
    if (yearTo !== undefined) {
      const yearToNum = parseInt(yearTo);
      if (isNaN(yearToNum)) {
        return res.status(400).json({ error: 'invalid type' });
      }
    }

    if (yearFrom !== undefined && yearTo !== undefined) {
      const yearFromNum = parseInt(yearFrom);
      const yearToNum = parseInt(yearTo);
      if (yearFromNum > yearToNum) {
        return res.status(400).json({ error: 'invalid range' });
      }
    }

    if (minRating !== undefined) {
      const rating = parseFloat(minRating);
      if (rating <= 0 || rating > 10) {
        return res.status(400).json({ error: 'rating out of range' });
      }
    }

    if (genre !== undefined) {
      const validGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'];
      if (!validGenres.includes(genre)) {
        return res.status(400).json({ error: 'invalid genre' });
      }
    }

    const movies = await mockMovieService.searchMovies({ yearFrom, yearTo, minRating, genre });
    res.status(200).json({ movies });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock get movie by ID endpoint
app.get('/movies/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const movieId = parseInt(id);
    if (isNaN(movieId) || movieId < 0) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const movie = await mockMovieService.getMovieById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.status(404).json({ movie });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock delete movie endpoint
app.delete('/movies/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const authResult = await mockAuth.verifyAdminToken(req.headers.authorization);
    if (!authResult.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    await mockMovieService.deleteMovie(movieId);
    res.status(200).json({ message: 'Movie deleted successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock rate movie endpoint
app.post('/movies/:id/rate', async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  
  try {
    const authResult = await mockAuth.verifyToken(req.headers.authorization);
    if (!authResult.isValid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if (rating === undefined) {
      return res.status(400).json({ error: 'rating required' });
    }

    let numRating;
    if (typeof rating === 'string') {
      numRating = parseFloat(rating.trim());
      if (isNaN(numRating)) {
        return res.status(400).json({ error: 'invalid rating format' });
      }
    } else if (typeof rating === 'number') {
      if (!Number.isInteger(rating)) {
        return res.status(400).json({ error: 'rating must be integer' });
      }
      numRating = rating;
    } else {
      return res.status(400).json({ error: 'invalid rating format' });
    }

    if (numRating <= 0 || numRating > 10) {
      return res.status(400).json({ error: 'rating out of range' });
    }

    const result = await mockMovieService.rateMovie(movieId, numRating, authResult.userId);
    const statusCode = result.isNewRating ? 201 : 200;
    
    res.status(statusCode).json({ message: 'Rating saved successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock pagination endpoint
app.get('/movies', async (req, res) => {
  const { page, pageSize } = req.query;
  
  try {
    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum <= 0) {
        return res.status(400).json({ error: 'invalid page' });
      }
    }

    if (pageSize !== undefined) {
      const pageSizeNum = parseInt(pageSize);
      if (isNaN(pageSizeNum) || pageSizeNum < 5 || pageSizeNum > 50) {
        return res.status(400).json({ error: 'invalid page size' });
      }
    }

    const movies = await mockMovieService.searchMovies({ page, pageSize });
    res.status(200).json({ movies });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('Movie Operations Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.verifyToken.mockResolvedValue({ isValid: true, userId: 1 });
    mockAuth.verifyAdminToken.mockResolvedValue({ isAdmin: true, userId: 1 });
    mockMovieService.searchMovies.mockResolvedValue([]);
    mockMovieService.getMovieById.mockResolvedValue({ id: 1, title: 'Test Movie' });
    mockMovieService.deleteMovie.mockResolvedValue(true);
    mockMovieService.rateMovie.mockResolvedValue({ isNewRating: true });
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Movie Search Tests', () => {
    describe('MOV-SRCH-007 - yearFrom > yearTo', () => {
      test('should return 400 when yearFrom is greater than yearTo', async () => {
        // Arrange
        const invalidQuery = '?yearFrom=2020&yearTo=2010';

        // Act
        const response = await request(app)
          .get(`/movies/search${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid range');
      });
    });

    describe('MOV-SRCH-009 - minRating = 0 (below range)', () => {
      test('should return 400 when minRating is 0', async () => {
        // Arrange
        const invalidQuery = '?minRating=0';

        // Act
        const response = await request(app)
          .get(`/movies/search${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'rating out of range');
      });
    });

    describe('MOV-SRCH-010 - minRating = 11 (above range)', () => {
      test('should return 400 when minRating is 11', async () => {
        // Arrange
        const invalidQuery = '?minRating=11';

        // Act
        const response = await request(app)
          .get(`/movies/search${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'rating out of range');
      });
    });

    describe('MOV-SRCH-011 - Invalid yearFrom format', () => {
      test('should return 400 when yearFrom is not a number', async () => {
        // Arrange
        const invalidQuery = '?yearFrom=abc';

        // Act
        const response = await request(app)
          .get(`/movies/search${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid type');
      });
    });

    describe('MOV-SRCH-012 - Invalid yearTo format', () => {
      test('should return 400 when yearTo is not a number', async () => {
        // Arrange
        const invalidQuery = '?yearTo=abc';

        // Act
        const response = await request(app)
          .get(`/movies/search${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid type');
      });
    });

    describe('MOV-SRCH-013 - Invalid genre value', () => {
      test('should return 400 when genre is not allowed', async () => {
        // Arrange
        const invalidQuery = '?genre=Sci-Fi';

        // Act
        const response = await request(app)
          .get(`/movies/search${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid genre');
      });
    });
  });

  describe('Get Movie by ID Tests', () => {
    describe('MOV-GET-003 - Invalid id format', () => {
      test('should return 400 when id is not a number', async () => {
        // Arrange
        // Act
        const response = await request(app)
          .get('/movies/abc');

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid ID format');
      });
    });

    describe('MOV-GET-004 - Negative id', () => {
      test('should return 400 when id is negative', async () => {
        // Arrange
        // Act
        const response = await request(app)
          .get('/movies/-1');

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid ID format');
      });
    });
  });

  describe('Delete Movie Tests', () => {
    describe('MOV-DEL-003 - Invalid id format', () => {
      test('should return 400 when id is not a number', async () => {
        // Arrange
        const adminHeaders = { authorization: 'Bearer admin-token' };

        // Act
        const response = await request(app)
          .delete('/movies/abc')
          .set(adminHeaders);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid ID format');
      });
    });
  });

  describe('Rate Movie Tests', () => {
    describe('RATE-001 - First-time rating', () => {
      test('should create rating successfully for logged-in user', async () => {
        // Arrange
        const ratingData = { rating: 8 };
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/10/rate')
          .set(userHeaders)
          .send(ratingData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Rating saved successfully');
        expect(mockMovieService.rateMovie).toHaveBeenCalledWith(10, 8, 1);
      });
    });

    describe('RATE-003 - Rating = 0 (below min)', () => {
      test('should return 400 when rating is 0', async () => {
        // Arrange
        const ratingData = { rating: 0 };
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/10/rate')
          .set(userHeaders)
          .send(ratingData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'rating out of range');
      });
    });

    describe('RATE-004 - Rating = 11 (above max)', () => {
      test('should return 400 when rating is 11', async () => {
        // Arrange
        const ratingData = { rating: 11 };
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/10/rate')
          .set(userHeaders)
          .send(ratingData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'rating out of range');
      });
    });

    describe('RATE-005 - Rating non-integer', () => {
      test('should return 400 when rating is not a number', async () => {
        // Arrange
        const ratingData = { rating: 'good' };
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/10/rate')
          .set(userHeaders)
          .send(ratingData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid rating format');
      });
    });

    describe('RATE-006 - Missing rating field', () => {
      test('should return 400 when rating field is missing', async () => {
        // Arrange
        const emptyData = {};
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/10/rate')
          .set(userHeaders)
          .send(emptyData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'rating required');
      });
    });

    describe('RATE-007 - Invalid movie id format', () => {
      test('should return 400 when movie id is not a number', async () => {
        // Arrange
        const ratingData = { rating: 8 };
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/abc/rate')
          .set(userHeaders)
          .send(ratingData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid ID format');
      });
    });

    describe('RATE-011 - Rating with whitespace', () => {
      test('should handle rating with whitespace', async () => {
        // Arrange
        const ratingData = { rating: ' 7 ' };
        const userHeaders = { authorization: 'Bearer user-token' };

        // Act
        const response = await request(app)
          .post('/movies/10/rate')
          .set(userHeaders)
          .send(ratingData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Rating saved successfully');
        expect(mockMovieService.rateMovie).toHaveBeenCalledWith(10, 7, 1);
      });
    });
  });

  describe('Pagination Tests', () => {
    describe('PAGE-003 - Page = 0 (below min)', () => {
      test('should return 400 when page is 0', async () => {
        // Arrange
        const invalidQuery = '?page=0';

        // Act
        const response = await request(app)
          .get(`/movies${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid page');
      });
    });

    describe('PAGE-004 - Negative page', () => {
      test('should return 400 when page is negative', async () => {
        // Arrange
        const invalidQuery = '?page=-1';

        // Act
        const response = await request(app)
          .get(`/movies${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid page');
      });
    });

    describe('PAGE-005 - Non-integer page', () => {
      test('should return 400 when page is not an integer', async () => {
        // Arrange
        const invalidQuery = '?page=one';

        // Act
        const response = await request(app)
          .get(`/movies${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid page');
      });
    });

    describe('PAGE-006 - Valid pageSize at minimum', () => {
      test('should return 200 when pageSize is 5', async () => {
        // Arrange
        const validQuery = '?pageSize=5';

        // Act
        const response = await request(app)
          .get(`/movies${validQuery}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('movies');
      });
    });

    describe('PAGE-007 - Valid pageSize at maximum', () => {
      test('should return 200 when pageSize is 50', async () => {
        // Arrange
        const validQuery = '?pageSize=50';

        // Act
        const response = await request(app)
          .get(`/movies${validQuery}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('movies');
      });
    });

    describe('PAGE-008 - pageSize below and above range', () => {
      test('should return 400 when pageSize is 4', async () => {
        // Arrange
        const invalidQuery = '?pageSize=4';

        // Act
        const response = await request(app)
          .get(`/movies${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid page size');
      });

      test('should return 400 when pageSize is 51', async () => {
        // Arrange
        const invalidQuery = '?pageSize=51';

        // Act
        const response = await request(app)
          .get(`/movies${invalidQuery}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'invalid page size');
      });
    });
  });
});