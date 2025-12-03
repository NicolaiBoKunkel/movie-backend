/**
 * Main TMDB Seeder Script
 * Fetches data from TMDB API and transforms it into database-ready JSON files
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { TMDBClient } from './tmdbClient';
import { DataTransformer } from './dataTransformer';

dotenv.config();

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const SEED_DATA_DIR = path.join(__dirname, '..', '..', 'db', 'sql', 'seed_Data');

interface Config {
  apiKey: string;
  maxMovies: number;
  maxTVShows: number;
  requestsPerSecond: number;
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): Config {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is required. Please set it in your .env file.');
  }

  return {
    apiKey,
    maxMovies: parseInt(process.env.MAX_MOVIES || '500', 10),
    maxTVShows: parseInt(process.env.MAX_TV_SHOWS || '500', 10),
    requestsPerSecond: parseInt(process.env.REQUESTS_PER_SECOND || '40', 10),
  };
}

/**
 * Ensure output directories exist
 */
function ensureDirectories(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Save data to JSON files
 */
function saveToJSON(data: any, directory: string): void {
  console.log(`\n💾 Saving data to ${directory}...`);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  Object.keys(data).forEach((tableName) => {
    const filePath = path.join(directory, `${tableName}.json`);
    const jsonData = {
      [tableName]: data[tableName],
    };
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    console.log(`  ✅ Saved ${tableName}.json (${data[tableName].length} records)`);
  });

  console.log('✅ All data saved successfully!');
}

/**
 * Fetch data from TMDB
 */
async function fetchFromTMDB(): Promise<void> {
  console.log('🚀 Starting TMDB data fetch...\n');

  const config = loadConfig();
  const client = new TMDBClient(config.apiKey, config.requestsPerSecond);
  const transformer = new DataTransformer();

  try {
    // 1. Fetch and transform genres
    console.log('\n=== Step 1: Fetching Genres ===');
    const genres = await client.fetchGenres();
    transformer.transformGenres(genres.movies, genres.tv);

    // 2. Fetch and transform movies
    console.log('\n=== Step 2: Fetching Movies ===');
    const moviesPerPage = 20;
    const moviePages = Math.ceil(config.maxMovies / moviesPerPage);
    const movies = await client.fetchPopularMovies(moviePages);
    
    console.log(`\n📥 Fetching detailed information for ${movies.length} movies...`);
    let movieCount = 0;
    for (const movie of movies.slice(0, config.maxMovies)) {
      const details = await client.fetchMovieDetails(movie.id);
      if (details) {
        transformer.transformMovie(movie, details);
        movieCount++;
        if (movieCount % 10 === 0) {
          console.log(`  Processed ${movieCount}/${Math.min(movies.length, config.maxMovies)} movies (Queue: ${client.getQueueSize()})`);
        }
      }
    }
    console.log(`✅ Processed ${movieCount} movies`);

    // 3. Fetch and transform TV shows
    console.log('\n=== Step 3: Fetching TV Shows ===');
    const tvShowsPerPage = 20;
    const tvPages = Math.ceil(config.maxTVShows / tvShowsPerPage);
    const tvShows = await client.fetchPopularTVShows(tvPages);
    
    console.log(`\n📥 Fetching detailed information for ${tvShows.length} TV shows...`);
    let tvCount = 0;
    for (const tvShow of tvShows.slice(0, config.maxTVShows)) {
      const details = await client.fetchTVShowDetails(tvShow.id);
      if (details) {
        // Fetch season details (limit to first 3 seasons for each show)
        const seasonDetails = [];
        const seasonsToFetch = details.seasons
          ? details.seasons.filter((s: any) => s.season_number > 0).slice(0, 3)
          : [];
        
        for (const season of seasonsToFetch) {
          const seasonData = await client.fetchSeasonDetails(tvShow.id, season.season_number);
          if (seasonData) {
            seasonDetails.push(seasonData);
          }
        }

        transformer.transformTVShow(tvShow, details, seasonDetails);
        tvCount++;
        if (tvCount % 5 === 0) {
          console.log(`  Processed ${tvCount}/${Math.min(tvShows.length, config.maxTVShows)} TV shows (Queue: ${client.getQueueSize()})`);
        }
      }
    }
    console.log(`✅ Processed ${tvCount} TV shows`);

    // Print statistics
    transformer.printStats();

    // Save to JSON files
    const transformedData = transformer.getData();
    saveToJSON(transformedData, OUTPUT_DIR);

    console.log('\n🎉 Data fetch completed successfully!');
    console.log(`📁 Output saved to: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Error during fetch:', error);
    throw error;
  }
}

/**
 * Copy JSON files to seed_Data directory
 */
function copyToSeedData(): void {
  console.log('\n📋 Copying JSON files to seed_Data directory...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error('❌ Output directory not found. Run fetch first.');
    return;
  }

  if (!fs.existsSync(SEED_DATA_DIR)) {
    fs.mkdirSync(SEED_DATA_DIR, { recursive: true });
  }

  const files = fs.readdirSync(OUTPUT_DIR).filter(file => file.endsWith('.json'));
  
  files.forEach(file => {
    const sourcePath = path.join(OUTPUT_DIR, file);
    const destPath = path.join(SEED_DATA_DIR, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`  ✅ Copied ${file}`);
  });

  console.log(`\n✅ Copied ${files.length} files to ${SEED_DATA_DIR}`);
}

/**
 * Run Prisma seed
 */
async function runPrismaSeed(): Promise<void> {
  console.log('\n🌱 Running Prisma seed...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Import and run the seed function
    const seedPath = path.join(__dirname, '..', '..', 'prisma', 'seed.ts');
    if (fs.existsSync(seedPath)) {
      const { seedDatabase } = require(seedPath);
      await seedDatabase();
    } else {
      console.log('⚠️  Prisma seed file not found. Please run it manually with: npm run seed');
    }
  } catch (error) {
    console.error('❌ Error running Prisma seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'fetch-and-seed';

  ensureDirectories();

  try {
    switch (command) {
      case 'fetch':
        await fetchFromTMDB();
        break;
      
      case 'copy':
        copyToSeedData();
        break;
      
      case 'seed':
        copyToSeedData();
        await runPrismaSeed();
        break;
      
      case 'fetch-and-seed':
        await fetchFromTMDB();
        copyToSeedData();
        console.log('\n✨ All done! You can now run: npm run seed');
        console.log('   Or manually run: npx prisma db seed');
        break;
      
      default:
        console.log(`
TMDB Seeder - Fetch and seed data from The Movie Database

Usage:
  npm start [command]

Commands:
  fetch           Fetch data from TMDB API and save to output/
  copy            Copy JSON files from output/ to db/sql/seed_Data/
  seed            Copy files and run Prisma seed
  fetch-and-seed  Fetch from TMDB, copy files (default)

Examples:
  npm start fetch
  npm start seed
  npm start fetch-and-seed
        `);
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

export { fetchFromTMDB, copyToSeedData };
