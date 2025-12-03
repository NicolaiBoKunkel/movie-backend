/**
 * TMDB API Client
 * Handles all API requests to The Movie Database
 */
import axios, { AxiosInstance } from 'axios';
import PQueue from 'p-queue';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export class TMDBClient {
  private client: AxiosInstance;
  private queue: PQueue;
  private apiKey: string;

  constructor(apiKey: string, requestsPerSecond: number = 40) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: TMDB_BASE_URL,
      params: {
        api_key: apiKey,
      },
    });

    // Rate limiting queue
    this.queue = new PQueue({
      interval: 1000,
      intervalCap: requestsPerSecond,
    });
  }

  /**
   * Fetch popular movies with pagination
   */
  async fetchPopularMovies(maxPages: number = 25): Promise<any[]> {
    console.log(`📽️  Fetching popular movies (up to ${maxPages} pages)...`);
    const movies: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await this.queue.add(() =>
          this.client.get('/movie/popular', { params: { page } })
        );
        movies.push(...response!.data.results);
        console.log(`   Page ${page}/${maxPages} - ${response!.data.results.length} movies`);
        
        if (page >= response!.data.total_pages) break;
      } catch (error: any) {
        console.error(`Error fetching movies page ${page}:`, error.message);
        break;
      }
    }

    return movies;
  }

  /**
   * Fetch movie details including cast, crew, and more
   */
  async fetchMovieDetails(movieId: number): Promise<any> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.get(`/movie/${movieId}`, {
          params: {
            append_to_response: 'credits,production_companies,belongs_to_collection',
          },
        });
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching movie ${movieId}:`, error.message);
        return null;
      }
    });
  }

  /**
   * Fetch popular TV shows with pagination
   */
  async fetchPopularTVShows(maxPages: number = 25): Promise<any[]> {
    console.log(`📺 Fetching popular TV shows (up to ${maxPages} pages)...`);
    const tvShows: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await this.queue.add(() =>
          this.client.get('/tv/popular', { params: { page } })
        );
        tvShows.push(...response!.data.results);
        console.log(`   Page ${page}/${maxPages} - ${response!.data.results.length} TV shows`);
        
        if (page >= response!.data.total_pages) break;
      } catch (error: any) {
        console.error(`Error fetching TV shows page ${page}:`, error.message);
        break;
      }
    }

    return tvShows;
  }

  /**
   * Fetch TV show details including cast, crew, seasons, and episodes
   */
  async fetchTVShowDetails(tvId: number): Promise<any> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.get(`/tv/${tvId}`, {
          params: {
            append_to_response: 'credits,production_companies,seasons',
          },
        });
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching TV show ${tvId}:`, error.message);
        return null;
      }
    });
  }

  /**
   * Fetch season details including episodes
   */
  async fetchSeasonDetails(tvId: number, seasonNumber: number): Promise<any> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.get(`/tv/${tvId}/season/${seasonNumber}`, {
          params: {
            append_to_response: 'credits',
          },
        });
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching season ${seasonNumber} of TV show ${tvId}:`, error.message);
        return null;
      }
    });
  }

  /**
   * Fetch person details
   */
  async fetchPersonDetails(personId: number): Promise<any> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.get(`/person/${personId}`);
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching person ${personId}:`, error.message);
        return null;
      }
    });
  }

  /**
   * Fetch all genres for movies and TV shows
   */
  async fetchGenres(): Promise<{ movies: any[]; tv: any[] }> {
    console.log(`🎭 Fetching genres...`);
    try {
      const [movieGenres, tvGenres] = await Promise.all([
        this.queue.add(() => this.client.get('/genre/movie/list')),
        this.queue.add(() => this.client.get('/genre/tv/list')),
      ]);

      return {
        movies: movieGenres!.data.genres,
        tv: tvGenres!.data.genres,
      };
    } catch (error: any) {
      console.error('Error fetching genres:', error.message);
      return { movies: [], tv: [] };
    }
  }

  /**
   * Fetch collection details
   */
  async fetchCollectionDetails(collectionId: number): Promise<any> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.get(`/collection/${collectionId}`);
        return response.data;
      } catch (error: any) {
        console.error(`Error fetching collection ${collectionId}:`, error.message);
        return null;
      }
    });
  }

  /**
   * Get the queue size for monitoring
   */
  getQueueSize(): number {
    return this.queue.size + this.queue.pending;
  }
}
