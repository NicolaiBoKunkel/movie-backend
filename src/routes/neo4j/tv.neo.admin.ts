import { Router } from "express";
import { getSession } from "../../db/neo4j";
import { requireAuth, requireRole } from "../../middleware/auth";
import { z } from "zod";

const router = Router();

//ZOD SCHEMA FOR TV Show CREATION / UPDATE
const createTvSchema = z.object({
  mediaId: z.string().min(1),
  tmdbId: z.string().min(1),
  originalTitle: z.string().min(1),
  overview: z.string().optional(),
  firstAirDate: z.string().optional(),
  lastAirDate: z.string().optional(),
  inProduction: z.boolean().optional(),
  numberOfSeasons: z.number().int().optional(),
  numberOfEpisodes: z.number().int().optional(),
  showType: z.string().optional(),
  originalLanguage: z.string().optional(),
  status: z.string().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  genres: z.array(z.string()).optional(),
});

const updateTvSchema = createTvSchema.partial();

//POST /neo/tv (CREATE)
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const parsed = createTvSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const session = getSession();

    try {
      // Create base TVShow node
      await session.run(
        `
        CREATE (t:TVShow)
        SET t = $data
        `,
        { data }
      );

      // Add genres if present
      if (data.genres) {
        for (const g of data.genres) {
          await session.run(
            `
            MERGE (ge:Genre {name: $g})
            WITH ge
            MATCH (t:TVShow {mediaId: $id})
            MERGE (t)-[:HAS_GENRE]->(ge)
            `,
            { g, id: data.mediaId }
          );
        }
      }

      res.status(201).json({ created: true, mediaId: data.mediaId });
    } catch (err) {
      console.error("Neo4j CREATE TV error:", err);
      res.status(500).json({ error: "Failed to create TV show" });
    } finally {
      await session.close();
    }
  }
);

//PUT /neo/tv/:id (UPDATE)
router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const id = req.params.id;
    const parsed = updateTvSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const session = getSession();

    try {
      // Ensure TVShow exists
      const exists = await session.run(
        `MATCH (t:TVShow {mediaId: $id}) RETURN t`,
        { id }
      );

      if (exists.records.length === 0) {
        return res.status(404).json({ error: "TV show not found" });
      }

      // Update all provided fields
      await session.run(
        `
        MATCH (t:TVShow {mediaId: $id})
        SET t += $data
        `,
        { id, data }
      );

      // Update genres if provided
      if (data.genres) {
        // Remove previous relations
        await session.run(
          `
          MATCH (t:TVShow {mediaId: $id})-[r:HAS_GENRE]->(:Genre)
          DELETE r
          `,
          { id }
        );

        // Add new relations
        for (const g of data.genres) {
          await session.run(
            `
            MERGE (ge:Genre {name: $g})
            WITH ge
            MATCH (t:TVShow {mediaId: $id})
            MERGE (t)-[:HAS_GENRE]->(ge)
            `,
            { g, id }
          );
        }
      }

      res.json({ updated: true, mediaId: id });
    } catch (err) {
      console.error("Neo4j UPDATE TV error:", err);
      res.status(500).json({ error: "Failed to update TV show" });
    } finally {
      await session.close();
    }
  }
);


//DELETE /neo/tv/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const id = req.params.id;
    const session = getSession();

    try {
      const result = await session.run(
        `
        MATCH (t:TVShow {mediaId: $id})
        DETACH DELETE t
        RETURN count(*) AS deleted
        `,
        { id }
      );

      const rec = result.records[0];
      const deleted = rec ? rec.get("deleted").toInt() : 0;

      if (deleted === 0) {
        return res.status(404).json({ error: "TV show not found" });
      }

      res.json({ deleted: true, mediaId: id });
    } catch (err) {
      console.error("Neo4j DELETE TV error:", err);
      res.status(500).json({ error: "Failed to delete TV show" });
    } finally {
      await session.close();
    }
  }
);

export default router;
