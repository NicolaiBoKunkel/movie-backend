/**
 * Data Transformer
 * Transforms TMDB API responses into the database schema format
 */

export interface TransformedData {
  Genre: any[];
  Collection: any[];
  Company: any[];
  Person: any[];
  MediaItem: any[];
  Movie: any[];
  TVShow: any[];
  Season: any[];
  Episode: any[];
  Actor: any[];
  CrewMember: any[];
  MediaGenre: any[];
  MediaCompany: any[];
  TitleCasting: any[];
  EpisodeCasting: any[];
  TitleCrewAssignment: any[];
  EpisodeCrewAssignment: any[];
}

export class DataTransformer {
  private genreMap: Map<number, number> = new Map();
  private collectionMap: Map<number, number> = new Map();
  private companyMap: Map<number, number> = new Map();
  private personMap: Map<number, number> = new Map();
  private mediaMap: Map<number, number> = new Map();
  private seasonMap: Map<string, number> = new Map();
  private episodeMap: Map<string, number> = new Map();

  // Auto-increment IDs
  private nextGenreId = 1;
  private nextCollectionId = 1;
  private nextCompanyId = 1;
  private nextPersonId = 1;
  private nextMediaId = 1;
  private nextSeasonId = 1;
  private nextEpisodeId = 1;
  private nextCastingId = 1;
  private nextEpisodeCastingId = 1;
  private nextCrewAssignmentId = 1;
  private nextEpisodeCrewAssignmentId = 1;

  private data: TransformedData = {
    Genre: [],
    Collection: [],
    Company: [],
    Person: [],
    MediaItem: [],
    Movie: [],
    TVShow: [],
    Season: [],
    Episode: [],
    Actor: [],
    CrewMember: [],
    MediaGenre: [],
    MediaCompany: [],
    TitleCasting: [],
    EpisodeCasting: [],
    TitleCrewAssignment: [],
    EpisodeCrewAssignment: [],
  };

  /**
   * Transform genres
   */
  transformGenres(movieGenres: any[], tvGenres: any[]): void {
    const allGenres = new Map<number, any>();

    // Merge movie and TV genres
    [...movieGenres, ...tvGenres].forEach((genre) => {
      if (!allGenres.has(genre.id)) {
        allGenres.set(genre.id, genre);
      }
    });

    allGenres.forEach((genre) => {
      const genreId = this.nextGenreId++;
      this.genreMap.set(genre.id, genreId);
      this.data.Genre.push({
        genre_id: genreId,
        name: genre.name,
      });
    });

    console.log(`✅ Transformed ${this.data.Genre.length} genres`);
  }

  /**
   * Transform a collection
   */
  transformCollection(collection: any): number | null {
    if (!collection || !collection.id) return null;

    if (this.collectionMap.has(collection.id)) {
      return this.collectionMap.get(collection.id)!;
    }

    const collectionId = this.nextCollectionId++;
    this.collectionMap.set(collection.id, collectionId);

    this.data.Collection.push({
      collection_id: collectionId,
      tmdb_id: collection.id,
      name: collection.name || '',
      overview: collection.overview || null,
      poster_path: collection.poster_path || null,
      backdrop_path: collection.backdrop_path || null,
    });

    return collectionId;
  }

  /**
   * Transform companies
   */
  transformCompanies(companies: any[]): number[] {
    if (!companies || companies.length === 0) return [];

    return companies.map((company) => {
      if (this.companyMap.has(company.id)) {
        return this.companyMap.get(company.id)!;
      }

      const companyId = this.nextCompanyId++;
      this.companyMap.set(company.id, companyId);

      this.data.Company.push({
        company_id: companyId,
        tmdb_id: company.id,
        name: company.name || '',
        origin_country: company.origin_country || null,
        description: null,
        logo_path: company.logo_path || null,
      });

      return companyId;
    });
  }

