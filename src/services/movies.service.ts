import { prisma } from '../db/prisma';
import { MediaItem, Movie, Prisma } from '@prisma/client';

// Type for Movie with MediaItem included
export type MovieWithMediaItem = Movie & {
  mediaItem: MediaItem & {
    mediaGenres?: Array<{ genre: { name: string } }>;
    mediaCompanies?: Array<{ company: { name: string }; role: string }>;
  };
};

export class MoviesService {
  /**
   * Get all movies with basic information
   */
  async getAllMovies(limit = 50, offset = 0): Promise<MovieWithMediaItem[]> {
    return prisma.movie.findMany({
      take: limit,
      skip: offset,
      include: {
        mediaItem: {
          include: {
            mediaGenres: {
              include: {
                genre: true
              }
            },
            mediaCompanies: {
              include: {
                company: true
              }
            }
          }
        }
      },
      orderBy: {
        mediaItem: {
          popularity: 'desc'
        }
      }
    });
  }

  /**
   * Get a single movie by ID
   */
  async getMovieById(movieId: bigint): Promise<MovieWithMediaItem | null> {
    return prisma.movie.findUnique({
      where: { mediaId: movieId },
      include: {
        mediaItem: {
          include: {
            mediaGenres: {
              include: {
                genre: true
              }
            },
            mediaCompanies: {
              include: {
                company: true
              }
            },
            titleCastings: {
              include: {
                actor: {
                  include: {
                    person: true
                  }
                }
              },
              orderBy: {
                castOrder: 'asc'
              },
              take: 10 // Limit to top 10 cast members
            }
          }
        },
        collection: true
      }
    });
  }

  /**
   * Search movies by title
   */
  async searchMovies(searchTerm: string, limit = 20): Promise<MovieWithMediaItem[]> {
    return prisma.movie.findMany({
      where: {
        mediaItem: {
          originalTitle: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      },
      take: limit,
      include: {
        mediaItem: {
          include: {
            mediaGenres: {
              include: {
                genre: true
              }
            }
          }
        }
      },
      orderBy: {
        mediaItem: {
          popularity: 'desc'
        }
      }
    });
  }

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreName: string, limit = 20): Promise<MovieWithMediaItem[]> {
    return prisma.movie.findMany({
      where: {
        mediaItem: {
          mediaGenres: {
            some: {
              genre: {
                name: {
                  equals: genreName,
                  mode: 'insensitive'
                }
              }
            }
          }
        }
      },
      take: limit,
      include: {
        mediaItem: {
          include: {
            mediaGenres: {
              include: {
                genre: true
              }
            }
          }
        }
      },
      orderBy: {
        mediaItem: {
          voteAverage: 'desc'
        }
      }
    });
  }

  /**
   * Create a new movie (with media item)
   */
  async createMovie(movieData: {
    tmdbId?: bigint;
    originalTitle: string;
    overview?: string;
    originalLanguage?: string;
    releaseDate?: Date;
    budget?: bigint;
    revenue?: bigint;
    runtime?: number;
    genreIds?: bigint[];
  }): Promise<MovieWithMediaItem> {
    const { genreIds, ...movieInfo } = movieData;

    // Generate a unique mediaId
    const maxMediaId = await prisma.mediaItem.findFirst({
      orderBy: { mediaId: 'desc' },
      select: { mediaId: true }
    });
    const newMediaId = maxMediaId ? maxMediaId.mediaId + 1n : 1n;

    return prisma.movie.create({
      data: {
        mediaId: newMediaId,
        mediaItem: {
          create: {
            mediaId: newMediaId,
            tmdbId: movieInfo.tmdbId ?? null,
            mediaType: 'movie',
            originalTitle: movieInfo.originalTitle,
            overview: movieInfo.overview ?? null,
            originalLanguage: movieInfo.originalLanguage ?? null,
            ...(genreIds && {
              mediaGenres: {
                create: genreIds.map(genreId => ({
                  genreId
                }))
              }
            })
          }
        },
        releaseDate: movieInfo.releaseDate ?? null,
        budget: movieInfo.budget ?? 0n,
        revenue: movieInfo.revenue ?? 0n,
        runtimeMinutes: movieInfo.runtime ?? null
      },
      include: {
        mediaItem: {
          include: {
            mediaGenres: {
              include: {
                genre: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Update movie information
   */
  async updateMovie(movieId: bigint, updateData: Partial<{
    originalTitle: string;
    overview: string;
    releaseDate: Date;
    budget: bigint;
    revenue: bigint;
    runtime: number;
  }>): Promise<MovieWithMediaItem | null> {
    const { originalTitle, overview, ...movieFields } = updateData;

    return prisma.movie.update({
      where: { mediaId: movieId },
      data: {
        ...movieFields,
        ...(updateData.runtime !== undefined && { runtimeMinutes: updateData.runtime }),
        ...(originalTitle || overview ? {
          mediaItem: {
            update: {
              ...(originalTitle && { originalTitle }),
              ...(overview && { overview })
            }
          }
        } : {})
      },
      include: {
        mediaItem: {
          include: {
            mediaGenres: {
              include: {
                genre: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Delete a movie
   */
  async deleteMovie(movieId: bigint): Promise<boolean> {
    try {
      await prisma.movie.delete({
        where: { mediaId: movieId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting movie:', error);
      return false;
    }
  }

  /**
   * Get movie statistics
   */
  async getMovieStats() {
    const [totalMovies, avgRating, topGenres] = await Promise.all([
      prisma.movie.count(),
      prisma.mediaItem.aggregate({
        where: { mediaType: 'movie' },
        _avg: { voteAverage: true }
      }),
      prisma.genre.findMany({
        include: {
          _count: {
            select: {
              mediaGenres: {
                where: {
                  mediaItem: {
                    mediaType: 'movie'
                  }
                }
              }
            }
          }
        },
        orderBy: {
          mediaGenres: {
            _count: 'desc'
          }
        },
        take: 5
      })
    ]);

    return {
      totalMovies,
      averageRating: avgRating._avg.voteAverage,
      topGenres: topGenres.map(genre => ({
        name: genre.name,
        movieCount: genre._count.mediaGenres
      }))
    };
  }
}