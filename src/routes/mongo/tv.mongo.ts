import { Router } from "express";
import MongoDataSource from "../../db/mongoDataSource";
import { TVShowMongo } from "../../entities/mongo/TVShowMongo";

const router = Router();

function mapMongoTvSummary(doc: any) {
  const item = doc.mediaItem ?? {};

  return {
    mediaId: String(doc.mediaId),
    originalTitle: item.originalTitle ?? "",
    voteAverage: Number(item.voteAverage ?? 0),
    genres: Array.isArray(item.genres)
      ? item.genres.map((g: any) => g.name)
      : [],
    posterPath: item.posterPath ?? null,
    backdropPath: item.backdropPath ?? null,
  };
}

function mapMongoTvShow(doc: any) {
  const m = doc.mediaItem ?? {};
  const tv = m.tvShow ?? {};

  const genres = Array.isArray(m.genres)
    ? m.genres.map((g: any) => g.name)
    : [];

  const seasonsSource = tv.seasons ?? doc.seasons ?? [];
  const seasons = seasonsSource.map((s: any) => ({
    seasonNumber: Number(s.seasonNumber ?? s.season_number ?? 0),
    name: s.name ?? null,
    airDate: s.airDate ?? s.air_date ?? null,
    episodeCount: Number(s.episodeCount ?? s.episode_count ?? 0),
    posterPath: s.posterPath ?? s.poster_path ?? null,
  }));

  const companies = Array.isArray(m.companies)
    ? m.companies.map((c: any) => ({
        companyId: String(c.companyId),
        name: c.name ?? "",
        role: c.role ?? null,
      }))
    : [];

  const cast = Array.isArray(m.cast)
    ? m.cast.map((c: any) => ({
        personId: String(c.personId),
        name: c.name ?? "",
        characterName: c.characterName ?? null,
        castOrder: c.castOrder != null ? Number(c.castOrder) : null,
      }))
    : [];

  const crew = Array.isArray(m.crew)
    ? m.crew.map((w: any) => ({
        personId: String(w.personId),
        name: w.name ?? "",
        department: w.department ?? null,
        jobTitle: w.jobTitle ?? null,
      }))
    : [];

  return {
    mediaId: String(doc.mediaId),
    tmdbId: String(m.tmdbId),
    mediaType: "tv",

    originalTitle: m.originalTitle ?? "",
    overview: m.overview ?? null,
    originalLanguage: m.originalLanguage ?? "",
    status: m.status ?? null,

    popularity: m.popularity != null ? Number(m.popularity) : null,
    voteAverage: Number(m.voteAverage ?? 0),
    voteCount: m.voteCount != null ? Number(m.voteCount) : null,

    firstAirDate: tv.firstAirDate ?? doc.firstAirDate ?? null,
    lastAirDate: tv.lastAirDate ?? doc.lastAirDate ?? null,

    inProduction: Boolean(tv.inProduction ?? doc.inProduction),
    numberOfSeasons:
      tv.numberOfSeasons ?? doc.numberOfSeasons ?? seasons.length ?? null,
    numberOfEpisodes:
      tv.numberOfEpisodes ?? doc.numberOfEpisodes ?? null,

    showType: tv.showType ?? doc.showType ?? null,

    posterPath: m.posterPath ?? null,
    backdropPath: m.backdropPath ?? null,
    homepageUrl: m.homepageUrl ?? null,

    genres,
    seasons,

    companies,
    cast,
    crew,
  };
}

router.get("/", async (req, res) => {
  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);

    const search = (req.query.search as string)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    let docs;

    if (search.length > 0) {
      docs = await tvRepo.find({
        where: {
          $or: [
            { "mediaItem.originalTitle": { $regex: search, $options: "i" } },
            { "mediaItem.overview": { $regex: search, $options: "i" } },
          ],
        },
        take: limit,
      });
    } else {
      docs = await tvRepo.find({ take: limit });
    }

    res.json(docs.map(mapMongoTvSummary));
  } catch (err) {
    console.error("Mongo GET /tv error:", err);
    res.status(500).json({ error: "MongoDB query failed" });
  }
});

router.get("/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);
    const doc = await tvRepo.findOne({ where: { mediaId } });

    if (!doc) return res.status(404).json({ error: "TV show not found" });

    res.json(mapMongoTvShow(doc));
  } catch (err) {
    console.error("Mongo GET /tv/:id error:", err);
    res.status(500).json({ error: "MongoDB lookup failed" });
  }
});

export default router;
