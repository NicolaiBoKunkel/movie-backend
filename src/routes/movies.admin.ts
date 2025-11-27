import { Router } from 'express';
import pool from '../db/pool';
import { z } from 'zod';

const router = Router();

// --- CREATE (POST /movies) ---
const createMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  genreIds: z.array(z.number().int().positive()).min(1),
  language: z.string().length(2).default('en'),
  status: z.string().min(1).max(50).default('Released'),
  vote: z.number().min(0).max(10).default(0),
  budget: z.number().int().min(0).default(0),
  revenue: z.number().int().min(0).default(0),
  adult: z.boolean().default(false),
  runtime: z.number().int().positive().nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

router.post('/', async (req, res) => {
  const parsed = createMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parsed.error.issues,
    });
  }
  const b = parsed.data;

  try {
    const sql = `
      SELECT add_movie_with_genres(
        $1, $2, $3, $4::BIGINT[], $5, $6, $7, $8, $9, $10, $11, $12
      ) AS media_id;
    `;
    const params = [
      b.tmdbId,
      b.title,
      b.releaseDate,
      b.genreIds,
      b.language,
      b.status,
      b.vote,
      b.budget,
      b.revenue,
      b.adult,
      b.runtime ?? null,
      b.collectionId ?? null,
    ];

    const { rows } = await pool.query(sql, params);
    const mediaId = rows[0]?.media_id;
    return res.status(201).json({ mediaId });
  } catch (err: any) {
    const msg = String(err?.message || err);

    if (msg.includes('MediaGenre_genre_id_fkey') || msg.includes('foreign key')) {
      return res.status(400).json({
        error: 'Invalid genreIds: one or more do not exist',
        details: msg,
      });
    }
    if (/duplicate key value/.test(msg)) {
      return res.status(400).json({ error: 'Duplicate key', details: msg });
    }

    console.error('[POST /movies] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- UPDATE (PUT /movies/:id) ---
const updateMovieSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  language: z.string().length(2).optional(),
  status: z.string().min(1).max(50).optional(),
  vote: z.number().min(0).max(10).optional(),
  budget: z.number().int().min(0).optional(),
  revenue: z.number().int().min(0).optional(),
  adult: z.boolean().optional(),
  runtime: z.number().int().positive().nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const parsed = updateMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const b = parsed.data;
  const hasFields = Object.keys(b).length > 0;
  if (!hasFields) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Update MediaItem
    const miSets: string[] = [];
    const miParams: any[] = [];
    let p = 1;

    if (b.title !== undefined) { miSets.push(`"original_title" = $${p++}`); miParams.push(b.title); }
    if (b.language !== undefined) { miSets.push(`"original_language" = $${p++}`); miParams.push(b.language); }
    if (b.status !== undefined) { miSets.push(`"status" = $${p++}`); miParams.push(b.status); }
    if (b.vote !== undefined) { miSets.push(`"vote_average" = $${p++}`); miParams.push(b.vote); }

    if (miSets.length > 0) {
      miParams.push(id);
      const sql = `
        UPDATE "MediaItem"
           SET ${miSets.join(', ')}
         WHERE "media_id" = $${p} AND "media_type" = 'movie'
         RETURNING "media_id";
      `;
      const r = await client.query(sql, miParams);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Movie not found' });
      }
    } else {
      const exists = await client.query(
        `SELECT 1 FROM "MediaItem" WHERE "media_id" = $1 AND "media_type" = 'movie'`,
        [id]
      );
      if (exists.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Movie not found' });
      }
    }

    // --- Update Movie
    const mSets: string[] = [];
    const mParams: any[] = [];
    p = 1;

    if (b.releaseDate !== undefined) { mSets.push(`"release_date" = $${p++}::date`); mParams.push(b.releaseDate); }
    if (b.budget !== undefined) { mSets.push(`"budget" = $${p++}`); mParams.push(b.budget); }
    if (b.revenue !== undefined) { mSets.push(`"revenue" = $${p++}`); mParams.push(b.revenue); }
    if (b.adult !== undefined) { mSets.push(`"adult_flag" = $${p++}`); mParams.push(b.adult); }
    if (b.runtime !== undefined) { mSets.push(`"runtime_minutes" = $${p++}`); mParams.push(b.runtime); }
    if (b.collectionId !== undefined) { mSets.push(`"collection_id" = $${p++}`); mParams.push(b.collectionId); }

    if (mSets.length > 0) {
      mParams.push(id);
      const sql = `
        UPDATE "Movie"
           SET ${mSets.join(', ')}
         WHERE "media_id" = $${p}
         RETURNING "media_id";
      `;
      const r2 = await client.query(sql, mParams);
      if (r2.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Movie not found' });
      }
    }

    await client.query('COMMIT');

    // Return the updated resource in the same shape as GET /movies/:id
    const out = await pool.query(
      `
      SELECT
        m.media_id,
        m.tmdb_id,
        m.original_title,
        m.original_language,
        m.status,
        m.vote_average::float8 AS vote_average,
        mo.release_date,
        mo.budget::float8 AS budget,
        mo.revenue::float8 AS revenue,
        mo.adult_flag,
        mo.runtime_minutes,
        mo.collection_id::bigint AS collection_id,
        COALESCE(string_to_array(v.genres, ', '), '{}') AS genres
      FROM "MediaItem" m
      JOIN "Movie" mo ON mo.media_id = m.media_id
      LEFT JOIN vw_movies_with_genres v ON v.media_id = m.media_id
      WHERE m.media_id = $1 AND m.media_type = 'movie'
      LIMIT 1;
      `,
      [id]
    );
    return res.json(out.rows[0]);

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[PUT /movies/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// --- DELETE (DELETE /movies/:id) ---
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    // First check if the movie exists
    const exists = await pool.query(
      `SELECT 1 FROM "MediaItem" WHERE "media_id" = $1 AND "media_type" = 'movie'`,
      [id]
    );

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Use the stored procedure for deletion
    await pool.query(`CALL delete_movie_with_cleanup($1);`, [id]);

    return res.status(200).json({ deleted: true, mediaId: id });

  } catch (err: any) {
    const msg = String(err?.message || err);

    if (msg.includes('violates foreign key constraint')) {
      return res.status(409).json({
        error: 'Cannot delete: referenced by other records',
        details: msg,
      });
    }

    console.error('[DELETE /movies/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error', details: msg });
  }
});


export default router;
