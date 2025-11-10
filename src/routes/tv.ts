import { Router } from 'express';
import pool from '../db/pool';

const router = Router();

/**
 * GET /tv
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
      // List with FTS + ILIKE fallback
      const sql = `
        WITH tv_genres AS (
          SELECT mg.media_id, string_agg(g.name, ', ' ORDER BY g.name) AS genres
          FROM "MediaGenre" mg
          JOIN "Genre" g ON g.genre_id = mg.genre_id
          GROUP BY mg.media_id
        )
        SELECT
          m."media_id",
          m."original_title",
          m."vote_average"::float8 AS vote_average,
          CASE
            WHEN tg."genres" IS NULL OR tg."genres" = '' THEN ARRAY[]::text[]
            ELSE string_to_array(tg."genres", ', ')
          END AS genres,
          ts_rank(
            to_tsvector('english', coalesce(m."original_title",'') || ' ' || coalesce(m."overview",'')),
            plainto_tsquery('english', $1)
          ) AS rank
        FROM "MediaItem" m
        JOIN "TVShow" tv ON tv."media_id" = m."media_id"
        LEFT JOIN tv_genres tg ON tg."media_id" = m."media_id"
        WHERE
          to_tsvector('english', coalesce(m."original_title",'') || ' ' || coalesce(m."overview",'')) @@ plainto_tsquery('english', $1)
          OR m."original_title" ILIKE '%' || $1 || '%'
        ORDER BY rank DESC NULLS LAST, m."media_id"
        LIMIT $2 OFFSET $3;
      `;
      const { rows } = await pool.query(sql, [search, limit, offset]);
      return res.json(rows);
    }

    // Plain list with pagination (no search)
    const sql = `
      WITH tv_genres AS (
        SELECT mg.media_id, string_agg(g.name, ', ' ORDER BY g.name) AS genres
        FROM "MediaGenre" mg
        JOIN "Genre" g ON g.genre_id = mg.genre_id
        GROUP BY mg.media_id
      )
      SELECT
        m."media_id",
        m."original_title",
        m."vote_average"::float8 AS vote_average,
        CASE
          WHEN tg."genres" IS NULL OR tg."genres" = '' THEN ARRAY[]::text[]
          ELSE string_to_array(tg."genres", ', ')
        END AS genres
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv."media_id" = m."media_id"
      LEFT JOIN tv_genres tg ON tg."media_id" = m."media_id"
      ORDER BY m."media_id"
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await pool.query(sql, [limit, offset]);
    return res.json(rows);
  } catch (err) {
    console.error('[GET /tv] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /tv/:id */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const sql = `
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
    `;
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[GET /tv/:id] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
