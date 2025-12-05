import { Router } from "express";
import MongoDataSource from "../../db/mongoDataSource";
import { MovieMongo } from "../../entities/mongo/MovieMongo";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    const value = source[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const createMovieSchema = z.object({
  mediaId: z.string().min(1),
  releaseDate: z.string().optional(),
  budget: z.number(),
  revenue: z.number(),
  adultFlag: z.boolean(),
  runtimeMinutes: z.number().optional(),
  collectionId: z.string().optional(),
  collection: z.any().optional(),

  mediaItem: z.object({
    tmdbId: z.string().optional(),
    mediaType: z.string().optional(),
    originalTitle: z.string(),
    overview: z.string().optional(),
    originalLanguage: z.string().optional(),
    status: z.string().optional(),
    popularity: z.number(),
    voteAverage: z.number(),
    voteCount: z.number(),
    posterPath: z.string().optional(),
    backdropPath: z.string().optional(),
    homepageUrl: z.string().optional(),
    movie: z.any().optional(),
    tvShow: z.any().optional(),
    genres: z.array(z.any()).default([]),
    companies: z.array(z.any()).default([]),
    cast: z.array(z.any()).default([]),
    crew: z.array(z.any()).default([]),
  }),
});

const updateMovieSchema = z.object({
  mediaId: z.string().optional(),
  releaseDate: z.string().optional(),
  budget: z.number().optional(),
  revenue: z.number().optional(),
  adultFlag: z.boolean().optional(),
  runtimeMinutes: z.number().optional(),
  collectionId: z.string().optional(),
  collection: z.any().optional(),

  mediaItem: z
    .object({
      tmdbId: z.string().optional(),
      mediaType: z.string().optional(),
      originalTitle: z.string().optional(),
      overview: z.string().optional(),
      originalLanguage: z.string().optional(),
      status: z.string().optional(),
      popularity: z.number().optional(),
      voteAverage: z.number().optional(),
      voteCount: z.number().optional(),
      posterPath: z.string().optional(),
      backdropPath: z.string().optional(),
      homepageUrl: z.string().optional(),
      movie: z.any().optional(),
      tvShow: z.any().optional(),
      genres: z.array(z.any()).optional(),
      companies: z.array(z.any()).optional(),
      cast: z.array(z.any()).optional(),
      crew: z.array(z.any()).optional(),
    })
    .optional(),
});

// POST /mongo/movies
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = createMovieSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  const data = parsed.data;

  try {
    const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

    const existing = await movieRepo.findOne({
      where: { mediaId: data.mediaId },
    });

    if (existing) {
      return res.status(409).json({
        error: "Movie already exists",
        mediaId: data.mediaId,
      });
    }

    const movieToInsert: any = {
      ...data,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
      mediaItem: {
        ...data.mediaItem,
        mediaType: "movie",
      },
    };

    const result = await movieRepo.insert(movieToInsert);

    res.status(201).json({
      created: true,
      mediaId: data.mediaId,
      insertedId: result.identifiers[0]?._id,
    });
  } catch (err) {
    console.error("Mongo CREATE movie error:", err);
    res.status(500).json({ error: "Failed to create movie" });
  }
});

// PUT /mongo/movies/:mediaId
router.put(
  "/:mediaId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const parsed = updateMovieSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: parsed.error.issues,
      });
    }

    const data = parsed.data;

    try {
      const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

      const existing = await movieRepo.findOne({
        where: { mediaId: req.params.mediaId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Movie not found" });
      }

      const updatedMovie: any = deepMerge(existing, data);

      if (data.releaseDate) {
        updatedMovie.releaseDate = new Date(data.releaseDate);
      }

      if (updatedMovie.mediaItem) {
        updatedMovie.mediaItem.mediaType = "movie";
      }

      await movieRepo.save(updatedMovie);

      res.json({
        updated: true,
        mediaId: existing.mediaId,
      });
    } catch (err) {
      console.error("Mongo UPDATE movie error:", err);
      res.status(500).json({ error: "Failed to update movie" });
    }
  }
);

// DELETE /mongo/movies/:mediaId
router.delete(
  "/:mediaId",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

      const result = await movieRepo.deleteOne({
        mediaId: req.params.mediaId,
      });

      if (result?.deletedCount === 0) {
        return res.status(404).json({ error: "Movie not found" });
      }

      res.json({ deleted: true, mediaId: req.params.mediaId });
    } catch (err) {
      console.error("Mongo DELETE movie error:", err);
      res.status(500).json({ error: "Failed to delete movie" });
    }
  }
);

export default router;
