import { Router } from "express";
import MongoDataSource from "../../db/mongoDataSource";
import { MovieMongo } from "../../entities/mongo/MovieMongo";

const router = Router();

// GET /mongo/movies?search=&limit=
router.get("/", async (req, res) => {
  try {
    const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

    const search = (req.query.search as string)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    let movies;

    if (search.length > 0) {
      // Basic search across embedded mediaItem fields
      movies = await movieRepo.find({
        where: {
          $or: [
            { "mediaItem.originalTitle": { $regex: search, $options: "i" } },
            { "mediaItem.overview": { $regex: search, $options: "i" } },
          ],
        },
        take: limit,
      });
    } else {
      movies = await movieRepo.find({
        take: limit,
      });
    }

    res.json(movies);
  } catch (err) {
    console.error("Mongo GET /movies error:", err);
    res.status(500).json({ error: "MongoDB query failed" });
  }
});

// GET /mongo/movies/:mediaId
router.get("/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    const movieRepo = MongoDataSource.getMongoRepository(MovieMongo);

    const movie = await movieRepo.findOne({
      where: { mediaId },
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(movie);
  } catch (err) {
    console.error("Mongo GET /movies/:id error:", err);
    res.status(500).json({ error: "MongoDB lookup failed" });
  }
});

export default router;
