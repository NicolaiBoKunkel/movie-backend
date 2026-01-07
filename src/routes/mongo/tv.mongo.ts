import { Router } from "express";
import { getMongoCollection } from "../../db/getMongoCollection";

const router = Router();

function mapMongoTvSummary(doc: any) {
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
      : (Array.isArray(doc.genres) ? doc.genres.map((g: any) => g.name) : []);

  return {
    mediaId: String(doc.mediaId),
    originalTitle,
    voteAverage: Number(voteAverage),
    genres,
    posterPath: m.posterPath ?? doc.posterPath ?? null,
    backdropPath: m.backdropPath ?? doc.backdropPath ?? null,
  };
}

function mapMongoTvShow(doc: any) {
  const m = doc.mediaItem ?? {};

  const newTv = m.tvShow ?? {};

  const oldTv = doc.tvShow ?? {};

  const tv = Object.keys(newTv).length > 0 ? newTv : oldTv;

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

  const companies =
    (Array.isArray(m.companies) && m.companies.length > 0)
      ? m.companies
      : (doc.companies ?? []);

  const cast =
    (Array.isArray(m.cast) && m.cast.length > 0)
      ? m.cast
      : (doc.cast ?? []);

  const crew =
    (Array.isArray(m.crew) && m.crew.length > 0)
      ? m.crew
      : (doc.crew ?? []);

  const seasons =
    (Array.isArray(tv.seasons) ? tv.seasons : []).map((s: any) => ({
      seasonId: String(s.seasonId ?? ""),
      seasonNumber: Number(s.seasonNumber ?? 0),
      name: s.name ?? null,
      airDate: s.airDate ?? null,
      episodeCount: Number(s.episodeCount ?? 0),
      posterPath: s.posterPath ?? null,
      episodes: Array.isArray(s.episodes)
        ? s.episodes.map((e: any) => ({
            episodeId: String(e.episodeId ?? ""),
            episodeNumber: Number(e.episodeNumber ?? 0),
            name: e.name ?? null,
            airDate: e.airDate ?? null,
            runtimeMinutes: e.runtimeMinutes ?? null,
            overview: e.overview ?? null,
            stillPath: e.stillPath ?? null,
          }))
        : [],
    }));

  return {
    mediaId: String(doc.mediaId),
    tmdbId: m.tmdbId ?? doc.tmdbId ?? "",
    mediaType: "tv",

    originalTitle,
    overview,
    originalLanguage,
    status,

    popularity,
    voteAverage: Number(voteAverage),
    voteCount,

    firstAirDate: tv.firstAirDate ?? null,
    lastAirDate: tv.lastAirDate ?? null,
    inProduction: Boolean(tv.inProduction),
    numberOfSeasons: tv.numberOfSeasons ?? seasons.length,
    numberOfEpisodes: tv.numberOfEpisodes ?? null,
    showType: tv.showType ?? null,

    posterPath,
    backdropPath,
    homepageUrl,

    genres,
    seasons,
    companies,
    cast,
    crew,
  };
}

router.get("/", async (req, res) => {
  try {
    const collection = getMongoCollection("tvshow_full_example");
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

    res.json(docs.map(mapMongoTvSummary));
  } catch (err) {
    console.error("Mongo GET /mongo/tv error:", err);
    res.status(500).json({ error: "MongoDB query failed" });
  }
});

router.get("/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    const collection = getMongoCollection("tvshow_full_example");

    const doc = await collection.findOne({ mediaId });

    if (!doc) return res.status(404).json({ error: "TV show not found" });

    res.json(mapMongoTvShow(doc));
  } catch (err) {
    console.error("Mongo GET /mongo/tv/:id error:", err);
    res.status(500).json({ error: "MongoDB lookup failed" });
  }
});

router.get("/debug/raw-first", async (req, res) => {
  try {
    const collection = getMongoCollection("tvshow_full_example");
    const doc = await collection.findOne({});
    res.json(doc);
  } catch (err) {
    console.error("Mongo GET /mongo/tv/debug/raw-first error:", err);
    res.status(500).json({ error: "Failed to read raw TV document" });
  }
});

export default router;
