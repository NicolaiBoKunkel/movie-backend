import { Router } from "express";
import pool from "../db/pool";
import { z } from "zod";

const router = Router();


const createMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genreIds: z.array(z.number().int().positive()).min(1),

  overview: z.string().nullable().optional(),
  language: z.string().length(2).default("en"),
  status: z.string().min(1).max(50).default("Released"),

  popularity: z.number().nonnegative().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().nonnegative().optional(),

  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  budget: z.number().int().min(0).optional(),
  revenue: z.number().int().min(0).optional(),
  adult: z.boolean().optional(),
  runtime: z.number().int().min(0).nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

const updateMovieSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  overview: z.string().nullable().optional(),
  language: z.string().length(2).optional(),
  status: z.string().min(1).max(50).optional(),

  popularity: z.number().nonnegative().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().nonnegative().optional(),

  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget: z.number().int().min(0).optional(),
  revenue: z.number().int().min(0).optional(),
  adult: z.boolean().optional(),
  runtime: z.number().int().min(0).nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),

  genreIds: z.array(z.number().int().positive()).optional(),
});


router.post("/", async (req, res) => {
  const parsed = createMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  const b = parsed.data;

  try {
    const sql = `
      SELECT add_movie_with_genres(
        $1, $2, $3::date,
        $4::bigint[],
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17, $18
      ) AS media_id;
    `;

    const params = [
      b.tmdbId,
      b.title,
      b.releaseDate,
      b.genreIds,
      b.overview ?? null,
      b.language,
      b.status,
      b.popularity ?? null,
      b.vote ?? null,
      b.voteCount ?? null,
      b.posterPath ?? null,
      b.backdropPath ?? null,
      b.homepageUrl ?? null,
      b.budget ?? null,
      b.revenue ?? null,
      b.adult ?? null,
      b.runtime ?? null,
      b.collectionId ?? null,
    ];

    const { rows } = await pool.query(sql, params);
    const newId = rows[0]?.media_id;

    return res.status(201).json({ created: true, mediaId: newId });

  } catch (err: any) {
    const msg = String(err.message || err);

    if (/duplicate/i.test(msg)) {
      return res.status(400).json({ error: "Duplicate TMDB ID" });
    }

    console.error("[POST /movies] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.put("/:id", async (req, res) => {
  const mediaId = Number(req.params.id);
  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return res.status(400).json({ error: "Invalid movie id" });
  }

  const parsed = updateMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  const b = parsed.data;
  if (Object.keys(b).length === 0) {
    return res.status(400).json({ error: "No update fields provided" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (b.genreIds !== undefined) {
      const q = `SELECT genre_id FROM "Genre" WHERE genre_id = ANY($1)`;
      const valid = await client.query(q, [b.genreIds]);

      if (valid.rowCount !== b.genreIds.length) {
        throw new Error("Invalid genreIds");
      }

      await client.query(
        `DELETE FROM "MediaGenre" WHERE media_id = $1`,
        [mediaId]
      );

      for (const gid of b.genreIds) {
        await client.query(
          `INSERT INTO "MediaGenre"(media_id, genre_id) VALUES ($1, $2)`,
          [mediaId, gid]
        );
      }
    }

    const miSets: string[] = [];
    const miParams: any[] = [];
    let p = 1;

    if (b.title !== undefined)        { miSets.push(`original_title = $${p++}`); miParams.push(b.title); }
    if (b.overview !== undefined)     { miSets.push(`overview = $${p++}`); miParams.push(b.overview); }
    if (b.language !== undefined)     { miSets.push(`original_language = $${p++}`); miParams.push(b.language); }
    if (b.status !== undefined)       { miSets.push(`status = $${p++}`); miParams.push(b.status); }
    if (b.popularity !== undefined)   { miSets.push(`popularity = $${p++}`); miParams.push(b.popularity); }
    if (b.vote !== undefined)         { miSets.push(`vote_average = $${p++}`); miParams.push(b.vote); }
    if (b.voteCount !== undefined)    { miSets.push(`vote_count = $${p++}`); miParams.push(b.voteCount); }
    if (b.posterPath !== undefined)   { miSets.push(`poster_path = $${p++}`); miParams.push(b.posterPath); }
    if (b.backdropPath !== undefined) { miSets.push(`backdrop_path = $${p++}`); miParams.push(b.backdropPath); }
    if (b.homepageUrl !== undefined)  { miSets.push(`homepage_url = $${p++}`); miParams.push(b.homepageUrl); }

    if (miSets.length > 0) {
      miParams.push(mediaId);
      const sql = `
        UPDATE "MediaItem"
        SET ${miSets.join(", ")}
        WHERE media_id = $${p} AND media_type = 'movie'
      `;
      await client.query(sql, miParams);
    }

    const mSets: string[] = [];
    const mParams: any[] = [];
    p = 1;

    if (b.releaseDate !== undefined)  { mSets.push(`release_date = $${p++}::date`); mParams.push(b.releaseDate); }
    if (b.budget !== undefined)       { mSets.push(`budget = $${p++}`);            mParams.push(b.budget); }
    if (b.revenue !== undefined)      { mSets.push(`revenue = $${p++}`);           mParams.push(b.revenue); }
    if (b.adult !== undefined)        { mSets.push(`adult_flag = $${p++}`);        mParams.push(b.adult); }
    if (b.runtime !== undefined)      { mSets.push(`runtime_minutes = $${p++}`);   mParams.push(b.runtime); }
    if (b.collectionId !== undefined) { mSets.push(`collection_id = $${p++}`);     mParams.push(b.collectionId); }

    if (mSets.length > 0) {
      mParams.push(mediaId);
      const sql = `
        UPDATE "Movie"
        SET ${mSets.join(", ")}
        WHERE media_id = $${p}
      `;
      await client.query(sql, mParams);
    }

    await client.query("COMMIT");

    return res.json({ updated: true, mediaId });

  } catch (err: any) {
    await client.query("ROLLBACK");

    if (err.message === "Invalid genreIds") {
      return res.status(400).json({ error: "Invalid genreIds" });
    }

    console.error("[PUT /movies/:id] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});


router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid movie id" });
  }

  try {
    const exists = await pool.query(
      `SELECT 1 FROM "MediaItem" WHERE media_id = $1 AND media_type = 'movie'`,
      [id]
    );

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    await pool.query(`CALL delete_movie_with_cleanup($1)`, [id]);

    return res.json({ deleted: true, mediaId: id });

  } catch (err) {
    console.error("[DELETE /movies/:id] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
