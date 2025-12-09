import { Router } from "express";
import { getMongoCollection } from "../../db/getMongoCollection";
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

const updateTVSchema = createTVSchema.partial();

function normalizeTvFields(data: any) {
  if (!data.mediaItem) data.mediaItem = {};
  if (!data.mediaItem.tvShow) data.mediaItem.tvShow = {};

  const tv = data.mediaItem.tvShow;

  if (data.seasons !== undefined) {
    tv.seasons = data.seasons;
    delete data.seasons;
  }

  if (data.inProduction !== undefined) tv.inProduction = data.inProduction;
  if (data.numberOfSeasons !== undefined) tv.numberOfSeasons = data.numberOfSeasons;
  if (data.numberOfEpisodes !== undefined) tv.numberOfEpisodes = data.numberOfEpisodes;
  if (data.showType !== undefined) tv.showType = data.showType;

  if (data.firstAirDate !== undefined)
    tv.firstAirDate = data.firstAirDate ? new Date(data.firstAirDate) : null;

  if (data.lastAirDate !== undefined)
    tv.lastAirDate = data.lastAirDate ? new Date(data.lastAirDate) : null;

  return data;
}

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = createTVSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  let data = parsed.data;

  data = normalizeTvFields(data);

  try {
    const collection = getMongoCollection("tvshow_full_example");

    const existing = await collection.findOne({ mediaId: data.mediaId });
    if (existing) {
      return res.status(409).json({
        error: "TV show already exists",
        mediaId: data.mediaId,
      });
    }

    data.mediaItem.mediaType = "tv";

    const result = await collection.insertOne(data);

    res.status(201).json({
      created: true,
      mediaId: data.mediaId,
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error("Mongo CREATE tv error:", err);
    res.status(500).json({ error: "Failed to create TV show" });
  }
});

router.put("/:mediaId", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = updateTVSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  let data = parsed.data;

  data = normalizeTvFields(data);

  try {
    const collection = getMongoCollection("tvshow_full_example");

    const existing = await collection.findOne({ mediaId: req.params.mediaId });
    if (!existing) {
      return res.status(404).json({ error: "TV show not found" });
    }

    const updatedTV = deepMerge(existing, data);

    updatedTV.mediaItem.mediaType = "tv";

    await collection.replaceOne(
      { mediaId: req.params.mediaId },
      updatedTV
    );

    res.json({ updated: true, mediaId: existing.mediaId });
  } catch (err) {
    console.error("Mongo UPDATE tv error:", err);
    res.status(500).json({ error: "Failed to update TV show" });
  }
});

router.delete("/:mediaId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const collection = getMongoCollection("tvshow_full_example");

    const result = await collection.deleteOne({ mediaId: req.params.mediaId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "TV show not found" });
    }

    res.json({
      deleted: true,
      mediaId: req.params.mediaId,
    });
  } catch (err) {
    console.error("Mongo DELETE tv error:", err);
    res.status(500).json({ error: "Failed to delete TV show" });
  }
});

export default router;
