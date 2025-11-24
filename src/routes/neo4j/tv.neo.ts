import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j from "neo4j-driver";

const router = Router();

/**
 * GET /neo/tv
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
      // Search TV shows by title or overview
      result = await session.run(
        `
        MATCH (t:TVShow)
        WHERE toLower(t.originalTitle) CONTAINS toLower($search)
           OR toLower(t.overview) CONTAINS toLower($search)
        RETURN t
        LIMIT $limit
      `,
        { search, limit: limitInt }
      );
    } else {
      result = await session.run(
        `
        MATCH (t:TVShow)
        RETURN t
        LIMIT $limit
      `,
        { limit: limitInt }
      );
    }

    const shows = result.records.map((r) => r.get("t").properties);
    res.json(shows);

  } catch (err) {
    console.error("Neo4j GET /tv error:", err);
    res.status(500).json({ error: "Neo4j query failed" });

  } finally {
    await session.close();
  }
});


/**
 * GET /neo/tv/:id
 * Returns detailed TV show info + genres
 */
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (t:TVShow {mediaId: $id})
      OPTIONAL MATCH (t)-[:HAS_GENRE]->(g:Genre)
      RETURN t, collect(g.name) AS genres
      LIMIT 1
      `,
      { id }
    );

    const record = result.records[0];
    if (!record) return res.status(404).json({ error: "TV show not found" });

    const tvNode = record.get("t");
    const genreList = record.get("genres");

    const tv = tvNode?.properties ?? {};
    const genres = Array.isArray(genreList) ? genreList : [];

    res.json({ ...tv, genres });

  } catch (err) {
    console.error("Neo4j GET /tv/:id error:", err);
    res.status(500).json({ error: "Neo4j query failed" });

  } finally {
    await session.close();
  }
});

export default router;
