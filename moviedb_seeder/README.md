# TMDB Seeder

Fetch data directly from The Movie Database (TMDB) API and seed it into your PostgreSQL database.

## Features

- ✅ Fetch popular movies and TV shows from TMDB
- ✅ Fetch detailed information including cast, crew, seasons, and episodes
- ✅ Transform TMDB data into your database schema format
- ✅ Rate limiting to respect TMDB API limits (40 requests/second)
- ✅ Generate JSON files compatible with your Prisma seeder
- ✅ Automatic ID mapping and relationship handling

## Setup

### 1. Get TMDB API Key

1. Go to [The Movie Database](https://www.themoviedb.org/)
2. Create a free account
3. Go to Settings → API
4. Request an API key (choose "Developer" option)
5. Copy your API key (v3 auth)

### 2. Configure Environment

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and set your TMDB API key:

```env
TMDB_API_KEY=your_actual_api_key_here
MAX_MOVIES=500
MAX_TV_SHOWS=500
REQUESTS_PER_SECOND=40
```

### 3. Install Dependencies

```bash
npm install
```

## Usage

### Fetch Data from TMDB

Fetch data from TMDB API and save to `output/` directory:

```bash
npm run fetch
```

This will:
- Fetch genres (movies and TV)
- Fetch popular movies with full details (cast, crew, companies, collections)
- Fetch popular TV shows with full details (including seasons and episodes)
- Transform all data into your database schema format
- Save JSON files to `output/` directory

### Copy to Seed Directory

Copy the generated JSON files to your seed data directory:

```bash
npm run copy
```

### Seed Database

Copy files and run the Prisma seed:

```bash
npm run seed
```

### Fetch and Copy (All-in-One)

Fetch from TMDB and copy to seed directory in one command:

```bash
npm start
# or
npm run fetch-and-seed
```

After this, run the Prisma seed manually:

```bash
cd ..
npx prisma db seed
```

## Configuration Options

Edit `.env` to customize:

- `TMDB_API_KEY`: Your TMDB API key (required)
- `MAX_MOVIES`: Maximum number of movies to fetch (default: 500)
- `MAX_TV_SHOWS`: Maximum number of TV shows to fetch (default: 500)
- `REQUESTS_PER_SECOND`: API rate limit (default: 40, don't exceed this)

## Output Structure

The seeder generates JSON files compatible with your database schema:

```
output/
├── Genre.json
├── Collection.json
├── Company.json
├── Person.json
├── MediaItem.json
├── Movie.json
├── TVShow.json
├── Season.json
├── Episode.json
├── Actor.json
├── CrewMember.json
├── MediaGenre.json
├── MediaCompany.json
├── TitleCasting.json
├── EpisodeCasting.json
├── TitleCrewAssignment.json
└── EpisodeCrewAssignment.json
```

Each file contains an array of records in the format expected by your Prisma seed script.

## Data Fetched

### Movies
- Popular movies with full details
- Cast (top 20 per movie)
- Crew (top 30 per movie)
- Production companies
- Collections
- Genres

### TV Shows
- Popular TV shows with full details
- Cast (top 20 per show)
- Crew (top 30 per show)
- Production companies and networks
- Seasons (first 3 seasons per show)
- Episodes with cast and crew
- Genres

### People
- Actors and crew members
- Biography, birth/death dates, profile images
- Department information

## Notes

- **Rate Limiting**: The seeder respects TMDB's rate limits (40 requests/second by default)
- **Data Completeness**: Not all TMDB data is fetched to keep the seeding reasonable. Adjust `MAX_MOVIES` and `MAX_TV_SHOWS` as needed
- **TV Show Seasons**: Limited to first 3 seasons per show to avoid excessive API calls
- **ID Mapping**: The seeder automatically generates internal IDs and maps them to TMDB IDs

## Troubleshooting

### API Key Error
```
Error: TMDB_API_KEY is required
```
Make sure you've created a `.env` file and added your TMDB API key.

### Rate Limit Errors
If you get rate limit errors, reduce `REQUESTS_PER_SECOND` in `.env` or increase the delay between batches.

### Missing Data
Some records might be skipped if the TMDB API returns incomplete data. This is normal and the seeder will continue processing.

## Development

The seeder is built with TypeScript and uses:
- `axios` for HTTP requests
- `p-queue` for rate limiting
- `dotenv` for configuration

File structure:
```
moviedb_seeder/
├── src/
│   ├── index.ts           # Main script
│   ├── tmdbClient.ts      # TMDB API client
│   └── dataTransformer.ts # Data transformation logic
├── output/                # Generated JSON files
├── package.json
├── tsconfig.json
└── .env
```

## License

This tool is for educational purposes. Please respect TMDB's terms of service and API usage guidelines.