  /**
   * Transform a person (cast or crew member)
   */
  transformPerson(person: any, fullDetails?: any): number {
    if (this.personMap.has(person.id)) {
      return this.personMap.get(person.id)!;
    }

    const personId = this.nextPersonId++;
    this.personMap.set(person.id, personId);

    const details = fullDetails || person;

    this.data.Person.push({
      person_id: personId,
      tmdb_id: person.id,
      name: person.name || details.name || '',
      gender: person.gender !== undefined ? person.gender : (details.gender || null),
      biography: details.biography || null,
      birth_date: details.birthday || null,
      death_date: details.deathday || null,
      place_of_birth: details.place_of_birth || null,
      profile_path: person.profile_path || details.profile_path || null,
    });

    return personId;
  }

  /**
   * Transform a movie
   */
  transformMovie(movie: any, details: any): void {
    const mediaId = this.nextMediaId++;
    this.mediaMap.set(movie.id, mediaId);

    // MediaItem
    this.data.MediaItem.push({
      media_id: mediaId,
      tmdb_id: movie.id,
      media_type: 'movie',
      original_title: details.original_title || movie.original_title || movie.title || '',
      overview: details.overview || movie.overview || null,
      original_language: details.original_language || movie.original_language || null,
      status: details.status || 'Released',
      popularity: details.popularity || movie.popularity || 0,
      vote_average: details.vote_average || movie.vote_average || 0,
      vote_count: details.vote_count || movie.vote_count || 0,
      poster_path: details.poster_path || movie.poster_path || null,
      backdrop_path: details.backdrop_path || movie.backdrop_path || null,
      homepage_url: details.homepage || null,
    });

    // Collection
    let collectionId = null;
    if (details.belongs_to_collection) {
      collectionId = this.transformCollection(details.belongs_to_collection);
    }

    // Movie
    this.data.Movie.push({
      media_id: mediaId,
      release_date: details.release_date || movie.release_date || null,
      budget: details.budget || 0,
      revenue: details.revenue || 0,
      adult_flag: details.adult || movie.adult || false,
      runtime_minutes: details.runtime || null,
      collection_id: collectionId,
    });

    // Genres
    if (details.genres && details.genres.length > 0) {
      details.genres.forEach((genre: any) => {
        const genreId = this.genreMap.get(genre.id);
        if (genreId) {
          this.data.MediaGenre.push({
            media_id: mediaId,
            genre_id: genreId,
          });
        }
      });
    } else if (movie.genre_ids && movie.genre_ids.length > 0) {
      movie.genre_ids.forEach((tmdbGenreId: number) => {
        const genreId = this.genreMap.get(tmdbGenreId);
        if (genreId) {
          this.data.MediaGenre.push({
            media_id: mediaId,
            genre_id: genreId,
          });
        }
      });
    }

    // Production Companies
    if (details.production_companies && details.production_companies.length > 0) {
      const companyIds = this.transformCompanies(details.production_companies);
      companyIds.forEach((companyId) => {
        this.data.MediaCompany.push({
          media_id: mediaId,
          company_id: companyId,
          role: 'production',
        });
      });
    }

    // Cast
    if (details.credits && details.credits.cast) {
      details.credits.cast.slice(0, 20).forEach((cast: any, index: number) => {
        const personId = this.transformPerson(cast);

        // Add to Actor table if not exists
        if (!this.data.Actor.find((a: any) => a.person_id === personId)) {
          this.data.Actor.push({
            person_id: personId,
            acting_debut_year: null,
          });
        }

        // Add casting
        this.data.TitleCasting.push({
          casting_id: this.nextCastingId++,
          media_id: mediaId,
          person_id: personId,
          character_name: cast.character || null,
          cast_order: cast.order !== undefined ? cast.order : index,
        });
      });
    }

    // Crew
    if (details.credits && details.credits.crew) {
      details.credits.crew.slice(0, 30).forEach((crew: any) => {
        const personId = this.transformPerson(crew);

        // Add to CrewMember table if not exists
        if (!this.data.CrewMember.find((c: any) => c.person_id === personId)) {
          this.data.CrewMember.push({
            person_id: personId,
            primary_department: crew.department || null,
          });
        }

        // Add crew assignment
        this.data.TitleCrewAssignment.push({
          crew_assignment_id: this.nextCrewAssignmentId++,
          media_id: mediaId,
          person_id: personId,
          department: crew.department || null,
          job_title: crew.job || null,
        });
      });
    }
  }

