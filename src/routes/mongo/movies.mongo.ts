import { Router } from "express";
import { getMongoCollection } from "../../db/getMongoCollection";

const router = Router();

function mapMongoMovieSummary(doc: any) {
  const m = doc.mediaItem ?? {};

  const originalTitle =
    m.originalTitle ??
    doc.originalTitle ??
    "";

  const voteAverage =
    m.voteAverage ??
    doc.voteAverage ??
    0;

  const genres =
    (Array.isArray(m.genres) && m.genres.length > 0)
      ? m.genres.map((g: any) => g.name)
      : (Array.isArray(doc.genres)
          ? doc.genres.map((g: any) => g.name)
          : []);

  return {
    mediaId: String(doc.mediaId),
    originalTitle,
    voteAverage: Number(voteAverage),
    genres,
    posterPath: m.posterPath ?? doc.posterPath ?? null,
    backdropPath: m.backdropPath ?? doc.backdropPath ?? null,
  };
}

function mapMongoMovie(doc: any) {
  const m = doc.mediaItem ?? {};

  const newMovie = m.movie ?? {};

  const oldMovie = doc.movie ?? {};

  const mv = Object.keys(newMovie).length > 0 ? newMovie : oldMovie;

  const originalTitle =
    m.originalTitle ??
    doc.originalTitle ??
    "";

  const overview =
    m.overview ??
    doc.overview ??
    null;

  const originalLanguage =
    m.originalLanguage ??
    doc.originalLanguage ??
    "";

  const status =
    m.status ??
    doc.status ??
    null;

  const popularity =
    m.popularity ??
    doc.popularity ??
    null;

  const voteAverage =
    m.voteAverage ??
    doc.voteAverage ??
    0;

  const voteCount =
    m.voteCount ??
    doc.voteCount ??
    null;

  const posterPath =
    m.posterPath ??
    doc.posterPath ??
    null;

  const backdropPath =
    m.backdropPath ??
    doc.backdropPath ??
    null;

  const homepageUrl =
    m.homepageUrl ??
    doc.homepageUrl ??
    null;

  const genres =
    (Array.isArray(m.genres) && m.genres.length > 0)
      ? m.genres.map((g: any) => g.name)
      : (Array.isArray(doc.genres)
          ? doc.genres.map((g: any) => g.name)
          : []);

  const cast =
    (Array.isArray(m.cast) && m.cast.length > 0)
      ? m.cast
      : (doc.cast ?? []);

  const crew =
    (Array.isArray(m.crew) && m.crew.length > 0)
      ? m.crew
      : (doc.crew ?? []);

  const companies =
    (Array.isArray(m.companies) && m.companies.length > 0)
      ? m.companies
      : (doc.companies ?? []);

  return {
    mediaId: String(doc.mediaId),
    tmdbId: m.tmdbId ?? doc.tmdbId ?? "",
    mediaType: "movie",

    originalTitle,
    overview,
    originalLanguage,
    status,

    popularity,
    voteAverage: Number(voteAverage),
    voteCount,

    releaseDate: mv.releaseDate ?? null,
    budget: mv.budget ?? null,
    revenue: mv.revenue ?? null,
    adultFlag: Boolean(mv.adultFlag),
    runtimeMinutes: mv.runtimeMinutes ?? null,
    collectionId: mv.collectionId ?? null,

    posterPath,
    backdropPath,
    homepageUrl,

    genres,
    cast,
    crew,
    companies,
  };
}

router.get("/", async (req, res) => {
  try {
    const collection = getMongoCollection("movie_full_example");
    const search = (req.query.search as string)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    let docs;

    if (search.length > 0) {
      docs = await collection
        .find({
          $or: [
            { "mediaItem.originalTitle": { $regex: search, $options: "i" } },
            { "mediaItem.overview": { $regex: search, $options: "i" } },
            { originalTitle: { $regex: search, $options: "i" } },
            { overview: { $regex: search, $options: "i" } },
          ],
        })
        .limit(limit)
        .toArray();
    } else {
      docs = await collection.find({}).limit(limit).toArray();
    }

    res.json(docs.map(mapMongoMovieSummary));
  } catch (err) {
    console.error("Mongo GET /mongo/movies error:", err);
    res.status(500).json({ error: "MongoDB query failed" });
  }
});

router.get("/:mediaId", async (req, res) => {
  try {
    const collection = getMongoCollection("movie_full_example");

    const doc = await collection.findOne({
      mediaId: req.params.mediaId,
    });

    if (!doc) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(mapMongoMovie(doc));
  } catch (err) {
    console.error("Mongo GET /mongo/movies/:id error:", err);
    res.status(500).json({ error: "MongoDB lookup failed" });
  }
});

export default router;
