import { Router } from 'express';
import pool from '../db/pool';
import { z } from 'zod';

const router = Router();

// ======================================================================
// CREATE TV SHOW (POST /tv)
// Full CRUD: includes all MediaItem + TVShow fields
// ======================================================================

const createTvSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  firstAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genreIds: z.array(z.number().int().positive()).min(1),

  lastAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),

  // MediaItem metadata
  overview: z.string().nullable().optional(),
  language: z.string().length(2).default('en'),
  status: z.string().min(1).max(50).default('Returning Series'),
  popularity: z.number().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  // TV-specific
  inProduction: z.boolean().optional(),
  numSeasons: z.number().int().min(0).optional(),
  numEpisodes: z.number().int().min(0).optional(),
  showType: z.string().min(1).max(100).optional(),
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
        $1, $2, $3::date, $4::bigint[], $5::date,

        $6,  -- overview
        $7,  -- language
        $8,  -- status
        $9,  -- popularity
        $10, -- vote_average
        $11, -- vote_count
        $12, -- poster_path
        $13, -- backdrop_path
        $14, -- homepage_url

        $15, -- in_production
        $16, -- num_seasons
        $17, -- num_episodes
        $18  -- show_type
      ) AS media_id;
    `;

    const params = [
      b.tmdbId,              // 1
      b.title,               // 2
      b.firstAirDate,        // 3
      b.genreIds,            // 4
      b.lastAirDate ?? null, // 5

      b.overview ?? null,    // 6
      b.language,            // 7
      b.status,              // 8
      b.popularity ?? null,  // 9
      b.vote ?? null,        // 10
      b.voteCount ?? null,   // 11
      b.posterPath ?? null,  // 12
      b.backdropPath ?? null,// 13
      b.homepageUrl ?? null, // 14

      b.inProduction ?? null,// 15
      b.numSeasons ?? null,  // 16
      b.numEpisodes ?? null, // 17
      b.showType ?? null     // 18
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

    console.error('[POST /tv] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ======================================================================
// UPDATE TV SHOW (PUT /tv/:id)
// Full CRUD support for all MediaItem + TVShow fields
// ======================================================================

const updateTvSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  overview: z.string().nullable().optional(),
  firstAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),

  language: z.string().length(2).optional(),
  status: z.string().min(1).max(50).optional(),
  popularity: z.number().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

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
      miParams.push(id);
      const sql = `
        UPDATE "MediaItem"
        SET ${miSets.join(', ')}
        WHERE media_id = $${p} AND media_type = 'tv'
        RETURNING media_id;
      `;
      const r = await client.query(sql, miParams);
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'TV show not found' });
      }
    }

    // ---------------- TVShow updates ----------------
    const tvSets: string[] = [];
    const tvParams: any[] = [];
    p = 1;

    if (b.firstAirDate !== undefined) { tvSets.push(`"first_air_date" = $${p++}::date`); tvParams.push(b.firstAirDate); }
    if (b.lastAirDate !== undefined)  { tvSets.push(`"last_air_date" = $${p++}::date`); tvParams.push(b.lastAirDate); }
    if (b.inProduction !== undefined) { tvSets.push(`"in_production" = $${p++}`); tvParams.push(b.inProduction); }
    if (b.numSeasons !== undefined)   { tvSets.push(`"number_of_seasons" = $${p++}`); tvParams.push(b.numSeasons); }
    if (b.numEpisodes !== undefined)  { tvSets.push(`"number_of_episodes" = $${p++}`); tvParams.push(b.numEpisodes); }
    if (b.showType !== undefined)     { tvSets.push(`"show_type" = $${p++}`); tvParams.push(b.showType); }

    if (tvSets.length > 0) {
      tvParams.push(id);
      const sql = `
        UPDATE "TVShow"
        SET ${tvSets.join(', ')}
        WHERE media_id = $${p}
        RETURNING media_id;
      `;
      const r2 = await client.query(sql, tvParams);
      if (r2.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'TV show not found' });
      }
    }

    await client.query('COMMIT');
    return res.json({ updated: true, mediaId: id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /tv/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ======================================================================
// DELETE TV SHOW (unchanged)
// ======================================================================

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const exists = await pool.query(`
      SELECT 1 FROM "MediaItem" WHERE media_id = $1 AND media_type = 'tv'
    `, [id]);

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: 'TV show not found' });
    }

    await pool.query(`CALL delete_tvshow_with_cleanup($1);`, [id]);
    return res.status(200).json({ deleted: true, mediaId: id });

  } catch (err: any) {
    console.error('[DELETE /tv/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
