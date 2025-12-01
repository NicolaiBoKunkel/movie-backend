import { Router } from "express";
import pool from "../db/pool";

const router = Router();

export type TVShowDto = {
  mediaId: string;
  tmdbId: string;
  mediaType: "tv";

  originalTitle: string;
  overview: string | null;
  originalLanguage: string;
  status: string | null;

  popularity: number | null;
  voteAverage: number;
  voteCount: number | null;

  firstAirDate: string | null;
  lastAirDate: string | null;

  inProduction: boolean;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;

  showType: string | null;

  posterPath: string | null;
  backdropPath: string | null;
  homepageUrl: string | null;

  genres: string[];

  seasons: {
    seasonNumber: number;
    name: string | null;
    airDate: string | null;
    episodeCount: number;
    posterPath: string | null;
  }[];
};

export type TVShowSummaryDto = {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  firstAirDate: string | null;
  genres: string[];
};

function mapSqlTvSummary(row: any): TVShowSummaryDto {
  return {
    mediaId: String(row.media_id),
    originalTitle: row.original_title,
    voteAverage: Number(row.vote_average),

    posterPath: row.poster_path ?? null,
    backdropPath: row.backdrop_path ?? null,
    overview: row.overview ?? null,

    firstAirDate: row.first_air_date
      ? row.first_air_date.toISOString()
      : null,

    genres: Array.isArray(row.genres) ? row.genres : [],
  };
}

function mapSqlTvShow(row: any, seasons: any[]): TVShowDto {
  return {
    mediaId: String(row.media_id),
    tmdbId: String(row.tmdb_id),
    mediaType: "tv",

    originalTitle: row.original_title,
    overview: row.overview ?? null,
    originalLanguage: row.original_language ?? "",
    status: row.status ?? null,

    popularity: row.popularity != null ? Number(row.popularity) : null,
    voteAverage: Number(row.vote_average),
    voteCount: row.vote_count != null ? Number(row.vote_count) : null,

    firstAirDate: row.first_air_date
      ? row.first_air_date.toISOString()
      : null,
    lastAirDate: row.last_air_date
      ? row.last_air_date.toISOString()
      : null,

    inProduction: Boolean(row.in_production),
    numberOfSeasons:
      row.number_of_seasons != null ? Number(row.number_of_seasons) : null,
    numberOfEpisodes:
      row.number_of_episodes != null ? Number(row.number_of_episodes) : null,

    showType: row.show_type ?? null,

    posterPath: row.poster_path ?? null,
    backdropPath: row.backdrop_path ?? null,
    homepageUrl: row.homepage_url ?? null,

    genres: Array.isArray(row.genres) ? row.genres : [],

    seasons: seasons.map((s) => ({
      seasonNumber: Number(s.season_number),
      name: s.name ?? null,
      airDate: s.air_date ? s.air_date.toISOString() : null,
      episodeCount: Number(s.episode_count),
      posterPath: s.poster_path ?? null,
    })),
  };
}

