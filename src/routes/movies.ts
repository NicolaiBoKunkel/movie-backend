import { Router } from 'express';
import pool from '../db/pool';

const router = Router();

export type MovieDto = {
  mediaId: string;
  tmdbId: string;
  mediaType: 'movie';
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
};

export type MovieSummaryDto = {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;
  genres: string[];
  posterPath: string | null;
  overview: string | null;
  releaseDate: string | null;
};

function mapSqlMovie(row: any): MovieDto {
  return {
    mediaId: String(row.media_id),
    tmdbId: String(row.tmdb_id),
    mediaType: 'movie',
    originalTitle: row.original_title,
    overview: row.overview ?? null,
    originalLanguage: row.original_language,
    status: row.status,
    popularity: row.popularity != null ? Number(row.popularity) : null,
    voteAverage: Number(row.vote_average),
    voteCount: row.vote_count != null ? Number(row.vote_count) : null,
    releaseDate: row.release_date ? row.release_date.toISOString() : null,
    budget: row.budget != null ? Number(row.budget) : null,
    revenue: row.revenue != null ? Number(row.revenue) : null,
    adultFlag: row.adult_flag,
    runtimeMinutes: row.runtime_minutes != null ? Number(row.runtime_minutes) : null,
    collectionId: row.collection_id != null ? String(row.collection_id) : null,
    genres: Array.isArray(row.genres) ? row.genres : [],
  };
}

function mapSqlMovieSummary(row: any): MovieSummaryDto {
  return {
    mediaId: String(row.media_id),
    originalTitle: row.original_title,
    voteAverage: Number(row.vote_average),
    posterPath: row.poster_path ?? null,
    overview: row.overview ?? null,
    releaseDate: row.release_date ? row.release_date.toISOString() : null,
    genres: Array.isArray(row.genres) ? row.genres : [],
  };
}

router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string | undefined)?.trim() ?? '';
    const limit = Math.min(Number(req.query.limit ?? 10) || 10, 100);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    if (search.length > 0) {
      const sql = `
        SELECT
          m.media_id,
          m.original_title,
          m.vote_average::float8 AS vote_average,
          m.poster_path,
          m.overview,
          mo.release_date,
          CASE
            WHEN v.genres = '' THEN ARRAY[]::text[]
            ELSE string_to_array(v.genres, ', ')
          END AS genres,
          ts_rank(
            to_tsvector('english', coalesce(m.original_title,'') || ' ' || coalesce(m.overview,'')),
            plainto_tsquery('english', $1)
          ) AS rank
        FROM "MediaItem" m
        JOIN "Movie" mo ON mo.media_id = m.media_id
        LEFT JOIN vw_movies_with_genres v ON v.media_id = m.media_id
        WHERE
          to_tsvector('english', coalesce(m.original_title,'') || ' ' || coalesce(m.overview,'')) @@ plainto_tsquery('english', $1)
          OR m.original_title ILIKE '%' || $1 || '%'
        ORDER BY rank DESC NULLS LAST, m.media_id
        LIMIT $2 OFFSET $3;
      `;
      const { rows } = await pool.query(sql, [search, limit, offset]);
      return res.json(rows.map(mapSqlMovieSummary));
    }

    const sql = `
      SELECT
        m.media_id,
        m.original_title,
        m.vote_average::float8 AS vote_average,
        m.poster_path,
        m.overview,
        mo.release_date,
        CASE
          WHEN v.genres = '' THEN ARRAY[]::text[]
          ELSE string_to_array(v.genres, ', ')
        END AS genres
      FROM "MediaItem" m
      JOIN "Movie" mo ON mo.media_id = m.media_id
      LEFT JOIN vw_movies_with_genres v ON v.media_id = m.media_id
      ORDER BY m.media_id
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await pool.query(sql, [limit, offset]);
    return res.json(rows.map(mapSqlMovieSummary));
  } catch (err) {
    console.error('[GET /movies] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const movieSql = `
      SELECT
        m.media_id,
        m.tmdb_id,
        m.media_type,
        m.original_title,
        m.overview,
        m.original_language,
        m.status,
        m.popularity,
        m.vote_average::float8 AS vote_average,
        m.vote_count,
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

    const movieResult = await pool.query(movieSql, [id]);
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    const movie = mapSqlMovie(movieResult.rows[0]);

    const castSql = `
      SELECT 
        p.person_id,
        p.name,
        tc.character_name,
        tc.cast_order
      FROM "TitleCasting" tc
      JOIN "Person" p ON p.person_id = tc.person_id
      WHERE tc.media_id = $1
      ORDER BY tc.cast_order ASC NULLS LAST;
    `;
    const castResult = await pool.query(castSql, [id]);
    const cast = castResult.rows.map(r => ({
      personId: String(r.person_id),
      name: r.name,
      characterName: r.character_name,
      castOrder: r.cast_order,
    }));

    const crewSql = `
      SELECT
        p.person_id,
        p.name,
        tca.department,
        tca.job_title
      FROM "TitleCrewAssignment" tca
      JOIN "Person" p ON p.person_id = tca.person_id
      WHERE tca.media_id = $1
      ORDER BY p.name ASC;
    `;
    const crewResult = await pool.query(crewSql, [id]);
    const crew = crewResult.rows.map(r => ({
      personId: String(r.person_id),
      name: r.name,
      department: r.department,
      jobTitle: r.job_title,
    }));

    const companiesSql = `
      SELECT
        c.company_id,
        c.name,
        mc.role
      FROM "MediaCompany" mc
      JOIN "Company" c ON c.company_id = mc.company_id
      WHERE mc.media_id = $1
      ORDER BY c.name ASC;
    `;
    const companiesResult = await pool.query(companiesSql, [id]);
    const companies = companiesResult.rows.map(r => ({
      companyId: String(r.company_id),
      name: r.name,
      role: r.role,
    }));

    return res.json({
      ...movie,
      cast,
      crew,
      companies,
    });
  } catch (err) {
    console.error('[GET /movies/:id] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
