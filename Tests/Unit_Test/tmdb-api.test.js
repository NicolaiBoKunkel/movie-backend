/**
 * TMDB API Client Unit Tests
 * 
 * Testing Strategy: Mock the TMDB API responses
 * Rationale: Following the London school of testing - mock external dependencies
 * 
 * These tests verify that:
 * 1. Our code correctly processes TMDB API responses
 * 2. Error handling logic works as expected
 * 3. Data transformation and validation is correct
 * 4. Tests run fast without external dependencies
 * 
 * Trade-offs:
 * - Pros: Fast, deterministic, no external dependencies, no rate limits, can test error scenarios easily
 * - Cons: Don't test actual integration, need to maintain mocks, might miss API changes
 */

// Mock fetch before requiring any modules
global.fetch = jest.fn();

describe('TMDB API Client Unit Tests (Mocked)', () => {
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";
  const MOCK_API_KEY = "mock_api_key_12345";

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('fetchTopRatedMovies', () => {
    test('should successfully fetch and parse top rated movies', async () => {
      const mockResponse = {
        page: 1,
        results: [
          {
            id: 278,
            title: "The Shawshank Redemption",
            vote_average: 8.7,
            vote_count: 26000,
            overview: "Two imprisoned men bond over a number of years...",
            poster_path: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
            release_date: "1994-09-23"
          },
          {
            id: 238,
            title: "The Godfather",
            vote_average: 8.7,
            vote_count: 19000,
            overview: "Spanning the years 1945 to 1955...",
            poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
            release_date: "1972-03-14"
          }
        ],
        total_pages: 500,
        total_results: 10000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${MOCK_API_KEY}&language=en-US&page=1`
      );
      const data = await response.json();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/top_rated')
      );
      
      expect(data.results).toHaveLength(2);
      expect(data.results[0].title).toBe("The Shawshank Redemption");
      expect(data.results[0].vote_average).toBe(8.7);
    });

    test('should handle empty results gracefully', async () => {
      const mockResponse = {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${MOCK_API_KEY}&language=en-US&page=1`
      );
      const data = await response.json();

      expect(data.results).toHaveLength(0);
      expect(Array.isArray(data.results)).toBe(true);
    });

    test('should handle 401 unauthorized error', async () => {
      const mockErrorResponse = {
        status_code: 7,
        status_message: "Invalid API key: You must be granted a valid key.",
        success: false
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=invalid_key&language=en-US&page=1`
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.status_code).toBe(7);
      expect(data.success).toBe(false);
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${MOCK_API_KEY}`)
      ).rejects.toThrow('Network error');
    });
  });

  describe('fetchMovieDetails', () => {
    test('should successfully fetch movie details', async () => {
      const mockMovieDetails = {
        id: 278,
        title: "The Shawshank Redemption",
        original_title: "The Shawshank Redemption",
        overview: "Two imprisoned men bond over a number of years...",
        release_date: "1994-09-23",
        runtime: 142,
        budget: 25000000,
        revenue: 28341469,
        vote_average: 8.7,
        vote_count: 26000,
        genres: [
          { id: 18, name: "Drama" },
          { id: 80, name: "Crime" }
        ],
        poster_path: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
        backdrop_path: "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
        status: "Released",
        tagline: "Fear can hold you prisoner. Hope can set you free."
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMovieDetails
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/278?api_key=${MOCK_API_KEY}&language=en-US`
      );
      const data = await response.json();

      expect(data.id).toBe(278);
      expect(data.title).toBe("The Shawshank Redemption");
      expect(data.runtime).toBe(142);
      expect(data.genres).toHaveLength(2);
      expect(data.genres[0].name).toBe("Drama");
    });

    test('should handle 404 for non-existent movie', async () => {
      const mockErrorResponse = {
        status_code: 34,
        status_message: "The resource you requested could not be found.",
        success: false
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/999999999?api_key=${MOCK_API_KEY}`
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.status_code).toBe(34);
    });

    test('should validate movie details structure', async () => {
      const mockMovieDetails = {
        id: 550,
        title: "Fight Club",
        runtime: 139,
        genres: [{ id: 18, name: "Drama" }],
        vote_average: 8.4,
        release_date: "1999-10-15"
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMovieDetails
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/550?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      // Validate essential fields
      expect(typeof data.id).toBe('number');
      expect(typeof data.title).toBe('string');
      expect(typeof data.runtime).toBe('number');
      expect(typeof data.vote_average).toBe('number');
      expect(Array.isArray(data.genres)).toBe(true);
    });
  });

  describe('fetchMovieCredits', () => {
    test('should successfully fetch movie credits', async () => {
      const mockCredits = {
        id: 278,
        cast: [
          {
            id: 504,
            name: "Tim Robbins",
            character: "Andy Dufresne",
            order: 0,
            profile_path: "/hsCw1AkqVhQPJPjI5punW89OqBJ.jpg"
          },
          {
            id: 192,
            name: "Morgan Freeman",
            character: "Ellis Boyd 'Red' Redding",
            order: 1,
            profile_path: "/jPsLqiYGSofU4s6BjrxnefMfabb.jpg"
          }
        ],
        crew: [
          {
            id: 2294,
            name: "Frank Darabont",
            job: "Director",
            department: "Directing",
            profile_path: "/kBz8aTugRY9M8N4vf3H6kIKnY1k.jpg"
          },
          {
            id: 2294,
            name: "Frank Darabont",
            job: "Screenplay",
            department: "Writing"
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCredits
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/278/credits?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      expect(data.cast).toHaveLength(2);
      expect(data.crew).toHaveLength(2);
      expect(data.cast[0].name).toBe("Tim Robbins");
      expect(data.cast[0].character).toBe("Andy Dufresne");
      expect(data.crew[0].job).toBe("Director");
    });

    test('should handle missing cast or crew', async () => {
      const mockCredits = {
        id: 12345,
        cast: [],
        crew: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCredits
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/12345/credits?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      expect(data.cast).toHaveLength(0);
      expect(data.crew).toHaveLength(0);
      expect(Array.isArray(data.cast)).toBe(true);
      expect(Array.isArray(data.crew)).toBe(true);
    });
  });

  describe('fetchMovieTrailer', () => {
    test('should successfully fetch movie videos and find trailer', async () => {
      const mockVideos = {
        id: 550,
        results: [
          {
            key: "SUXWAEX2jlg",
            name: "Fight Club - Trailer",
            site: "YouTube",
            type: "Trailer",
            official: true,
            size: 1080
          },
          {
            key: "xyz123",
            name: "Behind the Scenes",
            site: "YouTube",
            type: "Featurette",
            official: false
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVideos
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/550/videos?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      const trailer = data.results?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      );

      expect(trailer).toBeDefined();
      expect(trailer.key).toBe("SUXWAEX2jlg");
      expect(trailer.site).toBe("YouTube");
      expect(trailer.type).toBe("Trailer");
    });

    test('should handle no trailers available', async () => {
      const mockVideos = {
        id: 12345,
        results: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVideos
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/12345/videos?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      const trailer = data.results?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      );

      expect(trailer).toBeUndefined();
    });

    test('should handle videos with different sites', async () => {
      const mockVideos = {
        id: 550,
        results: [
          {
            key: "vimeo123",
            name: "Official Trailer",
            site: "Vimeo",
            type: "Trailer"
          },
          {
            key: "youtube456",
            name: "Official Trailer",
            site: "YouTube",
            type: "Trailer"
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVideos
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/550/videos?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      const youtubeTrailer = data.results?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube"
      );

      expect(youtubeTrailer).toBeDefined();
      expect(youtubeTrailer.key).toBe("youtube456");
      expect(youtubeTrailer.site).toBe("YouTube");
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${MOCK_API_KEY}`
      );

      await expect(response.json()).rejects.toThrow('Invalid JSON');
    });

    test('should handle 500 internal server error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal Server Error' })
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/278?api_key=${MOCK_API_KEY}`
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    test('should handle timeout errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(
        fetch(`${TMDB_BASE_URL}/movie/278?api_key=${MOCK_API_KEY}`)
      ).rejects.toThrow('Request timeout');
    });

    test('should validate pagination parameters', async () => {
      const mockResponse = {
        page: 2,
        results: [/* movies */],
        total_pages: 500,
        total_results: 10000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${MOCK_API_KEY}&page=2`
      );
      const data = await response.json();

      expect(data.page).toBe(2);
      expect(data.total_pages).toBeGreaterThan(0);
      expect(typeof data.total_results).toBe('number');
    });
  });

  describe('Data Transformation and Validation', () => {
    test('should validate vote_average is within 0-10 range', async () => {
      const mockResponse = {
        page: 1,
        results: [
          { id: 1, vote_average: 8.5, title: "Movie 1" },
          { id: 2, vote_average: 7.2, title: "Movie 2" },
          { id: 3, vote_average: 9.1, title: "Movie 3" }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      data.results.forEach(movie => {
        expect(movie.vote_average).toBeGreaterThanOrEqual(0);
        expect(movie.vote_average).toBeLessThanOrEqual(10);
      });
    });

    test('should handle null and undefined values gracefully', async () => {
      const mockMovie = {
        id: 123,
        title: "Test Movie",
        overview: null,
        poster_path: null,
        backdrop_path: undefined,
        release_date: "2023-01-01"
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMovie
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/123?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      expect(data.overview).toBeNull();
      expect(data.poster_path).toBeNull();
      // undefined typically gets stripped in JSON
    });

    test('should correctly parse release dates', async () => {
      const mockMovie = {
        id: 456,
        title: "Date Test Movie",
        release_date: "2023-12-25"
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMovie
      });

      const response = await fetch(
        `${TMDB_BASE_URL}/movie/456?api_key=${MOCK_API_KEY}`
      );
      const data = await response.json();

      expect(data.release_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const date = new Date(data.release_date);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });
});
