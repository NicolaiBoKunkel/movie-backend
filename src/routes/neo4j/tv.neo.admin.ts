import { Router } from "express";
import { getSession } from "../../db/neo4j";
import { requireAuth, requireRole } from "../../middleware/auth";
import { z } from "zod";

const router = Router();

const createTvSchema = z.object({
  mediaId: z.string().min(1),
  tmdbId: z.string().min(1),
  originalTitle: z.string().min(1),
  overview: z.string().optional(),
  originalLanguage: z.string().optional(),
  status: z.string().optional(),
  popularity: z.number().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  voteCount: z.number().optional(),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  homepageUrl: z.string().optional(),

  firstAirDate: z.string().optional(),
  lastAirDate: z.string().optional(),
  inProduction: z.boolean().optional(),
  numberOfSeasons: z.number().int().optional(),
  numberOfEpisodes: z.number().int().optional(),
  showType: z.string().optional(),

  genres: z.array(z.string()).optional(),
});

const updateTvSchema = createTvSchema.partial();

//
// POST /neo/tv (CREATE)
//
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
      //
      // Create MediaItem (shared fields)
      //
      await session.run(
        `
        MERGE (mi:MediaItem {mediaId: $mediaId})
        SET mi += {
          mediaType: "tv",
          tmdbId: $tmdbId,
          originalTitle: $originalTitle,
          overview: $overview,
          originalLanguage: $originalLanguage,
          status: $status,
          popularity: $popularity,
          voteAverage: $voteAverage,
          voteCount: $voteCount,
          posterPath: $posterPath,
          backdropPath: $backdropPath,
          homepageUrl: $homepageUrl
        }
        `,
        data
      );

      //
      // Create TVShow (TV-specific fields)
      //
      await session.run(
        `
        MERGE (t:TVShow {mediaId: $mediaId})
        SET t += {
          firstAirDate: $firstAirDate,
          lastAirDate: $lastAirDate,
          inProduction: $inProduction,
          numberOfSeasons: $numberOfSeasons,
          numberOfEpisodes: $numberOfEpisodes,
          showType: $showType
        }
        `,
        data
      );

      //
      // Link MediaItem -> TVShow
      //
      await session.run(
        `
        MATCH (mi:MediaItem {mediaId: $mediaId})
        MATCH (t:TVShow {mediaId: $mediaId})
        MERGE (mi)-[:IS_TV_SHOW]->(t)
        `,
        { mediaId: data.mediaId }
      );

      //
      // Genres (attach to MediaItem)
      //
      if (data.genres) {
        for (const g of data.genres) {
          await session.run(
            `
              MERGE (ge:Genre {name: $g})
              WITH ge, $mediaId AS mediaId
              MATCH (mi:MediaItem {mediaId: mediaId})
              MERGE (mi)-[:HAS_GENRE]->(ge)
            `,
            { g, mediaId: data.mediaId }
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

//
// PUT /neo/tv/:id (UPDATE)
//
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
      //
      // Make sure this TV show exists
      //
      const exists = await session.run(
        `MATCH (mi:MediaItem {mediaId: $id, mediaType: "tv"}) RETURN mi`,
        { id }
      );

      if (exists.records.length === 0) {
        return res.status(404).json({ error: "TV show not found" });
      }

      //
      // Update MediaItem
      //
      await session.run(
        `
        MATCH (mi:MediaItem {mediaId: $id})
        SET mi += $mediaUpdates
        `,
        {
          id,
          mediaUpdates: {
            tmdbId: data.tmdbId,
            originalTitle: data.originalTitle,
            overview: data.overview,
            originalLanguage: data.originalLanguage,
            status: data.status,
            popularity: data.popularity,
            voteAverage: data.voteAverage,
            voteCount: data.voteCount,
            posterPath: data.posterPath,
            backdropPath: data.backdropPath,
            homepageUrl: data.homepageUrl,
          },
        }
      );

      //
      // Update TVShow-specific fields
      //
      await session.run(
        `
        MATCH (t:TVShow {mediaId: $id})
        SET t += $tvUpdates
        `,
        {
          id,
          tvUpdates: {
            firstAirDate: data.firstAirDate,
            lastAirDate: data.lastAirDate,
            inProduction: data.inProduction,
            numberOfSeasons: data.numberOfSeasons,
            numberOfEpisodes: data.numberOfEpisodes,
            showType: data.showType,
          },
        }
      );

      //
      // Update genres
      //
      if (data.genres) {
        // Delete old relationships
        await session.run(
          `
          MATCH (mi:MediaItem {mediaId: $id})-[r:HAS_GENRE]->(:Genre)
          DELETE r
          `,
          { id }
        );

        // Add new genres
        for (const g of data.genres) {
          await session.run(
            `
              MERGE (ge:Genre {name: $g})
              WITH ge, $id AS id
              MATCH (mi:MediaItem {mediaId: id})
              MERGE (mi)-[:HAS_GENRE]->(ge)
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

//
// DELETE /neo/tv/:id
//
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
        MATCH (mi:MediaItem {mediaId: $id, mediaType: "tv"})
        OPTIONAL MATCH (mi)-[:IS_TV_SHOW]->(t:TVShow)
        DETACH DELETE mi, t
        RETURN count(*) AS deleted
        `,
        { id }
      );

      const deleted = result.records[0]?.get("deleted")?.toInt?.() ?? 0;

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
