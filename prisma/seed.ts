/**
 * Comprehensive Prisma-based database seeder
 * Reads JSON files from the seed_Data directory and populates the PostgreSQL database
 * Uses Prisma ORM for type-safe database operations and transaction handling
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface SeedData {
  [tableName: string]: any[] | undefined;
}

/**
 * Load JSON data from the seed_Data directory
 */
async function loadSeedData(): Promise<SeedData> {
  const seedDataPath = path.resolve(__dirname, '..', 'db', 'sql', 'seed_Data');
  const data: SeedData = {};
  
  const jsonFiles = [
    'Genre.json',
    'Collection.json', 
    'Company.json',
    'Person.json',
    'MediaItem.json',
    'Movie.json',
    'TVShow.json',
    'Season.json',
    'Episode.json',
    'Actor.json',
    'CrewMember.json',
    'MediaGenre.json',
    'MediaCompany.json',
    'TitleCasting.json',
    'EpisodeCasting.json',
    'TitleCrewAssignment.json',
    'EpisodeCrewAssignment.json'
  ];

  for (const fileName of jsonFiles) {
    const filePath = path.join(seedDataPath, fileName);
    const tableName = fileName.replace('.json', '');
    
    if (existsSync(filePath)) {
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        data[tableName] = jsonData[tableName] || [];
        console.log(`✅ Loaded ${data[tableName]!.length} records from ${fileName}`);
      } catch (error) {
        console.error(`❌ Error loading ${fileName}:`, error);
        throw error;
      }
    } else {
      console.warn(`⚠️ File not found: ${fileName}`);
      data[tableName] = [];
    }
  }

  return data;
}

/**
 * Clear all existing data from the database
 */
