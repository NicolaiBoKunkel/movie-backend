import { Router } from 'express';
import pool from '../db/pool';
import { z } from 'zod';

const router = Router();

// ======================================================================
// CREATE MOVIE (POST /movies)
// FULL CRUD: supports all MediaItem + Movie fields
// ======================================================================

const createMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genreIds: z.array(z.number().int().positive()).min(1),

  // MediaItem optional metadata
  overview: z.string().nullable().optional(),
  language: z.string().length(2).default('en'),
  status: z.string().min(1).max(50).default('Released'),
  popularity: z.number().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  // Movie-specific optional
  budget: z.number().int().min(0).optional(),
  revenue: z.number().int().min(0).optional(),
  adult: z.boolean().optional(),
  runtime: z.number().int().min(0).nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

router.post('/', async (req, res) => {
  const parsed = createMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const b = parsed.data;

  try {
    const sql = `
      SELECT add_movie_with_genres(
        $1,  -- tmdb_id
        $2,  -- title
        $3::date, -- release_date
        $4::bigint[], -- genre_ids

        $5,  -- overview
        $6,  -- language
        $7,  -- status
        $8,  -- popularity
        $9,  -- vote_average
        $10, -- vote_count
        $11, -- poster_path
        $12, -- backdrop_path
        $13, -- homepage_url

        $14, -- budget
        $15, -- revenue
        $16, -- adult_flag
        $17, -- runtime_minutes
        $18  -- collection_id
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
    return res.status(201).json({ mediaId: rows[0]?.media_id });

  } catch (err: any) {
    const msg = String(err?.message || err);

    if (msg.includes('foreign key') || msg.includes('MediaGenre')) {
      return res.status(400).json({ error: 'Invalid genreIds', details: msg });
    }

    if (/duplicate key/i.test(msg)) {
      return res.status(400).json({ error: 'Duplicate TMDB ID', details: msg });
    }

    console.error('[POST /movies] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ======================================================================
// UPDATE MOVIE (PUT /movies/:id)
// FULL CRUD support for MediaItem + Movie optional fields
// ======================================================================

const updateMovieSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  overview: z.string().nullable().optional(),
  language: z.string().length(2).optional(),
  status: z.string().min(1).max(50).optional(),
  popularity: z.number().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget: z.number().int().min(0).optional(),
  revenue: z.number().int().min(0).optional(),
  adult: z.boolean().optional(),
  runtime: z.number().int().min(0).nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

router.put('/:id', async (req, res) => {
  const mediaId = Number(req.params.id);
  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    return res.status(400).json({ error: 'Invalid movie id' });
  }

  const parsed = updateMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const b = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---------------- MediaItem updates ----------------
    const miSets: string[] = [];
    const miParams: any[] = [];
    let p = 1;

    if (b.title !== undefined)        { miSets.push(`"original_title" = $${p++}`); miParams.push(b.title); }
    if (b.overview !== undefined)     { miSets.push(`"overview"       = $${p++}`); miParams.push(b.overview); }
    if (b.language !== undefined)     { miSets.push(`"original_language" = $${p++}`); miParams.push(b.language); }
    if (b.status !== undefined)       { miSets.push(`"status"         = $${p++}`); miParams.push(b.status); }
    if (b.popularity !== undefined)   { miSets.push(`"popularity"     = $${p++}`); miParams.push(b.popularity); }
    if (b.vote !== undefined)         { miSets.push(`"vote_average"   = $${p++}`); miParams.push(b.vote); }
    if (b.voteCount !== undefined)    { miSets.push(`"vote_count"     = $${p++}`); miParams.push(b.voteCount); }
    if (b.posterPath !== undefined)   { miSets.push(`"poster_path"    = $${p++}`); miParams.push(b.posterPath); }
    if (b.backdropPath !== undefined) { miSets.push(`"backdrop_path"  = $${p++}`); miParams.push(b.backdropPath); }
    if (b.homepageUrl !== undefined)  { miSets.push(`"homepage_url"   = $${p++}`); miParams.push(b.homepageUrl); }

    if (miSets.length > 0) {
      miParams.push(mediaId);
      const sql = `
        UPDATE "MediaItem"
        SET ${miSets.join(', ')}
        WHERE media_id = $${p} AND media_type = 'movie'
        RETURNING media_id;
      `;
      const r = await client.query(sql, miParams);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Movie not found' });
      }
    }

    // ---------------- Movie updates ----------------
    const mSets: string[] = [];
    const mParams: any[] = [];
    p = 1;

    if (b.releaseDate !== undefined)  { mSets.push(`"release_date"    = $${p++}::date`); mParams.push(b.releaseDate); }
    if (b.budget !== undefined)       { mSets.push(`"budget"          = $${p++}`);      mParams.push(b.budget); }
    if (b.revenue !== undefined)      { mSets.push(`"revenue"         = $${p++}`);      mParams.push(b.revenue); }
    if (b.adult !== undefined)        { mSets.push(`"adult_flag"      = $${p++}`);      mParams.push(b.adult); }
    if (b.runtime !== undefined)      { mSets.push(`"runtime_minutes" = $${p++}`);      mParams.push(b.runtime); }
    if (b.collectionId !== undefined) { mSets.push(`"collection_id"   = $${p++}`);      mParams.push(b.collectionId); }

    if (mSets.length > 0) {
      mParams.push(mediaId);
      const sql = `
        UPDATE "Movie"
        SET ${mSets.join(', ')}
        WHERE media_id = $${p}
        RETURNING media_id;
      `;
      const r2 = await client.query(sql, mParams);
      if (r2.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Movie not found' });
      }
    }

    await client.query('COMMIT');

    return res.json({ updated: true, mediaId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /movies/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ======================================================================
// DELETE MOVIE (unchanged)
// ======================================================================

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const exists = await pool.query(`
      SELECT 1 FROM "MediaItem" WHERE media_id = $1 AND media_type = 'movie'
    `, [id]);

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    await pool.query(`CALL delete_movie_with_cleanup($1);`, [id]);
    return res.status(200).json({ deleted: true, mediaId: id });

  } catch (err: any) {
    console.error('[DELETE /movies/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
