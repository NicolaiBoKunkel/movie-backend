import { Router } from "express";
import MongoDataSource from "../../db/mongoDataSource";
import { TVShowMongo } from "../../entities/mongo/TVShowMongo";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

// Deep merge helper for nested updates
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

// ZOD SCHEMA — CREATE TV SHOW
const createTVSchema = z.object({
  mediaId: z.string().min(1),

  firstAirDate: z.string().optional(),
  lastAirDate: z.string().optional(),

  inProduction: z.boolean(),
  numberOfSeasons: z.number(),
  numberOfEpisodes: z.number(),

  showType: z.string().optional(),

  seasons: z.array(z.any()).default([]),

  mediaItem: z.object({
    mediaId: z.string(),
    tmdbId: z.string().optional(),
    mediaType: z.string(),
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

// ZOD SCHEMA — UPDATE TV SHOW (PATCH)
const updateTVSchema = z.object({
  mediaId: z.string().optional(),

  firstAirDate: z.string().optional(),
  lastAirDate: z.string().optional(),

  inProduction: z.boolean().optional(),
  numberOfSeasons: z.number().optional(),
  numberOfEpisodes: z.number().optional(),

  showType: z.string().optional(),

  seasons: z.array(z.any()).optional(),

  mediaItem: z.object({
    mediaId: z.string().optional(),
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
  }).optional(),
});

// POST /mongo/tv  — Create full TV show
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = createTVSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  const data = parsed.data;

  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);

    const existing = await tvRepo.findOne({
      where: { mediaId: data.mediaId },
    });

    if (existing) {
      return res.status(409).json({
        error: "TV show already exists",
        mediaId: data.mediaId,
      });
    }

    const tvToInsert = {
      ...data,
      firstAirDate: data.firstAirDate ? new Date(data.firstAirDate) : undefined,
      lastAirDate: data.lastAirDate ? new Date(data.lastAirDate) : undefined,
    } as any;

    const result = await tvRepo.insert(tvToInsert);

    res.status(201).json({
      created: true,
      mediaId: data.mediaId,
      insertedId: result.identifiers[0]?._id,
    });
  } catch (err) {
    console.error("Mongo CREATE tv error:", err);
    res.status(500).json({ error: "Failed to create TV show" });
  }
});

// PUT /mongo/tv/:mediaId — Update nested fields safely
router.put("/:mediaId", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = updateTVSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  const data = parsed.data;

  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);

    const existing = await tvRepo.findOne({
      where: { mediaId: req.params.mediaId },
    });

    if (!existing) {
      return res.status(404).json({ error: "TV show not found" });
    }

    const updatedTV = deepMerge(existing, data);

    if (data.firstAirDate) updatedTV.firstAirDate = new Date(data.firstAirDate);
    if (data.lastAirDate) updatedTV.lastAirDate = new Date(data.lastAirDate);

    await tvRepo.update(existing._id!, updatedTV as any);

    res.json({
      updated: true,
      mediaId: existing.mediaId,
    });
  } catch (err) {
    console.error("Mongo UPDATE tv error:", err);
    res.status(500).json({ error: "Failed to update TV show" });
  }
});

// DELETE /mongo/tv/:mediaId
router.delete("/:mediaId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);

    const result = await tvRepo.deleteOne({ mediaId: req.params.mediaId });

    if (result?.deletedCount === 0) {
      return res.status(404).json({ error: "TV show not found" });
    }

    res.json({ deleted: true, mediaId: req.params.mediaId });
  } catch (err) {
    console.error("Mongo DELETE tv error:", err);
    res.status(500).json({ error: "Failed to delete TV show" });
  }
});

export default router;
