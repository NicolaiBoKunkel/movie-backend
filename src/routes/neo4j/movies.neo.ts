import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j from "neo4j-driver";

const router = Router();

/**
 * GET /neo/movies
 * Query params:
 *   search?: string
 *   limit?: number
 */
router.get("/", async (req, res) => {
  const session = getSession();

  const search = (req.query.search as string)?.trim() ?? "";
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  const limitInt = neo4j.int(limit);

  try {
    let result;

    if (search.length > 0) {
      result = await session.run(
        `
        MATCH (m:Movie)
        WHERE toLower(m.originalTitle) CONTAINS toLower($search)
           OR toLower(m.overview) CONTAINS toLower($search)
        RETURN m
        LIMIT $limit
      `,
        { search, limit: limitInt }
      );
    } else {
      result = await session.run(
        `
        MATCH (m:Movie)
        RETURN m
        LIMIT $limit
      `,
        { limit: limitInt }
      );
    }

    const movies = result.records.map((r) => r.get("m").properties);
    res.json(movies);
  } catch (err) {
    console.error("Neo4j GET /movies error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});

/**
 * GET /neo/movies/:id
 */
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (m:Movie {mediaId: $id})
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
      RETURN m, collect(g.name) AS genres
      LIMIT 1
      `,
      { id }
    );

    const record = result.records[0];
    if (!record) return res.status(404).json({ error: "Movie not found" });

    const movieNode = record.get("m");
    const genreList = record.get("genres");

    const movie = movieNode?.properties ?? {};
    const genres = Array.isArray(genreList) ? genreList : [];

    res.json({ ...movie, genres });
  } catch (err) {
    console.error("Neo4j GET /movies/:id error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});

export default router;