async function clearDatabase(): Promise<void> {
  console.log('🧹 Clearing existing data...');
  
  try {
    await prisma.$transaction([
      // Clear in reverse dependency order
      prisma.titleCrewAssignment.deleteMany(),
      prisma.episodeCrewAssignment.deleteMany(),
      prisma.episodeCasting.deleteMany(),
      prisma.titleCasting.deleteMany(),
      prisma.mediaCompany.deleteMany(),
      prisma.mediaGenre.deleteMany(),
      prisma.crewMember.deleteMany(),
      prisma.actor.deleteMany(),
      prisma.episode.deleteMany(),
      prisma.season.deleteMany(),
      prisma.tVShow.deleteMany(),
      prisma.movie.deleteMany(),
      prisma.mediaItem.deleteMany(),
      prisma.person.deleteMany(),
      prisma.company.deleteMany(),
      prisma.collection.deleteMany(),
      prisma.genre.deleteMany(),
    ]);
    
    console.log('✅ Existing data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

/**
 * Transform and validate data before insertion
 */
function transformData(data: any[], tableName: string): any[] {
  return data.map(record => {
    const transformed = { ...record };
    
    // Convert date strings to Date objects
    for (const [key, value] of Object.entries(transformed)) {
      if (typeof value === 'string' && (key.includes('date') || key.includes('Date'))) {
        if (value && value !== '' && value !== 'null') {
          transformed[key] = new Date(value as string);
        } else {
          transformed[key] = null;
        }
      }
      
      // Convert string 'null' to actual null
      if (value === 'null' || value === '') {
        transformed[key] = null;
      }
      
      // Convert numeric strings to appropriate types for ID fields
      if (key.includes('id') || key.includes('Id') || key === 'budget' || key === 'revenue') {
        if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
          transformed[key] = BigInt(value);
        }
      }
      
      // Convert numeric fields
      if (['popularity', 'voteAverage', 'vote_average'].includes(key)) {
        if (typeof value === 'string' && !isNaN(Number(value))) {
          transformed[key] = parseFloat(value);
        }
      }
      
      if (['voteCount', 'vote_count', 'castOrder', 'cast_order', 'episodeCount', 'episode_count', 'numberOfSeasons', 'number_of_seasons', 'numberOfEpisodes', 'number_of_episodes', 'runtimeMinutes', 'runtime_minutes', 'episodeNumber', 'episode_number', 'seasonNumber', 'season_number', 'gender', 'actingDebutYear', 'acting_debut_year'].includes(key)) {
        if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
          transformed[key] = parseInt(value);
        }
      }
      
      // Convert boolean fields
      if (['adultFlag', 'adult_flag', 'inProduction', 'in_production'].includes(key)) {
        if (typeof value === 'string') {
          transformed[key] = value === 'true' || value === '1';
        }
      }
    }
    
    return transformed;
  });
}

/**
 * Helper function to safely get array data with fallback to empty array
 */
function safeGetArray(data: SeedData, tableName: string): any[] {
  return data[tableName] || [];
}

/**
 * Seed data using Prisma with proper error handling and batching
 */
async function seedDatabase(data: SeedData): Promise<void> {
  console.log('🌱 Starting database seeding...');
  
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Seed independent tables first
      console.log('📦 Seeding base tables...');
      
      const genres = safeGetArray(data, 'Genre');
      if (genres.length > 0) {
        const transformedGenres = transformData(genres, 'Genre');
        for (const genre of transformedGenres) {
          await tx.genre.upsert({
            where: { genreId: genre.genre_id },
            update: {},
            create: {
              genreId: genre.genre_id,
              name: genre.name
            }
          });
        }
        console.log(`✅ Seeded ${genres.length} genres`);
      }
      
      const collections = safeGetArray(data, 'Collection');
      if (collections.length > 0) {
        const transformedCollections = transformData(collections, 'Collection');
        for (const collection of transformedCollections) {
          await tx.collection.upsert({
            where: { collectionId: collection.collection_id },
            update: {},
            create: {
              collectionId: collection.collection_id,
              tmdbId: collection.tmdb_id,
              name: collection.name,
              overview: collection.overview,
              posterPath: collection.poster_path,
              backdropPath: collection.backdrop_path
            }
          });
        }
        console.log(`✅ Seeded ${collections.length} collections`);
      }
      
      const companies = safeGetArray(data, 'Company');
      if (companies.length > 0) {
        const transformedCompanies = transformData(companies, 'Company');
        for (const company of transformedCompanies) {
          await tx.company.upsert({
            where: { companyId: company.company_id },
            update: {},
            create: {
              companyId: company.company_id,
              tmdbId: company.tmdb_id,
              name: company.name,
              originCountry: company.origin_country,
              description: company.description,
              logoPath: company.logo_path
            }
          });
        }
        console.log(`✅ Seeded ${companies.length} companies`);
      }
      
      const persons = safeGetArray(data, 'Person');
      if (persons.length > 0) {
        const transformedPersons = transformData(persons, 'Person');
        for (const person of transformedPersons) {
          await tx.person.upsert({
            where: { personId: person.person_id },
            update: {},
            create: {
              personId: person.person_id,
              tmdbId: person.tmdb_id,
              name: person.name,
              gender: person.gender,
              biography: person.biography,
              birthDate: person.birth_date,
              deathDate: person.death_date,
              placeOfBirth: person.place_of_birth,
              profilePath: person.profile_path
            }
          });
        }
        console.log(`✅ Seeded ${persons.length} persons`);
      }
      
      // 2. Seed MediaItem
      console.log('🎬 Seeding media items...');
      const mediaItems = safeGetArray(data, 'MediaItem');
      const validMediaIds = new Set<bigint>();
      const validTVMediaIds = new Set<bigint>();
      const validSeasonIds = new Set<bigint>();
      
      if (mediaItems.length > 0) {
        const transformedMediaItems = transformData(mediaItems, 'MediaItem');
        
        // Track seen tmdb_ids to skip duplicates
        const seenTmdbIds = new Set<bigint>();
        let skippedDuplicates = 0;
        
        for (const mediaItem of transformedMediaItems) {
          // Skip if we've already seen this tmdb_id
          if (mediaItem.tmdb_id !== null && seenTmdbIds.has(BigInt(mediaItem.tmdb_id))) {
            skippedDuplicates++;
            continue;
          }
          
          if (mediaItem.tmdb_id !== null) {
            seenTmdbIds.add(BigInt(mediaItem.tmdb_id));
          }
          
          await tx.mediaItem.upsert({
            where: { mediaId: mediaItem.media_id },
            update: {},
            create: {
              mediaId: mediaItem.media_id,
              tmdbId: mediaItem.tmdb_id,
              mediaType: mediaItem.media_type,
              originalTitle: mediaItem.original_title,
              overview: mediaItem.overview,
              originalLanguage: mediaItem.original_language,
              status: mediaItem.status,
              popularity: mediaItem.popularity,
              voteAverage: mediaItem.vote_average,
              voteCount: mediaItem.vote_count,
              posterPath: mediaItem.poster_path,
              backdropPath: mediaItem.backdrop_path,
              homepageUrl: mediaItem.homepage_url
            }
          });
          
          // Track this as a valid media_id
          validMediaIds.add(BigInt(mediaItem.media_id));
        }
        console.log(`✅ Seeded ${mediaItems.length - skippedDuplicates} media items (${skippedDuplicates} duplicates skipped)`);
      }
      
      // 3. Seed Movies and TV Shows
      console.log('🎭 Seeding movies and TV shows...');
      const movies = safeGetArray(data, 'Movie');
      let moviesSeeded = 0;
      let moviesSkipped = 0;
      
      if (movies.length > 0) {
        const transformedMovies = transformData(movies, 'Movie');
        for (const movie of transformedMovies) {
          // Skip if media_id doesn't exist (was filtered out as duplicate)
          if (!validMediaIds.has(BigInt(movie.media_id))) {
            moviesSkipped++;
            continue;
          }
          
          await tx.movie.upsert({
            where: { mediaId: movie.media_id },
            update: {},
            create: {
              mediaId: movie.media_id,
              releaseDate: movie.release_date,
              budget: movie.budget,
              revenue: movie.revenue,
              adultFlag: movie.adult_flag,
              runtimeMinutes: movie.runtime_minutes,
              collectionId: movie.collection_id
            }
          });
          moviesSeeded++;
        }
        console.log(`✅ Seeded ${moviesSeeded} movies (${moviesSkipped} skipped due to missing media_id)`);
      }
      
      const tvShows = safeGetArray(data, 'TVShow');
      let tvShowsSeeded = 0;
      let tvShowsSkipped = 0;
      
      if (tvShows.length > 0) {
        const transformedTVShows = transformData(tvShows, 'TVShow');
        for (const tvShow of transformedTVShows) {
          // Skip if media_id doesn't exist (was filtered out as duplicate)
          if (!validMediaIds.has(BigInt(tvShow.media_id))) {
            tvShowsSkipped++;
            continue;
          }
          
          await tx.tVShow.upsert({
            where: { mediaId: tvShow.media_id },
            update: {},
            create: {
              mediaId: tvShow.media_id,
              firstAirDate: tvShow.first_air_date,
              lastAirDate: tvShow.last_air_date,
              inProduction: tvShow.in_production,
              numberOfSeasons: tvShow.number_of_seasons,
              numberOfEpisodes: tvShow.number_of_episodes,
              showType: tvShow.show_type
            }
          });
          tvShowsSeeded++;
          validTVMediaIds.add(BigInt(tvShow.media_id));
        }
        console.log(`✅ Seeded ${tvShowsSeeded} TV shows (${tvShowsSkipped} skipped due to missing media_id)`);
      }
      
      // 4. Seed Seasons and Episodes
      console.log('📺 Seeding seasons and episodes...');
      let seasonsSeeded = 0;
      let seasonsSkipped = 0;
      
      if (data.Season && data.Season.length > 0) {
        const transformedSeasons = transformData(data.Season, 'Season');
        for (const season of transformedSeasons) {
          // Skip if tv_media_id doesn't exist
          if (!validTVMediaIds.has(BigInt(season.tv_media_id))) {
            seasonsSkipped++;
            continue;
          }
          
          await tx.season.upsert({
            where: { seasonId: season.season_id },
            update: {},
            create: {
              seasonId: season.season_id,
              tvMediaId: season.tv_media_id,
              seasonNumber: season.season_number,
              name: season.name,
              airDate: season.air_date,
              episodeCount: season.episode_count,
              posterPath: season.poster_path
            }
          });
          seasonsSeeded++;
          validSeasonIds.add(BigInt(season.season_id));
        }
        console.log(`✅ Seeded ${seasonsSeeded} seasons (${seasonsSkipped} skipped due to missing tv_media_id)`);
      }
      
      let episodesSeeded = 0;
      let episodesSkipped = 0;
      
      if (data.Episode && data.Episode.length > 0) {
        const transformedEpisodes = transformData(data.Episode, 'Episode');
        for (const episode of transformedEpisodes) {
          // Skip if season_id doesn't exist
          if (!validSeasonIds.has(BigInt(episode.season_id))) {
            episodesSkipped++;
            continue;
          }
          
          await tx.episode.upsert({
            where: { episodeId: episode.episode_id },
            update: {},
            create: {
              episodeId: episode.episode_id,
              seasonId: episode.season_id,
              episodeNumber: episode.episode_number,
              name: episode.name,
              airDate: episode.air_date,
              runtimeMinutes: episode.runtime_minutes,
              overview: episode.overview,
              stillPath: episode.still_path
            }
          });
          episodesSeeded++;
        }
        console.log(`✅ Seeded ${episodesSeeded} episodes (${episodesSkipped} skipped due to missing season_id)`);
      }
      
      // 5. Seed Actor and CrewMember roles
      console.log('👥 Seeding actors and crew members...');
      if (data.Actor && data.Actor.length > 0) {
        const transformedActors = transformData(data.Actor, 'Actor');
        for (const actor of transformedActors) {
          await tx.actor.upsert({
            where: { personId: actor.person_id },
            update: {},
            create: {
              personId: actor.person_id,
              actingDebutYear: actor.acting_debut_year
            }
          });
        }
        console.log(`✅ Seeded ${data.Actor.length} actors`);
      }
      
      if (data.CrewMember && data.CrewMember.length > 0) {
        const transformedCrewMembers = transformData(data.CrewMember, 'CrewMember');
        for (const crewMember of transformedCrewMembers) {
          await tx.crewMember.upsert({
            where: { personId: crewMember.person_id },
            update: {},
            create: {
              personId: crewMember.person_id,
              primaryDepartment: crewMember.primary_department
            }
          });
        }
        console.log(`✅ Seeded ${data.CrewMember.length} crew members`);
      }
      
      // 6. Seed relationship tables
      console.log('🔗 Seeding relationships...');
      let mediaGenreSeeded = 0;
      let mediaGenreSkipped = 0;
      
      if (data.MediaGenre && data.MediaGenre.length > 0) {
        const transformedMediaGenres = transformData(data.MediaGenre, 'MediaGenre');
        for (const mediaGenre of transformedMediaGenres) {
          // Skip if media_id doesn't exist
          if (!validMediaIds.has(BigInt(mediaGenre.media_id))) {
            mediaGenreSkipped++;
            continue;
          }
          
          await tx.mediaGenre.upsert({
            where: {
              mediaId_genreId: {
                mediaId: mediaGenre.media_id,
                genreId: mediaGenre.genre_id
              }
            },
            update: {},
            create: {
              mediaId: mediaGenre.media_id,
              genreId: mediaGenre.genre_id
            }
          });
          mediaGenreSeeded++;
        }
        console.log(`✅ Seeded ${mediaGenreSeeded} media-genre relationships (${mediaGenreSkipped} skipped)`);
      }
      
      let mediaCompanySeeded = 0;
      let mediaCompanySkipped = 0;
      
      if (data.MediaCompany && data.MediaCompany.length > 0) {
        const transformedMediaCompanies = transformData(data.MediaCompany, 'MediaCompany');
        for (const mediaCompany of transformedMediaCompanies) {
          // Skip if media_id doesn't exist
          if (!validMediaIds.has(BigInt(mediaCompany.media_id))) {
            mediaCompanySkipped++;
            continue;
          }
          
          await tx.mediaCompany.upsert({
            where: {
              mediaId_companyId_role: {
                mediaId: mediaCompany.media_id,
                companyId: mediaCompany.company_id,
                role: mediaCompany.role
              }
            },
            update: {},
            create: {
              mediaId: mediaCompany.media_id,
              companyId: mediaCompany.company_id,
              role: mediaCompany.role
            }
          });
          mediaCompanySeeded++;
        }
        console.log(`✅ Seeded ${mediaCompanySeeded} media-company relationships (${mediaCompanySkipped} skipped)`);
      }
      
      // 7. Seed casting and crew assignments
      console.log('🎪 Seeding casting and crew assignments...');
      
      // Get existing person IDs once to validate foreign key constraints for all casting/crew operations
      const existingPersonIds = new Set(
        (await tx.person.findMany({ select: { personId: true } })).map(p => Number(p.personId))
      );
      
      if (data.TitleCasting && data.TitleCasting.length > 0) {
        const transformedTitleCastings = transformData(data.TitleCasting, 'TitleCasting');
        
        // Filter out casting records with invalid person_id or media_id references
        const validTitleCastings = transformedTitleCastings.filter(casting => {
          const personIdExists = existingPersonIds.has(Number(casting.person_id));
          const mediaIdExists = validMediaIds.has(BigInt(casting.media_id));
          return personIdExists && mediaIdExists;
        });
        
        for (const casting of validTitleCastings) {
          await tx.titleCasting.upsert({
            where: {
              mediaId_personId: {
                mediaId: casting.media_id,
                personId: casting.person_id
              }
            },
            update: {},
            create: {
              mediaId: casting.media_id,
              personId: casting.person_id,
              characterName: casting.character_name,
              castOrder: casting.cast_order
            }
          });
        }
        console.log(`✅ Seeded ${validTitleCastings.length} title castings (${data.TitleCasting.length - validTitleCastings.length} skipped due to invalid person_id or media_id)`);
      }
      
      if (data.EpisodeCasting && data.EpisodeCasting.length > 0) {
        const transformedEpisodeCastings = transformData(data.EpisodeCasting, 'EpisodeCasting');
        
        // Filter out casting records with invalid person_id or episode_id references
        const validEpisodeCastings = transformedEpisodeCastings.filter(casting => {
          const personIdExists = existingPersonIds.has(Number(casting.person_id));
          // Note: episode_id validation would require tracking valid episode IDs, skipping for now
          return personIdExists;
        });
        
        for (const casting of validEpisodeCastings) {
          await tx.episodeCasting.upsert({
            where: {
              episodeId_personId: {
                episodeId: casting.episode_id,
                personId: casting.person_id
              }
            },
            update: {},
            create: {
              episodeId: casting.episode_id,
              personId: casting.person_id,
              characterName: casting.character_name,
              castOrder: casting.cast_order
            }
          });
        }
        console.log(`✅ Seeded ${validEpisodeCastings.length} episode castings (${data.EpisodeCasting.length - validEpisodeCastings.length} skipped due to invalid person_id)`);
      }
      
      if (data.TitleCrewAssignment && data.TitleCrewAssignment.length > 0) {
        const transformedTitleCrewAssignments = transformData(data.TitleCrewAssignment, 'TitleCrewAssignment');
        
        // Filter out crew assignment records with invalid person_id or media_id references
        const validTitleCrewAssignments = transformedTitleCrewAssignments.filter(assignment => {
          const personIdExists = existingPersonIds.has(Number(assignment.person_id));
          const mediaIdExists = validMediaIds.has(BigInt(assignment.media_id));
          return personIdExists && mediaIdExists;
        });
        
        for (const assignment of validTitleCrewAssignments) {
          await tx.titleCrewAssignment.upsert({
            where: {
              mediaId_personId_jobTitle: {
                mediaId: assignment.media_id,
                personId: assignment.person_id,
                jobTitle: assignment.job_title
              }
            },
            update: {},
            create: {
              mediaId: assignment.media_id,
              personId: assignment.person_id,
              department: assignment.department,
              jobTitle: assignment.job_title
            }
          });
        }
        console.log(`✅ Seeded ${validTitleCrewAssignments.length} title crew assignments (${data.TitleCrewAssignment.length - validTitleCrewAssignments.length} skipped due to invalid person_id or media_id)`);
      }
      
      if (data.EpisodeCrewAssignment && data.EpisodeCrewAssignment.length > 0) {
        const transformedEpisodeCrewAssignments = transformData(data.EpisodeCrewAssignment, 'EpisodeCrewAssignment');
        
        // Filter out crew assignment records with invalid person_id references
        const validEpisodeCrewAssignments = transformedEpisodeCrewAssignments.filter(assignment => {
          const personIdExists = existingPersonIds.has(Number(assignment.person_id));
          // Note: episode_id validation would require tracking valid episode IDs
          return personIdExists;
        });
        
        for (const assignment of validEpisodeCrewAssignments) {
          await tx.episodeCrewAssignment.upsert({
            where: {
              episodeId_personId_jobTitle: {
                episodeId: assignment.episode_id,
                personId: assignment.person_id,
                jobTitle: assignment.job_title
              }
            },
            update: {},
            create: {
              episodeId: assignment.episode_id,
              personId: assignment.person_id,
              department: assignment.department,
              jobTitle: assignment.job_title
            }
          });
        }
        console.log(`✅ Seeded ${validEpisodeCrewAssignments.length} episode crew assignments (${data.EpisodeCrewAssignment.length - validEpisodeCrewAssignments.length} skipped due to invalid person_id)`);
      }
    }, {
      maxWait: 1800000, // 30 minutes
      timeout: 1800000  // 30 minutes
    });
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

