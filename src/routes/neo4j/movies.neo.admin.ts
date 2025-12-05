import { Router } from "express";
import { getSession } from "../../db/neo4j";
import { requireAuth, requireRole } from "../../middleware/auth";
import { z } from "zod";

const router = Router();

// ZOD SCHEMA FOR MOVIE CREATION / UPDATE
const createMovieSchema = z.object({
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

  // Movie-specific fields
  releaseDate: z.string().optional(),
  budget: z.number().optional(),
  revenue: z.number().optional(),
  adultFlag: z.boolean().optional(),
  runtimeMinutes: z.number().optional(),

  genres: z.array(z.string()).optional(),
});

// POST /neo/movies  (CREATE)
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const parsed = createMovieSchema.safeParse(req.body);
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
        mediaType: "movie",
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

      // --- Create MediaItem node ---
      await session.run(
        `
        MERGE (mi:MediaItem {mediaId: $mediaId})
        SET ${mediaItemSets.join(', ')}
        `,
        mediaItemParams
      );

      // Build Movie SET clauses
      const movieSets: string[] = [];
      const movieParams: any = {
        mediaId: data.mediaId,
      };
      
      if (data.releaseDate !== undefined) {
        movieSets.push('m.releaseDate = $releaseDate');
        movieParams.releaseDate = data.releaseDate;
      }
      if (data.budget !== undefined) {
        movieSets.push('m.budget = $budget');
        movieParams.budget = data.budget;
      }
      if (data.revenue !== undefined) {
        movieSets.push('m.revenue = $revenue');
        movieParams.revenue = data.revenue;
      }
      if (data.adultFlag !== undefined) {
        movieSets.push('m.adultFlag = $adultFlag');
        movieParams.adultFlag = data.adultFlag;
      }
      if (data.runtimeMinutes !== undefined) {
        movieSets.push('m.runtimeMinutes = $runtimeMinutes');
        movieParams.runtimeMinutes = data.runtimeMinutes;
      }

      // --- Create Movie node ---
      if (movieSets.length > 0) {
        await session.run(
          `
          MERGE (m:Movie {mediaId: $mediaId})
          SET ${movieSets.join(', ')}
          `,
          movieParams
        );
      } else {
        await session.run(
          `MERGE (m:Movie {mediaId: $mediaId})`,
          movieParams
        );
      }

      // --- Create IS_MOVIE relationship ---
      await session.run(
        `
        MATCH (mi:MediaItem {mediaId: $mediaId})
        WITH mi
        MATCH (m:Movie {mediaId: $mediaId})
        MERGE (mi)-[:IS_MOVIE]->(m)
        `,
        { mediaId: data.mediaId }
      );

      // --- Genres ---
      if (data.genres && data.genres.length > 0) {
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
      console.error("Neo4j CREATE movie error:", err);
      res.status(500).json({ error: "Failed to create movie" });
    } finally {
      await session.close();
    }
  }
);

// PUT /neo/movies/:id (UPDATE)
const updateSchema = createMovieSchema.partial();

router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const id = req.params.id;

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const session = getSession();

    try {
      // Ensure MediaItem exists
      const check = await session.run(
        `MATCH (mi:MediaItem {mediaId: $id, mediaType: "movie"}) RETURN mi`,
        { id }
      );

      if (check.records.length === 0) {
        return res.status(404).json({ error: "Movie not found" });
      }

      // Update MediaItem fields
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

      // Update Movie-specific fields
      await session.run(
        `
        MATCH (m:Movie {mediaId: $id})
        SET m += $movieUpdates
        `,
        {
          id,
          movieUpdates: {
            releaseDate: data.releaseDate,
            budget: data.budget,
            revenue: data.revenue,
            adultFlag: data.adultFlag,
            runtimeMinutes: data.runtimeMinutes,
          },
        }
      );

      // Update genres
      if (data.genres) {
        // Remove old genres
        await session.run(
          `
          MATCH (mi:MediaItem {mediaId: $id})-[r:HAS_GENRE]->(:Genre)
          DELETE r
          `,
          { id }
        );

        // Add new ones
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
      console.error("Neo4j UPDATE movie error:", err);
      res.status(500).json({ error: "Failed to update movie" });
    } finally {
      await session.close();
    }
  }
);

// DELETE /neo/movies/:id
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
        MATCH (mi:MediaItem {mediaId: $id, mediaType: "movie"})
        OPTIONAL MATCH (mi)-[:IS_MOVIE]->(m:Movie)
        DETACH DELETE mi, m
        RETURN count(*) AS deleted
        `,
        { id }
      );

      const deleted = result.records[0]?.get("deleted")?.toInt?.() ?? 0;

      if (deleted === 0) {
        return res.status(404).json({ error: "Movie not found" });
      }

      res.json({ deleted: true, mediaId: id });
    } catch (err) {
      console.error("Neo4j DELETE movie error:", err);
      res.status(500).json({ error: "Failed to delete movie" });
    } finally {
      await session.close();
    }
  }
);

export default router;
