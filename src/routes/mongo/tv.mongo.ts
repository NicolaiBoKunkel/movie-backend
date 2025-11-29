import { Router } from "express";
import MongoDataSource from "../../db/mongoDataSource";
import { TVShowMongo } from "../../entities/mongo/TVShowMongo";

const router = Router();

// GET /mongo/tv?search=&limit=
router.get("/", async (req, res) => {
  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);

    const search = (req.query.search as string)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    let tvShows;

    if (search.length > 0) {
      // Search inside embedded mediaItem fields
      tvShows = await tvRepo.find({
        where: {
          $or: [
            { "mediaItem.originalTitle": { $regex: search, $options: "i" } },
            { "mediaItem.overview": { $regex: search, $options: "i" } }
          ],
        },
        take: limit,
      });
    } else {
      tvShows = await tvRepo.find({ take: limit });
    }

    res.json(tvShows);
  } catch (err) {
    console.error("Mongo GET /tv error:", err);
    res.status(500).json({ error: "MongoDB query failed" });
  }
});

// GET /mongo/tv/:mediaId
router.get("/:mediaId", async (req, res) => {
  const { mediaId } = req.params;

  try {
    const tvRepo = MongoDataSource.getMongoRepository(TVShowMongo);

    const tv = await tvRepo.findOne({
      where: { mediaId },
    });

    if (!tv) {
      return res.status(404).json({ error: "TV show not found" });
    }

    res.json(tv);
  } catch (err) {
    console.error("Mongo GET /tv/:id error:", err);
    res.status(500).json({ error: "MongoDB lookup failed" });
  }
});

export default router;
