// =============================================
// MOVIE DATABASE CYPHER QUERIES
// =============================================

// Basic queries
// -------------

// Get all movies
MATCH (m:Movie)
RETURN m
LIMIT 10;

// Get all TV shows
MATCH (t:TVShow)
RETURN t
LIMIT 10;

// Get all actors
MATCH (a:Actor)
RETURN a
LIMIT 10;

// Complex relationship queries
// ----------------------------

// Find movies by genre
MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: "Action"})
RETURN m.originalTitle AS Title, m.releaseDate AS ReleaseDate, m.voteAverage AS Rating
ORDER BY m.voteAverage DESC;

// Find actors who worked in multiple movies
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
WITH a, COUNT(m) AS movieCount
WHERE movieCount > 1
RETURN a.name AS Actor, movieCount
ORDER BY movieCount DESC;

// Find movies with their cast
MATCH (m:Movie)<-[r:ACTED_IN]-(a:Actor)
WHERE m.originalTitle = "The Matrix"
RETURN m.originalTitle AS Movie, a.name AS Actor, r.characterName AS Character
ORDER BY r.castOrder;

// Find collaborations between actors
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1.name = "Tom Hanks" AND a2.name <> a1.name
RETURN DISTINCT a2.name AS CoActor, m.originalTitle AS Movie;

// Find directors and their movies
MATCH (p:Person)-[r:WORKED_ON]->(m:Movie)
WHERE r.jobTitle = "Director"
RETURN p.name AS Director, COLLECT(m.originalTitle) AS Movies;

// Genre analysis
// --------------

// Most popular genres by movie count
MATCH (g:Genre)<-[:HAS_GENRE]-(m:Movie)
RETURN g.name AS Genre, COUNT(m) AS MovieCount
ORDER BY MovieCount DESC;

// Average rating by genre
MATCH (g:Genre)<-[:HAS_GENRE]-(m:Movie)
RETURN g.name AS Genre, 
       AVG(m.voteAverage) AS AvgRating,
       COUNT(m) AS MovieCount
ORDER BY AvgRating DESC;

// Company analysis
// ---------------

// Production companies and their movies
MATCH (c:Company)<-[r:PRODUCED_BY]-(m:Movie)
WHERE r.role = "production"
RETURN c.name AS Company, 
       COUNT(m) AS MovieCount,
       AVG(m.voteAverage) AS AvgRating
ORDER BY MovieCount DESC;

// Find highest grossing movies by company
MATCH (c:Company)<-[r:PRODUCED_BY]-(m:Movie)
WHERE r.role = "production" AND m.revenue > 0
RETURN c.name AS Company,
       m.originalTitle AS Movie,
       m.revenue AS Revenue
ORDER BY toInteger(m.revenue) DESC
LIMIT 20;

// Actor career analysis
// --------------------

// Actor's filmography with ratings
MATCH (a:Actor)-[r:ACTED_IN]->(m:Movie)
WHERE a.name = "Leonardo DiCaprio"
RETURN m.originalTitle AS Movie,
       m.releaseDate AS ReleaseDate,
       r.characterName AS Character,
       m.voteAverage AS Rating
ORDER BY m.releaseDate DESC;

// Find actors who worked with the most directors
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)<-[r:WORKED_ON]-(d:Person)
WHERE r.jobTitle = "Director"
WITH a, COUNT(DISTINCT d) AS directorCount
RETURN a.name AS Actor, directorCount
ORDER BY directorCount DESC
LIMIT 10;

// TV Show specific queries
// -----------------------

// Find TV shows by genre
MATCH (t:TVShow)-[:HAS_GENRE]->(g:Genre {name: "Drama"})
RETURN t.originalTitle AS ShowTitle, 
       t.numberOfSeasons AS Seasons,
       t.numberOfEpisodes AS Episodes,
       t.voteAverage AS Rating
ORDER BY t.voteAverage DESC;

// Collection analysis
// ------------------

// Movies in collections
MATCH (m:Movie)-[:PART_OF]->(c:Collection)
RETURN c.name AS Collection,
       COLLECT(m.originalTitle) AS Movies,
       COUNT(m) AS MovieCount
ORDER BY MovieCount DESC;

// Advanced analytics
// -----------------

// Find the shortest path between two actors
MATCH path = shortestPath((a1:Actor {name: "Kevin Bacon"})-[*]-(a2:Actor {name: "Tom Cruise"}))
RETURN path;

// Find actors who never worked together but share common co-stars
MATCH (a1:Actor)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(common:Actor)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1.name = "Brad Pitt" 
  AND a2.name = "Leonardo DiCaprio"
  AND NOT EXISTS((a1)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(a2))
RETURN DISTINCT common.name AS CommonCoStar;

// Find most prolific decade for an actor
MATCH (a:Actor {name: "Robert De Niro"})-[:ACTED_IN]->(m:Movie)
WHERE m.releaseDate IS NOT NULL
WITH a, (toInteger(substring(m.releaseDate, 0, 4)) / 10) * 10 AS decade, COUNT(m) AS movieCount
RETURN decade AS Decade, movieCount AS Movies
ORDER BY movieCount DESC;

// Network analysis
// ---------------

// Find the most connected actor (highest degree centrality)
MATCH (a:Actor)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(coActor:Actor)
WHERE a <> coActor
WITH a, COUNT(DISTINCT coActor) AS connections
RETURN a.name AS Actor, connections
ORDER BY connections DESC
LIMIT 10;

// Find clusters of actors who frequently work together
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1.personId < a2.personId
WITH a1, a2, COUNT(m) AS collaborations
WHERE collaborations > 2
RETURN a1.name AS Actor1, a2.name AS Actor2, collaborations
ORDER BY collaborations DESC;