  /**
   * Transform a TV show
   */
  transformTVShow(tvShow: any, details: any, seasons: any[]): void {
    const mediaId = this.nextMediaId++;
    this.mediaMap.set(tvShow.id, mediaId);

    // MediaItem
    this.data.MediaItem.push({
      media_id: mediaId,
      tmdb_id: tvShow.id,
      media_type: 'tv',
      original_title: details.original_name || tvShow.original_name || tvShow.name || '',
      overview: details.overview || tvShow.overview || null,
      original_language: details.original_language || tvShow.original_language || null,
      status: details.status || 'Returning Series',
      popularity: details.popularity || tvShow.popularity || 0,
      vote_average: details.vote_average || tvShow.vote_average || 0,
      vote_count: details.vote_count || tvShow.vote_count || 0,
      poster_path: details.poster_path || tvShow.poster_path || null,
      backdrop_path: details.backdrop_path || tvShow.backdrop_path || null,
      homepage_url: details.homepage || null,
    });

    // TVShow
    this.data.TVShow.push({
      media_id: mediaId,
      first_air_date: details.first_air_date || tvShow.first_air_date || null,
      last_air_date: details.last_air_date || null,
      in_production: details.in_production || false,
      number_of_seasons: details.number_of_seasons || 0,
      number_of_episodes: details.number_of_episodes || 0,
      show_type: details.type || null,
    });

    // Genres
    if (details.genres && details.genres.length > 0) {
      details.genres.forEach((genre: any) => {
        const genreId = this.genreMap.get(genre.id);
        if (genreId) {
          this.data.MediaGenre.push({
            media_id: mediaId,
            genre_id: genreId,
          });
        }
      });
    } else if (tvShow.genre_ids && tvShow.genre_ids.length > 0) {
      tvShow.genre_ids.forEach((tmdbGenreId: number) => {
        const genreId = this.genreMap.get(tmdbGenreId);
        if (genreId) {
          this.data.MediaGenre.push({
            media_id: mediaId,
            genre_id: genreId,
          });
        }
      });
    }

    // Production Companies
    if (details.production_companies && details.production_companies.length > 0) {
      const companyIds = this.transformCompanies(details.production_companies);
      companyIds.forEach((companyId) => {
        this.data.MediaCompany.push({
          media_id: mediaId,
          company_id: companyId,
          role: 'production',
        });
      });
    }

    // Networks
    if (details.networks && details.networks.length > 0) {
      const networkIds = this.transformCompanies(details.networks);
      networkIds.forEach((companyId) => {
        this.data.MediaCompany.push({
          media_id: mediaId,
          company_id: companyId,
          role: 'network',
        });
      });
    }

    // Cast
    if (details.credits && details.credits.cast) {
      details.credits.cast.slice(0, 20).forEach((cast: any, index: number) => {
        const personId = this.transformPerson(cast);

        // Add to Actor table if not exists
        if (!this.data.Actor.find((a: any) => a.person_id === personId)) {
          this.data.Actor.push({
            person_id: personId,
            acting_debut_year: null,
          });
        }

        // Add casting
        this.data.TitleCasting.push({
          casting_id: this.nextCastingId++,
          media_id: mediaId,
          person_id: personId,
          character_name: cast.character || null,
          cast_order: cast.order !== undefined ? cast.order : index,
        });
      });
    }

    // Crew
    if (details.credits && details.credits.crew) {
      details.credits.crew.slice(0, 30).forEach((crew: any) => {
        const personId = this.transformPerson(crew);

        // Add to CrewMember table if not exists
        if (!this.data.CrewMember.find((c: any) => c.person_id === personId)) {
          this.data.CrewMember.push({
            person_id: personId,
            primary_department: crew.department || null,
          });
        }

        // Add crew assignment
        this.data.TitleCrewAssignment.push({
          crew_assignment_id: this.nextCrewAssignmentId++,
          media_id: mediaId,
          person_id: personId,
          department: crew.department || null,
          job_title: crew.job || null,
        });
      });
    }

    // Seasons and Episodes
    seasons.forEach((seasonDetails) => {
      if (!seasonDetails || seasonDetails.season_number === undefined) return;

      const seasonId = this.nextSeasonId++;
      const seasonKey = `${tvShow.id}-${seasonDetails.season_number}`;
      this.seasonMap.set(seasonKey, seasonId);

      this.data.Season.push({
        season_id: seasonId,
        tv_media_id: mediaId,
        season_number: seasonDetails.season_number,
        name: seasonDetails.name || `Season ${seasonDetails.season_number}`,
        air_date: seasonDetails.air_date || null,
        episode_count: seasonDetails.episodes ? seasonDetails.episodes.length : 0,
        poster_path: seasonDetails.poster_path || null,
      });

      // Episodes
      if (seasonDetails.episodes && seasonDetails.episodes.length > 0) {
        seasonDetails.episodes.forEach((episode: any) => {
          const episodeId = this.nextEpisodeId++;
          const episodeKey = `${tvShow.id}-${seasonDetails.season_number}-${episode.episode_number}`;
          this.episodeMap.set(episodeKey, episodeId);

          this.data.Episode.push({
            episode_id: episodeId,
            season_id: seasonId,
            episode_number: episode.episode_number,
            name: episode.name || `Episode ${episode.episode_number}`,
            air_date: episode.air_date || null,
            runtime_minutes: episode.runtime || null,
            overview: episode.overview || null,
            still_path: episode.still_path || null,
          });

          // Episode Cast
          if (episode.credits && episode.credits.cast) {
            episode.credits.cast.slice(0, 10).forEach((cast: any, index: number) => {
              const personId = this.transformPerson(cast);

              // Add to Actor table if not exists
              if (!this.data.Actor.find((a: any) => a.person_id === personId)) {
                this.data.Actor.push({
                  person_id: personId,
                  acting_debut_year: null,
                });
              }

              // Add episode casting
              this.data.EpisodeCasting.push({
                casting_id: this.nextEpisodeCastingId++,
                episode_id: episodeId,
                person_id: personId,
                character_name: cast.character || null,
                cast_order: cast.order !== undefined ? cast.order : index,
              });
            });
          }

          // Episode Crew
          if (episode.credits && episode.credits.crew) {
            episode.credits.crew.slice(0, 15).forEach((crew: any) => {
              const personId = this.transformPerson(crew);

              // Add to CrewMember table if not exists
              if (!this.data.CrewMember.find((c: any) => c.person_id === personId)) {
                this.data.CrewMember.push({
                  person_id: personId,
                  primary_department: crew.department || null,
                });
              }

              // Add episode crew assignment
              this.data.EpisodeCrewAssignment.push({
                crew_assignment_id: this.nextEpisodeCrewAssignmentId++,
                episode_id: episodeId,
                person_id: personId,
                department: crew.department || null,
                job_title: crew.job || null,
              });
            });
          }
        });
      }
    });
  }

