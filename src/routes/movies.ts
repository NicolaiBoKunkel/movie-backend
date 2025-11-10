import { Router } from 'express';
import pool from '../db/pool';

const router = Router();

/**
 * GET /movies
 * Query params:
 *   search?: string   - full-text search over title+overview (falls back to ILIKE)
 *   limit?: number    - default 10, max 100
 *   offset?: number   - default 0
 */
router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string | undefined)?.trim() ?? '';
    const limit = Math.min(Number(req.query.limit ?? 10) || 10, 100);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    if (search.length > 0) {
      // Full-text search on title + overview; fallback ILIKE helps short/partial terms
      const sql = `
        SELECT
          m."media_id",
          m."original_title",
          m."vote_average"::float8 AS vote_average,
          CASE
            WHEN v."genres" = '' THEN ARRAY[]::text[]
            ELSE string_to_array(v."genres", ', ')
          END AS genres,
          ts_rank(
            to_tsvector('english', coalesce(m."original_title",'') || ' ' || coalesce(m."overview",'')),
            plainto_tsquery('english', $1)
          ) AS rank
        FROM "MediaItem" m
        JOIN "Movie" mo ON mo."media_id" = m."media_id"
        LEFT JOIN vw_movies_with_genres v ON v."media_id" = m."media_id"
        WHERE
          to_tsvector('english', coalesce(m."original_title",'') || ' ' || coalesce(m."overview",'')) @@ plainto_tsquery('english', $1)
          OR m."original_title" ILIKE '%' || $1 || '%'
        ORDER BY rank DESC NULLS LAST, m."media_id"
        LIMIT $2 OFFSET $3;
      `;
      const { rows } = await pool.query(sql, [search, limit, offset]);
      return res.json(rows);
    }

    // No search — list from the view with pagination
    const sql = `
      SELECT
        "media_id",
        "original_title",
        "vote_average"::float8 AS vote_average,
        CASE
          WHEN "genres" = '' THEN ARRAY[]::text[]
          ELSE string_to_array("genres", ', ')
        END AS genres
      FROM vw_movies_with_genres
      ORDER BY "media_id"
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await pool.query(sql, [limit, offset]);
    return res.json(rows);
  } catch (err) {
    console.error('[GET /movies] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /movies/:id */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const sql = `
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
        CASE
          WHEN v.genres = '' THEN ARRAY[]::text[]
          ELSE string_to_array(v.genres, ', ')
        END AS genres
      FROM "MediaItem" m
      JOIN "Movie" mo ON mo.media_id = m.media_id
      LEFT JOIN vw_movies_with_genres v ON v.media_id = m.media_id
      WHERE m.media_id = $1 AND m.media_type = 'movie'
      LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[GET /movies/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
