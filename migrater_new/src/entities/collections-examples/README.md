# MongoDB Collection Examples

This folder contains example documents showing the fully nested structure of data in MongoDB after migration.

## Database Structure

The migration creates data in **two separate MongoDB databases**:

### 1. `movie_db_mongo` Database
Contains normalized collections with separate documents for each entity:
- `media_items` - Basic media item information
- `movies` - Movie-specific data
- `tvshows` - TV show-specific data
- `persons` - Person information
- `actors` - Actor-specific data
- `crewmembers` - Crew member-specific data
- `companies` - Production company data
- `genres` - Genre definitions
- `seasons` - TV show seasons
- `episodes` - Individual episodes
- `collections` - Movie collections
- `mediagenres` - Media-to-genre relationships
- `mediacompanies` - Media-to-company relationships
- `titlecastings` - Title-level casting information
- `episodecastings` - Episode-level casting information
- `titlecrewassignments` - Title-level crew assignments
- `episodecrewassignments` - Episode-level crew assignments

### 2. `collections` Database
Contains fully denormalized, nested documents optimized for read performance:
- `media_items` - Complete movie/show documents with all related data nested

## Fully Nested Media Items (in `collections` database)

- **movie_full_example.json** - A complete movie document with:
  - Basic movie information (title, overview, ratings, etc.)
  - Movie-specific details (release date, budget, revenue, runtime)
  - Collection information (if part of a collection)
  - Full cast array with actor details and character names
  - Full crew array with crew member details, departments, and job titles
  - Genres array
  - Production companies array with roles (production/distribution)
  - All person biographical data (birth date, place of birth, biography)

- **tvshow_full_example.json** - A complete TV show document with:
  - Basic show information
  - TV show-specific details (air dates, number of seasons/episodes)
  - Nested seasons array, each containing:
    - Season details
    - Nested episodes array, each containing:
      - Episode details (name, air date, runtime, overview)
      - Episode-specific cast (guest stars)
      - Episode-specific crew (directors, writers for that episode)
  - Show-level cast (main cast across all seasons)
  - Show-level crew (show creators, executive producers)
  - Genres and production companies

- **movie_simple_example.json** - Another movie example for reference

## Benefits of This Structure

1. **Single Query Access** - Get all movie/show data with one query from `collections` database, no joins needed
2. **Dual Approach** - Normalized data in `movie_db_mongo` for updates, denormalized data in `collections` for fast reads
3. **Denormalized for Performance** - `collections` database optimized for read operations
4. **Complete Context** - All related information (cast, crew, companies) in one document
5. **Hierarchical Data** - TV shows naturally represent their season → episode hierarchy
6. **Flexible Querying** - Can query by any nested field (e.g., find shows with specific actors in episodes)
7. **Best of Both Worlds** - Use `movie_db_mongo` for administrative updates, use `collections` for application queries

## Example Queries (on `collections` database)

### Find all movies with a specific actor
```javascript
db.media_items.find({
  "mediaType": "movie",
  "cast.personName": "Brad Pitt"
})
```

### Find TV shows with episodes directed by a specific person
```javascript
db.media_items.find({
  "mediaType": "tv",
  "tvShow.seasons.episodes.crew": {
    $elemMatch: {
      "personName": "Vince Gilligan",
      "department": "Directing"
    }
  }
})
```

### Find high-rated movies in a specific genre
```javascript
db.media_items.find({
  "mediaType": "movie",
  "voteAverage": { $gte: 8.0 },
  "genres.name": "Drama"
})
```

### Get all episodes of a specific season
```javascript
db.media_items.findOne(
  { "mediaId": "2" },
  { "tvShow.seasons": { $elemMatch: { "seasonNumber": 1 } } }
)
```

## Data Structure Overview

```
MediaItem (Document Root)
├── mediaId, tmdbId, mediaType, originalTitle, overview, etc.
├── movie (if mediaType = "movie")
│   ├── releaseDate, budget, revenue, runtime
│   └── collection (nested)
│       └── collectionId, name, overview, posterPath
├── tvShow (if mediaType = "tv")
│   ├── firstAirDate, numberOfSeasons, numberOfEpisodes
│   └── seasons[] (array)
│       ├── seasonId, seasonNumber, name, posterPath
│       └── episodes[] (array)
│           ├── episodeId, episodeNumber, name, overview
│           ├── cast[] (episode-specific)
│           └── crew[] (episode-specific)
├── genres[] (array)
│   └── genreId, name
├── companies[] (array)
│   └── companyId, name, role, originCountry, logoPath
├── cast[] (array - title-level)
│   └── personId, personName, characterName, castOrder, biography, birthDate, etc.
└── crew[] (array - title-level)
    └── personId, personName, department, jobTitle, biography, birthDate, etc.
```

## Migration

The migration process:
1. Connects to PostgreSQL and fetches all data
2. Creates normalized collections in the `movie_db_mongo` database
3. Creates fully nested documents in the `collections` database
4. Both databases are populated simultaneously during migration

This dual-database approach ensures optimal query performance for read-heavy application operations while maintaining a normalized structure for data management.