  /**
   * Get all transformed data
   */
  getData(): TransformedData {
    return this.data;
  }

  /**
   * Print statistics
   */
  printStats(): void {
    console.log('\n📊 Transformation Statistics:');
    console.log(`  Genres: ${this.data.Genre.length}`);
    console.log(`  Collections: ${this.data.Collection.length}`);
    console.log(`  Companies: ${this.data.Company.length}`);
    console.log(`  Persons: ${this.data.Person.length}`);
    console.log(`  Media Items: ${this.data.MediaItem.length}`);
    console.log(`  Movies: ${this.data.Movie.length}`);
    console.log(`  TV Shows: ${this.data.TVShow.length}`);
    console.log(`  Seasons: ${this.data.Season.length}`);
    console.log(`  Episodes: ${this.data.Episode.length}`);
    console.log(`  Actors: ${this.data.Actor.length}`);
    console.log(`  Crew Members: ${this.data.CrewMember.length}`);
    console.log(`  Media-Genre Relations: ${this.data.MediaGenre.length}`);
    console.log(`  Media-Company Relations: ${this.data.MediaCompany.length}`);
    console.log(`  Title Castings: ${this.data.TitleCasting.length}`);
    console.log(`  Episode Castings: ${this.data.EpisodeCasting.length}`);
    console.log(`  Title Crew Assignments: ${this.data.TitleCrewAssignment.length}`);
    console.log(`  Episode Crew Assignments: ${this.data.EpisodeCrewAssignment.length}`);
  }
}
