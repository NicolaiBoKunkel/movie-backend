import { Router } from "express";
import { getSession } from "../../db/neo4j";
import { requireAuth, requireRole } from "../../middleware/auth";
import { z } from "zod";

const router = Router();

// ZOD SCHEMA FOR TV SHOW CREATION / UPDATE
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

  // TVShow-specific fields
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
      // Build SET clauses dynamically based on what's provided
      const mediaItemSets: string[] = [
        'mi.mediaType = $mediaType',
        'mi.tmdbId = $tmdbId',
        'mi.originalTitle = $originalTitle'
      ];
      
      const mediaItemParams: any = {
        mediaId: data.mediaId,
        mediaType: "tv",
        tmdbId: data.tmdbId,
        originalTitle: data.originalTitle,
      };
      
      if (data.overview !== undefined) {
        mediaItemSets.push('mi.overview = $overview');
        mediaItemParams.overview = data.overview;
      }
      if (data.originalLanguage !== undefined) {
        mediaItemSets.push('mi.originalLanguage = $originalLanguage');
        mediaItemParams.originalLanguage = data.originalLanguage;
      }
      if (data.status !== undefined) {
        mediaItemSets.push('mi.status = $status');
        mediaItemParams.status = data.status;
      }
      if (data.popularity !== undefined) {
        mediaItemSets.push('mi.popularity = $popularity');
        mediaItemParams.popularity = data.popularity;
      }
      if (data.voteAverage !== undefined) {
        mediaItemSets.push('mi.voteAverage = $voteAverage');
        mediaItemParams.voteAverage = data.voteAverage;
      }
      if (data.voteCount !== undefined) {
        mediaItemSets.push('mi.voteCount = $voteCount');
        mediaItemParams.voteCount = data.voteCount;
      }
      if (data.posterPath !== undefined) {
        mediaItemSets.push('mi.posterPath = $posterPath');
        mediaItemParams.posterPath = data.posterPath;
      }
      if (data.backdropPath !== undefined) {
        mediaItemSets.push('mi.backdropPath = $backdropPath');
        mediaItemParams.backdropPath = data.backdropPath;
      }
      if (data.homepageUrl !== undefined) {
        mediaItemSets.push('mi.homepageUrl = $homepageUrl');
        mediaItemParams.homepageUrl = data.homepageUrl;
      }

      //
      // Create MediaItem (shared fields)
      //
      await session.run(
        `
        MERGE (mi:MediaItem {mediaId: $mediaId})
        SET ${mediaItemSets.join(', ')}
        `,
        mediaItemParams
      );

      // Build TVShow SET clauses
      const tvSets: string[] = [];
      const tvParams: any = {
        mediaId: data.mediaId,
      };
      
      if (data.firstAirDate !== undefined) {
        tvSets.push('t.firstAirDate = $firstAirDate');
        tvParams.firstAirDate = data.firstAirDate;
      }
      if (data.lastAirDate !== undefined) {
        tvSets.push('t.lastAirDate = $lastAirDate');
        tvParams.lastAirDate = data.lastAirDate;
      }
      if (data.inProduction !== undefined) {
        tvSets.push('t.inProduction = $inProduction');
        tvParams.inProduction = data.inProduction;
      }
      if (data.numberOfSeasons !== undefined) {
        tvSets.push('t.numberOfSeasons = $numberOfSeasons');
        tvParams.numberOfSeasons = data.numberOfSeasons;
      }
      if (data.numberOfEpisodes !== undefined) {
        tvSets.push('t.numberOfEpisodes = $numberOfEpisodes');
        tvParams.numberOfEpisodes = data.numberOfEpisodes;
      }
      if (data.showType !== undefined) {
        tvSets.push('t.showType = $showType');
        tvParams.showType = data.showType;
      }

      //
      // Create TVShow (TV-specific fields)
      //
      if (tvSets.length > 0) {
        await session.run(
          `
          MERGE (t:TVShow {mediaId: $mediaId})
          SET ${tvSets.join(', ')}
          `,
          tvParams
        );
      } else {
        await session.run(
          `MERGE (t:TVShow {mediaId: $mediaId})`,
          tvParams
        );
      }

      //
      // Link MediaItem -> TVShow
      //
      await session.run(
        `
        MATCH (mi:MediaItem {mediaId: $mediaId})
        WITH mi
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
            WITH ge
            MATCH (mi:MediaItem {mediaId: $mediaId})
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
            MATCH (mi:MediaItem {mediaId: $id})
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
