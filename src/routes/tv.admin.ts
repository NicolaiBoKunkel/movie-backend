import { Router } from 'express';
import pool from '../db/pool';
import { z } from 'zod';

const router = Router();

// --- CREATE (POST /tv) ---
const createTvSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  firstAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  genreIds: z.array(z.number().int().positive()).min(1),
  language: z.string().length(2).default('en'),
  status: z.string().min(1).max(50).default('Returning Series'),
  vote: z.number().min(0).max(10).default(0),
  inProduction: z.boolean().default(false),
  numSeasons: z.number().int().min(0).default(0),
  numEpisodes: z.number().int().min(0).default(0),
  showType: z.string().min(1).max(100).default('Scripted'),
});

router.post('/', async (req, res) => {
  const parsed = createTvSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const b = parsed.data;

  try {
    const sql = `
    SELECT add_tvshow_with_genres(
        $1::bigint,     -- tmdbId
        $2::text,       -- title
        $3::date,       -- firstAirDate
        $4::bigint[],   -- genreIds
        $5::date,       -- lastAirDate (nullable)
        $6::char(2),    -- language
        $7::text,       -- status
        $8::numeric,    -- vote
        $9::boolean,    -- inProduction
        $10::int,       -- numSeasons
        $11::int,       -- numEpisodes
        $12::text       -- showType
    ) AS media_id;
    `;
    const params = [
    b.tmdbId,              // $1
    b.title,               // $2
    b.firstAirDate,        // $3
    b.genreIds,            // $4
    b.lastAirDate ?? null, // $5
    b.language,            // $6
    b.status,              // $7
    b.vote,                // $8
    b.inProduction,        // $9
    b.numSeasons,          // $10
    b.numEpisodes,         // $11
    b.showType             // $12
    ];


    const { rows } = await pool.query(sql, params);
    const mediaId = rows[0]?.media_id;
    return res.status(201).json({ mediaId });
  } catch (err: any) {
    const msg = String(err?.message || err);

    if (msg.includes('MediaGenre') || msg.toLowerCase().includes('foreign key')) {
      return res.status(400).json({ error: 'Invalid genreIds: one or more do not exist', details: msg });
    }
    if (/duplicate key value/i.test(msg)) {
      return res.status(400).json({ error: 'Duplicate entry', details: msg });
    }

    console.error('[POST /tv] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- UPDATE (PUT /tv/:id) ---
const updateTvSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  firstAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  language: z.string().length(2).optional(),
  status: z.string().min(1).max(50).optional(),
  vote: z.number().min(0).max(10).optional(),
  inProduction: z.boolean().optional(),
  numSeasons: z.number().int().min(0).optional(),
  numEpisodes: z.number().int().min(0).optional(),
  showType: z.string().min(1).max(100).optional(),
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const parsed = updateTvSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const b = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Update MediaItem fields
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
         WHERE "media_id" = $${p} AND "media_type" = 'tv'
         RETURNING "media_id";
      `;
      const r = await client.query(sql, miParams);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'TV show not found' });
      }
    } else {
      // ensure it exists
      const exists = await client.query(
        `SELECT 1 FROM "MediaItem" WHERE "media_id" = $1 AND "media_type" = 'tv'`,
        [id]
      );
      if (exists.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'TV show not found' });
      }
    }

    // --- Update TVShow fields
    const tvSets: string[] = [];
    const tvParams: any[] = [];
    p = 1;

    if (b.firstAirDate !== undefined) { tvSets.push(`"first_air_date" = $${p++}::date`); tvParams.push(b.firstAirDate); }
    if (b.lastAirDate !== undefined)  { tvSets.push(`"last_air_date"  = $${p++}::date`); tvParams.push(b.lastAirDate); }
    if (b.inProduction !== undefined) { tvSets.push(`"in_production"   = $${p++}`);     tvParams.push(b.inProduction); }
    if (b.numSeasons !== undefined)   { tvSets.push(`"number_of_seasons"  = $${p++}`);  tvParams.push(b.numSeasons); }
    if (b.numEpisodes !== undefined)  { tvSets.push(`"number_of_episodes" = $${p++}`);  tvParams.push(b.numEpisodes); }
    if (b.showType !== undefined)     { tvSets.push(`"show_type"          = $${p++}`);  tvParams.push(b.showType); }

    if (tvSets.length > 0) {
      tvParams.push(id);
      const sql = `
        UPDATE "TVShow"
           SET ${tvSets.join(', ')}
         WHERE "media_id" = $${p}
         RETURNING "media_id";
      `;
      const r2 = await client.query(sql, tvParams);
      if (r2.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'TV show not found' });
      }
    }

    await client.query('COMMIT');

    // Return the updated resource
    const out = await pool.query(
      `
      WITH tv_genres AS (
        SELECT mg.media_id, string_agg(g.name, ', ' ORDER BY g.name) AS genres
        FROM "MediaGenre" mg
        JOIN "Genre" g ON g.genre_id = mg.genre_id
        GROUP BY mg.media_id
      )
      SELECT
        m.media_id,
        m.tmdb_id,
        m.original_title,
        m.original_language,
        m.status,
        m.vote_average::float8 AS vote_average,
        tv.first_air_date,
        tv.last_air_date,
        tv.in_production,
        tv.number_of_seasons,
        tv.number_of_episodes,
        tv.show_type,
        CASE
          WHEN tg.genres IS NULL OR tg.genres = '' THEN ARRAY[]::text[]
          ELSE string_to_array(tg.genres, ', ')
        END AS genres
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv.media_id = m.media_id
      LEFT JOIN tv_genres tg ON tg.media_id = m.media_id
      WHERE m.media_id = $1 AND m.media_type = 'tv'
      LIMIT 1;
      `,
      [id]
    );

    return res.json(out.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /tv/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// --- DELETE (DELETE /tv/:id) ---
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(
      `SELECT 1 FROM "MediaItem" WHERE "media_id" = $1 AND "media_type" = 'tv'`,
      [id]
    );
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    await client.query(`DELETE FROM "MediaGenre" WHERE "media_id" = $1`, [id]);
    await client.query(`DELETE FROM "TVShow" WHERE "media_id" = $1`, [id]);
    const delMi = await client.query(
      `DELETE FROM "MediaItem" WHERE "media_id" = $1 AND "media_type" = 'tv'`,
      [id]
    );

    await client.query('COMMIT');
    if (delMi.rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({ message: 'TV show deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE /tv/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
