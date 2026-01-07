// =============================================
// MOVIE DATABASE CYPHER QUERIES
// =============================================

// Basic queries
// -------------

// Get all movies with their base media info
MATCH (mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
RETURN mi, m
LIMIT 10;

// Get all TV shows with their base media info
MATCH (mi:MediaItem)-[:IS_TV_SHOW]->(tv:TVShow)
RETURN mi, tv
LIMIT 10;

// Get all actors with their person info
MATCH (p:Person)-[:IS_ACTOR]->(a:Actor)
RETURN p, a
LIMIT 10;

// Complex relationship queries
// ----------------------------

// Find movies by genre
MATCH (mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
MATCH (mi)-[:HAS_GENRE]->(g:Genre {name: "Action"})
RETURN mi.originalTitle AS Title, m.releaseDate AS ReleaseDate, mi.voteAverage AS Rating
ORDER BY mi.voteAverage DESC;

// Find actors who worked in multiple movies
MATCH (p:Person)-[:IS_ACTOR]->(a:Actor)
MATCH (a)-[:ACTED_IN]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
WITH p, COUNT(m) AS movieCount
WHERE movieCount > 1
RETURN p.name AS Actor, movieCount
ORDER BY movieCount DESC;

// Find movies with their cast
MATCH (mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
MATCH (a:Actor)-[r:ACTED_IN]->(mi)
MATCH (p:Person)-[:IS_ACTOR]->(a)
WHERE mi.originalTitle = "The Matrix"
RETURN mi.originalTitle AS Movie, p.name AS Actor, r.characterName AS Character
ORDER BY r.castOrder;

// Find collaborations between actors
MATCH (p1:Person)-[:IS_ACTOR]->(a1:Actor)-[:ACTED_IN]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
MATCH (a2:Actor)-[:ACTED_IN]->(mi)
MATCH (p2:Person)-[:IS_ACTOR]->(a2)
WHERE p1.name = "Tom Hanks" AND p2.name <> p1.name
RETURN DISTINCT p2.name AS CoActor, mi.originalTitle AS Movie;

// Find directors and their movies
MATCH (p:Person)-[:IS_CREW_MEMBER]->(c:CrewMember)-[r:WORKED_ON]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
WHERE r.jobTitle = "Director"
RETURN p.name AS Director, COLLECT(mi.originalTitle) AS Movies;

// Genre analysis
// --------------

// Most popular genres by movie count
MATCH (g:Genre)<-[:HAS_GENRE]-(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
RETURN g.name AS Genre, COUNT(m) AS MovieCount
ORDER BY MovieCount DESC;

// Average rating by genre
MATCH (g:Genre)<-[:HAS_GENRE]-(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
RETURN g.name AS Genre, 
       AVG(mi.voteAverage) AS AvgRating,
       COUNT(m) AS MovieCount
ORDER BY AvgRating DESC;

// Company analysis
// ---------------

// Production companies and their movies
MATCH (c:Company)<-[r:PRODUCED_BY]-(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
WHERE r.role = "production"
RETURN c.name AS Company, 
       COUNT(m) AS MovieCount,
       AVG(mi.voteAverage) AS AvgRating
ORDER BY MovieCount DESC;

// Find highest grossing movies by company
MATCH (c:Company)<-[r:PRODUCED_BY]-(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
WHERE r.role = "production" AND m.revenue > 0
RETURN c.name AS Company,
       mi.originalTitle AS Movie,
       m.revenue AS Revenue
ORDER BY toInteger(m.revenue) DESC
LIMIT 20;

// Actor career analysis
// --------------------

// Actor's filmography with ratings
MATCH (p:Person)-[:IS_ACTOR]->(a:Actor)-[r:ACTED_IN]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
WHERE p.name = "Leonardo DiCaprio"
RETURN mi.originalTitle AS Movie,
       m.releaseDate AS ReleaseDate,
       r.characterName AS Character,
       mi.voteAverage AS Rating
ORDER BY m.releaseDate DESC;

// Find actors who worked with the most directors
MATCH (p1:Person)-[:IS_ACTOR]->(a:Actor)-[:ACTED_IN]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
MATCH (c:CrewMember)-[r:WORKED_ON]->(mi)
MATCH (p2:Person)-[:IS_CREW_MEMBER]->(c)
WHERE r.jobTitle = "Director"
WITH p1, COUNT(DISTINCT p2) AS directorCount
RETURN p1.name AS Actor, directorCount
ORDER BY directorCount DESC
LIMIT 10;

// TV Show specific queries
// -----------------------

// Find TV shows by genre
MATCH (mi:MediaItem)-[:IS_TV_SHOW]->(tv:TVShow)
MATCH (mi)-[:HAS_GENRE]->(g:Genre {name: "Drama"})
RETURN mi.originalTitle AS ShowTitle, 
       tv.numberOfSeasons AS Seasons,
       tv.numberOfEpisodes AS Episodes,
       mi.voteAverage AS Rating
ORDER BY mi.voteAverage DESC;

// Collection analysis
// ------------------

// Movies in collections
MATCH (m:Movie)-[:PART_OF]->(col:Collection)
MATCH (mi:MediaItem)-[:IS_MOVIE]->(m)
RETURN col.name AS Collection,
       COLLECT(mi.originalTitle) AS Movies,
       COUNT(m) AS MovieCount
ORDER BY MovieCount DESC;

// Advanced analytics
// -----------------

// Find the shortest path between two actors
MATCH (p1:Person)-[:IS_ACTOR]->(a1:Actor {name: "Kevin Bacon"})
MATCH (p2:Person)-[:IS_ACTOR]->(a2:Actor {name: "Tom Cruise"})
MATCH path = shortestPath((a1)-[*]-(a2))
RETURN path;

// Find actors who never worked together but share common co-stars
MATCH (p1:Person)-[:IS_ACTOR]->(a1:Actor)-[:ACTED_IN]->(mi1:MediaItem)
MATCH (commonActor:Actor)-[:ACTED_IN]->(mi1)
MATCH (commonActor)-[:ACTED_IN]->(mi2:MediaItem)
MATCH (a2:Actor)-[:ACTED_IN]->(mi2)
MATCH (p2:Person)-[:IS_ACTOR]->(a2)
MATCH (pCommon:Person)-[:IS_ACTOR]->(commonActor)
WHERE p1.name = "Brad Pitt" 
  AND p2.name = "Leonardo DiCaprio"
  AND NOT EXISTS((a1)-[:ACTED_IN]->(:MediaItem)<-[:ACTED_IN]-(a2))
RETURN DISTINCT pCommon.name AS CommonCoStar;

// Find most prolific decade for an actor
MATCH (p:Person)-[:IS_ACTOR]->(a:Actor)-[:ACTED_IN]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
WHERE p.name = "Robert De Niro" AND m.releaseDate IS NOT NULL
WITH p, (toInteger(substring(m.releaseDate, 0, 4)) / 10) * 10 AS decade, COUNT(m) AS movieCount
RETURN decade AS Decade, movieCount AS Movies
ORDER BY movieCount DESC;

// Network analysis
// ---------------

// Find the most connected actor (highest degree centrality)
MATCH (p1:Person)-[:IS_ACTOR]->(a:Actor)-[:ACTED_IN]->(mi:MediaItem)
MATCH (coActor:Actor)-[:ACTED_IN]->(mi)
MATCH (p2:Person)-[:IS_ACTOR]->(coActor)
WHERE a <> coActor
WITH p1, COUNT(DISTINCT p2) AS connections
RETURN p1.name AS Actor, connections
ORDER BY connections DESC
LIMIT 10;

// Find clusters of actors who frequently work together
MATCH (p1:Person)-[:IS_ACTOR]->(a1:Actor)-[:ACTED_IN]->(mi:MediaItem)-[:IS_MOVIE]->(m:Movie)
MATCH (a2:Actor)-[:ACTED_IN]->(mi)
MATCH (p2:Person)-[:IS_ACTOR]->(a2)
WHERE a1.personId < a2.personId
WITH p1, p2, COUNT(m) AS collaborations
WHERE collaborations > 2
RETURN p1.name AS Actor1, p2.name AS Actor2, collaborations
ORDER BY collaborations DESC;

// ---------------------------------------------
// Full media item graph snapshot (by mediaId)
// ---------------------------------------------
// Returns a single map containing the MediaItem and all connected nodes
// and relationship properties where applicable.
// Usage:
// :param mediaId => "100";
// :param mediaId => "200";
// :param mediaId => "300";
// Then run the query below.
// To use TMDB id instead, replace the first MATCH line with:
// MATCH (mi:MediaItem {tmdbId: $tmdbId})
MATCH (mi:MediaItem {mediaId: $mediaId})
OPTIONAL MATCH (mi)-[isMovieRel:IS_MOVIE]->(m:Movie)
OPTIONAL MATCH (mi)-[isTvRel:IS_TV_SHOW]->(tv:TVShow)
OPTIONAL MATCH (mi)-[hasGenreRel:HAS_GENRE]->(g:Genre)
OPTIONAL MATCH (mi)-[producedByRel:PRODUCED_BY]->(c:Company)
OPTIONAL MATCH (a:Actor)-[actedInRel:ACTED_IN]->(mi)
OPTIONAL MATCH (pA:Person)-[:IS_ACTOR]->(a)
OPTIONAL MATCH (cm:CrewMember)-[workedOnRel:WORKED_ON]->(mi)
OPTIONAL MATCH (pC:Person)-[:IS_CREW_MEMBER]->(cm)
OPTIONAL MATCH (m)-[partOfRel:PART_OF]->(col:Collection)
WITH mi,
     collect(DISTINCT m) AS movies,
     collect(DISTINCT tv) AS tvs,
     collect(DISTINCT col) AS cols,
     collect(DISTINCT g) AS genres,
     collect(DISTINCT { company: c, role: producedByRel.role }) AS companies,
     collect(DISTINCT {
       person: pA,
       actor: a,
       characterName: actedInRel.characterName,
       castOrder: actedInRel.castOrder
     }) AS cast,
     collect(DISTINCT {
       person: pC,
       crewMember: cm,
       department: workedOnRel.department,
       jobTitle: workedOnRel.jobTitle
     }) AS crew
RETURN {
  mediaItem: mi,
  movie: head(movies),
  tvShow: head(tvs),
  collection: head(cols),
  genres: genres,
  companies: companies,
  cast: cast,
  crew: crew
} AS mediaGraph;