import { Router } from "express";
import { z } from "zod";
import { getMongoCollection } from "../../db/getMongoCollection";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

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
    posterPath: z.string().nullable().optional(),
    backdropPath: z.string().nullable().optional(),
    homepageUrl: z.string().nullable().optional(),

    movie: z.any().optional(),
    tvShow: z.any().optional(),

    genres: z.array(z.any()).default([]),
    companies: z.array(z.any()).default([]),
    cast: z.array(z.any()).default([]),
    crew: z.array(z.any()).default([]),
  }),
});

const updateMovieSchema = createMovieSchema.partial();

function normalizeMovieFields(data: any) {
  if (!data.mediaItem) data.mediaItem = {};
  if (!data.mediaItem.movie) data.mediaItem.movie = {};

  const mv = data.mediaItem.movie;

  if (data.releaseDate !== undefined)
    mv.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;

  if (data.budget !== undefined) mv.budget = data.budget;
  if (data.revenue !== undefined) mv.revenue = data.revenue;
  if (data.adultFlag !== undefined) mv.adultFlag = data.adultFlag;
  if (data.runtimeMinutes !== undefined) mv.runtimeMinutes = data.runtimeMinutes;
  if (data.collectionId !== undefined) mv.collectionId = data.collectionId ?? null;
  if (data.collection !== undefined) mv.collection = data.collection ?? null;

  return data;
}

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

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = createMovieSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  let data = parsed.data;

  data = normalizeMovieFields(data);

  try {
    const collection = getMongoCollection("movie_full_example");

    const existing = await collection.findOne({ mediaId: data.mediaId });
    if (existing) {
      return res.status(409).json({
        error: "Movie already exists",
        mediaId: data.mediaId,
      });
    }

    delete data.mediaItem.tvShow;

    data.mediaItem.mediaType = "movie";

    const result = await collection.insertOne(data);

    res.status(201).json({
      created: true,
      mediaId: data.mediaId,
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error("Mongo CREATE movie error:", err);
    res.status(500).json({ error: "Failed to create movie" });
  }
});

router.put("/:mediaId", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = updateMovieSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  let data = parsed.data;

  data = normalizeMovieFields(data);

  try {
    const collection = getMongoCollection("movie_full_example");

    const existing = await collection.findOne({ mediaId: req.params.mediaId });
    if (!existing) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const updatedMovie = deepMerge(existing, data);

    updatedMovie.mediaItem.mediaType = "movie";
    delete updatedMovie.mediaItem.tvShow;

    await collection.replaceOne({ mediaId: req.params.mediaId }, updatedMovie);

    res.json({ updated: true, mediaId: req.params.mediaId });
  } catch (err) {
    console.error("Mongo UPDATE movie error:", err);
    res.status(500).json({ error: "Failed to update movie" });
  }
});

router.delete("/:mediaId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const collection = getMongoCollection("movie_full_example");

    const result = await collection.deleteOne({ mediaId: req.params.mediaId });

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json({ deleted: true, mediaId: req.params.mediaId });
  } catch (err) {
    console.error("Mongo DELETE movie error:", err);
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

export default router;