/**
 * Print verification counts for all tables
 */
async function printVerificationCounts(): Promise<void> {
  console.log('\n🔍 Verification - Final record counts:');
  
  try {
    const counts = await prisma.$transaction([
      prisma.genre.count(),
      prisma.collection.count(),
      prisma.company.count(),
      prisma.person.count(),
      prisma.mediaItem.count(),
      prisma.movie.count(),
      prisma.tVShow.count(),
      prisma.season.count(),
      prisma.episode.count(),
      prisma.actor.count(),
      prisma.crewMember.count(),
      prisma.mediaGenre.count(),
      prisma.mediaCompany.count(),
      prisma.titleCasting.count(),
      prisma.episodeCasting.count(),
      prisma.titleCrewAssignment.count(),
      prisma.episodeCrewAssignment.count(),
    ]);
    
    const tableNames = [
      'Genre', 'Collection', 'Company', 'Person', 'MediaItem', 
      'Movie', 'TVShow', 'Season', 'Episode', 'Actor', 'CrewMember',
      'MediaGenre', 'MediaCompany', 'TitleCasting', 'EpisodeCasting',
      'TitleCrewAssignment', 'EpisodeCrewAssignment'
    ];
    
    counts.forEach((count: number, index: number) => {
      console.log(`  📊 ${tableNames[index]}: ${count} records`);
    });
  } catch (error) {
    console.error('❌ Error printing verification counts:', error);
  }
}

/**
 * Main seeding function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Prisma-based database seeding...\n');
  
  try {
    // Load JSON data
    const data = await loadSeedData();
    
    // Clear existing data
    await clearDatabase();
    
    // Seed new data
    await seedDatabase(data);

    // realign MediaItem identity/sequence with current data
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"MediaItem"', 'media_id'),
        (SELECT COALESCE(MAX("media_id"), 1) FROM "MediaItem")
      );
    `);

    // Print verification
    await printVerificationCounts();
    
    console.log('\n✨ Seeding process completed successfully!');
  } catch (error) {
    console.error('\n💥 Seeding process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding process
if (require.main === module) {
  main();
}

export { main as seedDatabase };