router.get("/", async (req, res) => {
  try {
    const search = (req.query.search as string)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit ?? 10) || 10, 100);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    if (search.length > 0) {
      const sql = `
        WITH tv_genres AS (
          SELECT mg.media_id, string_agg(g.name, ', ') AS genres
          FROM "MediaGenre" mg
          JOIN "Genre" g ON g.genre_id = mg.genre_id
          GROUP BY mg.media_id
        )
        SELECT
          m.media_id,
          m.original_title,
          m.vote_average::float8 AS vote_average,
          m.poster_path,
          m.backdrop_path,
          m.overview,
          tv.first_air_date,
          CASE WHEN tg.genres IS NULL OR tg.genres = ''
               THEN ARRAY[]::text[]
               ELSE string_to_array(tg.genres, ', ')
          END AS genres,
          ts_rank(
            to_tsvector('english', coalesce(m.original_title,'') || ' ' || coalesce(m.overview,'')),
            plainto_tsquery('english', $1)
          ) AS rank
        FROM "MediaItem" m
        JOIN "TVShow" tv ON tv.media_id = m.media_id
        LEFT JOIN tv_genres tg ON tg.media_id = m.media_id
        WHERE m.media_type = 'tv'
          AND (
            to_tsvector('english', coalesce(m.original_title,'') || ' ' || coalesce(m.overview,'')) @@ plainto_tsquery('english', $1)
            OR m.original_title ILIKE '%' || $1 || '%'
          )
        ORDER BY rank DESC NULLS LAST, m.media_id
        LIMIT $2 OFFSET $3;
      `;

      const { rows } = await pool.query(sql, [search, limit, offset]);
      return res.json(rows.map(mapSqlTvSummary));
    }

    const sql = `
      WITH tv_genres AS (
        SELECT mg.media_id, string_agg(g.name, ', ') AS genres
        FROM "MediaGenre" mg
        JOIN "Genre" g ON g.genre_id = mg.genre_id
        GROUP BY mg.media_id
      )
      SELECT
        m.media_id,
        m.original_title,
        m.vote_average::float8 AS vote_average,
        m.poster_path,
        m.backdrop_path,
        m.overview,
        tv.first_air_date,
        CASE WHEN tg.genres IS NULL OR tg.genres = ''
             THEN ARRAY[]::text[]
             ELSE string_to_array(tg.genres, ', ')
        END AS genres
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv.media_id = m.media_id
      LEFT JOIN tv_genres tg ON tg.media_id = m.media_id
      WHERE m.media_type = 'tv'
      ORDER BY m.media_id
      LIMIT $1 OFFSET $2;
    `;

    const { rows } = await pool.query(sql, [limit, offset]);
    return res.json(rows.map(mapSqlTvSummary));
  } catch (err) {
    console.error("[GET /tv] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: "Invalid id" });

  try {
    const sql = `
      WITH tv_genres AS (
        SELECT mg.media_id, string_agg(g.name, ', ') AS genres
        FROM "MediaGenre" mg
        JOIN "Genre" g ON g.genre_id = mg.genre_id
        GROUP BY mg.media_id
      )
      SELECT
        m.*,
        tv.*,
        CASE WHEN tg.genres IS NULL OR tg.genres = ''
             THEN ARRAY[]::text[]
             ELSE string_to_array(tg.genres, ', ')
        END AS genres
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv.media_id = m.media_id
      LEFT JOIN tv_genres tg ON tg.media_id = m.media_id
      WHERE m.media_id = $1 AND m.media_type = 'tv'
      LIMIT 1;
    `;

    const tvRes = await pool.query(sql, [id]);
    if (tvRes.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    const row = tvRes.rows[0];

    const seasonRes = await pool.query(
      `SELECT season_number, name, air_date, episode_count, poster_path
       FROM "Season"
       WHERE tv_media_id = $1
       ORDER BY season_number;`,
      [id]
    );

    const castRes = await pool.query(
      `SELECT p.person_id, p.name, tc.character_name, tc.cast_order
       FROM "TitleCasting" tc
       JOIN "Person" p ON p.person_id = tc.person_id
       WHERE tc.media_id = $1
       ORDER BY tc.cast_order;`,
      [id]
    );

    const crewRes = await pool.query(
      `SELECT p.person_id, p.name, tca.department, tca.job_title
       FROM "TitleCrewAssignment" tca
       JOIN "Person" p ON p.person_id = tca.person_id
       WHERE tca.media_id = $1;`,
      [id]
    );

    const companyRes = await pool.query(
      `SELECT c.company_id, c.name, mc.role
       FROM "MediaCompany" mc
       JOIN "Company" c ON c.company_id = mc.company_id
       WHERE mc.media_id = $1;`,
      [id]
    );

    return res.json({
      ...mapSqlTvShow(row, seasonRes.rows),

      cast: castRes.rows.map((c) => ({
        personId: String(c.person_id),
        name: c.name,
        characterName: c.character_name,
        castOrder: c.cast_order != null ? Number(c.cast_order) : null,
      })),

      crew: crewRes.rows.map((c) => ({
        personId: String(c.person_id),
        name: c.name,
        department: c.department,
        jobTitle: c.job_title,
      })),

      companies: companyRes.rows.map((c) => ({
        companyId: String(c.company_id),
        name: c.name,
        role: c.role,
      })),
    });
  } catch (err) {
    console.error("[GET /tv/:id] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
