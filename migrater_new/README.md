# Movie Database Migrator

This migrator tool transfers data from your PostgreSQL movie database (managed by Prisma) to MongoDB and Neo4j databases, enabling multi-database analytics and different query patterns.

## Features

- **PostgreSQL to MongoDB**: Migrates relational data to document-based collections with embedded relationships
- **PostgreSQL to Neo4j**: Creates a graph database with nodes and relationships for network analysis
- **Comprehensive Data Coverage**: Handles all entities from your Prisma schema including:
  - Media Items (Movies/TV Shows)
  - Persons (Actors/Crew Members)
  - Companies and Collections
  - Genres and Relationships
  - Cast and Crew assignments
  - Episodes and Seasons (for TV Shows)

## Prerequisites

- Node.js 18+
- Access to PostgreSQL database (with Prisma)
- MongoDB instance
- Neo4j instance
- Required environment variables

## Installation

1. Clone or copy the migrator folder
2. Install dependencies:
```bash
npm install
```

3. Copy environment file and configure:
```bash
cp .env.example .env
```

4. Update `.env` with your database connections:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/movie_db
MONGODB_URI=mongodb://localhost:27017/movie_db_mongo
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t movie-migrator .
docker run --env-file .env movie-migrator
```

## Database Schemas

### MongoDB Collections

The migrator creates the following MongoDB collections:

1. **media_items**: Complete media information with embedded relationships
2. **movies**: Movie-specific data with embedded media item details
3. **tv_shows**: TV show data with embedded seasons and episodes
4. **persons**: Actor and crew member information with their roles
5. **companies**: Production companies with associated media
6. **genres**: Genres with linked media items

### Neo4j Graph Schema

The migrator creates nodes and relationships for:

**Nodes:**
- `MediaItem` (with `Movie` and `TVShow` labels)
- `Person` (with `Actor` and `CrewMember` labels)
- `Company`
- `Genre` 
- `Collection`

**Relationships:**
- `(:Person)-[:ACTED_IN]->(:MediaItem)`
- `(:Person)-[:WORKED_ON]->(:MediaItem)`
- `(:MediaItem)-[:HAS_GENRE]->(:Genre)`
- `(:MediaItem)-[:PRODUCED_BY]->(:Company)`
- `(:Movie)-[:PART_OF]->(:Collection)`

## Query Examples

### MongoDB Queries

```javascript
// Find all action movies with high ratings
db.media_items.find({
  "mediaType": "movie",
  "genres.name": "Action",
  "voteAverage": { $gte: 8.0 }
})

// Find TV shows with embedded episode data
db.tv_shows.find({
  "numberOfSeasons": { $gte: 5 }
}).limit(10)
```

### Neo4j Queries

```cypher
// Find movies by genre
MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: "Action"})
RETURN m.originalTitle, m.voteAverage
ORDER BY m.voteAverage DESC

// Find actor collaborations
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1.name = "Tom Hanks"
RETURN DISTINCT a2.name AS CoActor, m.originalTitle AS Movie
```

More comprehensive queries are available in `src/cypher-queries/movie-queries.cypher`.

## Data Transformation

### MongoDB Transformations
- Embeds related data for denormalized document storage
- Creates separate collections for easy querying
- Preserves all relationship data in embedded arrays
- Converts BigInt IDs to strings for MongoDB compatibility

### Neo4j Transformations  
- Creates nodes for all major entities
- Establishes typed relationships between nodes
- Adds relationship properties (cast order, job titles, etc.)
- Enables graph traversal and network analysis

## Migration Process

1. **Initialization**: Connects to all three databases
2. **Data Cleanup**: Clears existing data in target databases
3. **Schema Creation**: Sets up constraints and indexes in Neo4j
4. **Data Migration**: 
   - Fetches data from PostgreSQL via Prisma
   - Transforms and inserts into MongoDB
   - Creates nodes and relationships in Neo4j
5. **Verification**: Logs migration statistics

## Error Handling

- Individual entity migration errors are logged but don't stop the process
- Database connection failures are handled gracefully
- Constraint violations in Neo4j are caught and logged
- MongoDB insertion errors are reported with context

## Performance Considerations

- Uses batch insertions where possible
- Creates database constraints for optimized querying
- Processes related data in logical order
- Includes progress logging for monitoring

## Extending the Migrator

To add new entities or modify the migration:

1. **MongoDB**: Add new entity classes in `src/entities/mongo/`
2. **Neo4j**: Extend the migration logic in `src/MigrateToNeo4j.ts`
3. **Queries**: Add new query patterns to the cypher files
4. **Relationships**: Update the relationship mapping logic

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify database URLs and credentials
2. **Memory Issues**: For large datasets, consider batch processing
3. **Constraint Violations**: Check for duplicate data in source database
4. **Type Errors**: Ensure BigInt fields are properly converted to strings

### Logs

The migrator provides detailed logging:
- Connection status for all databases
- Migration progress for each entity type
- Error messages with context
- Final migration statistics

## License

This project is part of the movie database system and follows the same licensing terms.

## Query Examples

Find high-rated action movies
db.media_items.find({
  "mediaType": "movie",
  "genres.name": "Action", 
  "voteAverage": {$gte: 8.0}
})

// Find actor collaborations
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1.name CONTAINS "Tom"
RETURN a1.name, a2.name, m.originalTitle

CALL {
  MATCH (g:Genre) RETURN g as node, "Genre" as type LIMIT 3
  UNION
  MATCH (c:Company) RETURN c as node, "Company" as type LIMIT 3
  UNION  
  MATCH (p:Person) RETURN p as node, "Person" as type LIMIT 3
  UNION
  MATCH (m:Movie) RETURN m as node, "Movie" as type LIMIT 3
  UNION
  MATCH (tv:TVShow) RETURN tv as node, "TVShow" as type LIMIT 3
  UNION
  MATCH (s:Season) RETURN s as node, "Season" as type LIMIT 3
  UNION
  MATCH (e:Episode) RETURN e as node, "Episode" as type LIMIT 3
}
RETURN node, type