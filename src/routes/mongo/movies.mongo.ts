import { Router } from "express";
import MongoDataSource from "../../db/mongoDataSource";
import { MovieMongo } from "../../entities/mongo/MovieMongo";

const router = Router();


   //Canonical Movie DTO + Mapping Helpers

export type MovieDto = {
  mediaId: string;
  tmdbId: string;
  mediaType: "movie";
  originalTitle: string;
  overview: string | null;
  originalLanguage: string;
  status: string;
  popularity: number | null;
  voteAverage: number;
  voteCount: number | null;
  releaseDate: string | null;
  budget: number | null;
  revenue: number | null;
  adultFlag: boolean;
  runtimeMinutes: number | null;
  collectionId: string | null;
  genres: string[];

  cast: {
    personId: string;
    name: string;
    characterName: string | null;
    castOrder: number | null;
  }[];

  crew: {
    personId: string;
    name: string;
    department: string | null;
    jobTitle: string | null;
  }[];

  companies: {
    companyId: string;
    name: string;
    role: string | null;
  }[];
};

   //Full Movie Mapper
function mapMongoMovie(doc: any): MovieDto {
  const m = doc.mediaItem || {};

  return {
    mediaId: String(doc.mediaId),
    tmdbId: String(m.tmdbId),
    mediaType: "movie",

    originalTitle: m.originalTitle ?? "",
    overview: m.overview ?? null,
    originalLanguage: m.originalLanguage ?? "",
    status: m.status ?? "",

    popularity: m.popularity != null ? Number(m.popularity) : null,
    voteAverage: Number(m.voteAverage ?? 0),
    voteCount: m.voteCount != null ? Number(m.voteCount) : null,

    releaseDate: doc.releaseDate ?? null,
    budget: doc.budget != null ? Number(doc.budget) : null,
    revenue: doc.revenue != null ? Number(doc.revenue) : null,

    adultFlag: Boolean(doc.adultFlag),
    runtimeMinutes: doc.runtimeMinutes != null ? Number(doc.runtimeMinutes) : null,

    collectionId: doc.collectionId ? String(doc.collectionId) : null,

    genres: Array.isArray(m.genres) ? m.genres.map((g: any) => g.name) : [],

    cast:
      Array.isArray(m.cast)
        ? m.cast.map((c: any) => ({
            personId: String(c.personId),
            name: c.name ?? "",
            characterName: c.characterName ?? null,
            castOrder: c.castOrder != null ? Number(c.castOrder) : null,
          }))
        : [],

    crew:
      Array.isArray(m.crew)
        ? m.crew.map((w: any) => ({
            personId: String(w.personId),
            name: w.name ?? "",
            department: w.department ?? null,
            jobTitle: w.jobTitle ?? null,
          }))
        : [],

    companies:
      Array.isArray(m.companies)
        ? m.companies.map((c: any) => ({
            companyId: String(c.companyId),
            name: c.name ?? "",
            role: c.role ?? null,
          }))
        : [],
  };
}


   //Summary Mapper for GET /mongo/movies
function mapMongoMovieSummary(doc: any) {
  const m = doc.mediaItem || {};

  return {
    mediaId: String(doc.mediaId),
    originalTitle: m.originalTitle ?? "",
    voteAverage: Number(m.voteAverage ?? 0),
    genres: Array.isArray(m.genres)
      ? m.genres.map((g: any) => g.name)
      : [],
  };
}


   //GET /mongo/movies (list + search)
router.get("/", async (req, res) => {
  try {
    const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

    const search = (req.query.search as string)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    let docs;

    if (search.length > 0) {
      docs = await movieRepo.find({
        where: {
          $or: [
            { "mediaItem.originalTitle": { $regex: search, $options: "i" } },
            { "mediaItem.overview": { $regex: search, $options: "i" } },
          ],
        },
        take: limit,
      });
    } else {
      docs = await movieRepo.find({ take: limit });
    }

    const movies = docs.map(mapMongoMovieSummary);
    res.json(movies);
  } catch (err) {
    console.error("Mongo GET /movies error:", err);
    res.status(500).json({ error: "MongoDB query failed" });
  }
});


   //GET /mongo/movies/:mediaId (full canonical details)
router.get("/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

    const doc = await movieRepo.findOne({ where: { mediaId } });

    if (!doc) return res.status(404).json({ error: "Movie not found" });

    const movie = mapMongoMovie(doc);
    res.json(movie);
  } catch (err) {
    console.error("Mongo GET /movies/:id error:", err);
    res.status(500).json({ error: "MongoDB lookup failed" });
  }
});

export default router;
