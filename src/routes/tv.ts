import { Router } from "express";
import pool from "../db/pool";

const router = Router();

export type GenreDto = {
  genreId: string;
  name: string;
};

export type CastDto = {
  personId: string;
  name: string;
  characterName: string | null;
  castOrder: number | null;
};

export type CrewDto = {
  personId: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
};

export type CompanyDto = {
  companyId: string;
  name: string;
  role: string;
};

export type TVSeasonDto = {
  seasonNumber: number;
  name: string | null;
  airDate: string | null;
  episodeCount: number;
  posterPath: string | null;
};

export type TVShowDto = {
  mediaId: string;
  tmdbId: string | null;
  mediaType: "tv";

  originalTitle: string;
  overview: string | null;
  originalLanguage: string | null;
  status: string | null;

  popularity: number;
  voteAverage: number;
  voteCount: number;

  firstAirDate: string | null;
  lastAirDate: string | null;

  inProduction: boolean;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;

  showType: string | null;

  posterPath: string | null;
  backdropPath: string | null;
  homepageUrl: string | null;

  genres: GenreDto[];
  seasons: TVSeasonDto[];

  cast: CastDto[];
  crew: CrewDto[];
  companies: CompanyDto[];
};

export type TVShowSummaryDto = {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;

  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  firstAirDate: string | null;

  genres: GenreDto[];
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

    genres: Array.isArray(row.genres)
      ? row.genres.map((g: any) => ({
          genreId: String(g.genre_id),
          name: g.genre_name,
        }))
      : [],
  };
}


function mapSqlTvShow(row: any, seasons: any[]): Partial<TVShowDto> {
  return {
    mediaId: String(row.media_id),
    tmdbId: row.tmdb_id ? String(row.tmdb_id) : null,
    mediaType: "tv",

    originalTitle: row.original_title,
    overview: row.overview ?? null,
    originalLanguage: row.original_language ?? null,
    status: row.status ?? null,

    popularity: Number(row.popularity ?? 0),
    voteAverage: Number(row.vote_average),
    voteCount: Number(row.vote_count ?? 0),

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

    genres: Array.isArray(row.genres)
      ? row.genres.map((g: any) => ({
          genreId: String(g.genre_id),
          name: g.genre_name,
        }))
      : [],

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

    const baseSelect = `
      SELECT
        m.media_id,
        m.original_title,
        m.poster_path,
        m.backdrop_path,
        m.overview,
        m.vote_average::float8 AS vote_average,
        tv.first_air_date,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'genre_id', g.genre_id,
            'genre_name', g.name
          )
        ) FILTER (WHERE g.genre_id IS NOT NULL), '[]') AS genres
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv.media_id = m.media_id
      LEFT JOIN "MediaGenre" mg ON mg.media_id = m.media_id
      LEFT JOIN "Genre" g ON g.genre_id = mg.genre_id
      WHERE m.media_type = 'tv'
    `;

    if (search.length > 0) {
      const sql = `
        ${baseSelect}
        AND (
          to_tsvector('english', coalesce(m.original_title,'') || ' ' || coalesce(m.overview,'')) @@ plainto_tsquery('english', $1)
          OR m.original_title ILIKE '%' || $1 || '%'
        )
        GROUP BY m.media_id, tv.first_air_date
        ORDER BY m.media_id
        LIMIT $2 OFFSET $3;
      `;

      const { rows } = await pool.query(sql, [search, limit, offset]);
      return res.json(rows.map(mapSqlTvSummary));
    }

    const sql = `
      ${baseSelect}
      GROUP BY m.media_id, tv.first_air_date
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
    const showSql = `
      SELECT
        m.*,
        tv.*,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'genre_id', g.genre_id,
            'genre_name', g.name
          )
        ) FILTER (WHERE g.genre_id IS NOT NULL), '[]') AS genres
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv.media_id = m.media_id
      LEFT JOIN "MediaGenre" mg ON mg.media_id = m.media_id
      LEFT JOIN "Genre" g ON g.genre_id = mg.genre_id
      WHERE m.media_id = $1 AND m.media_type = 'tv'
      GROUP BY m.media_id, tv.media_id;
    `;

    const showRes = await pool.query(showSql, [id]);
    if (showRes.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    const row = showRes.rows[0];

    const seasonSql = `
      SELECT season_number, name, air_date, episode_count, poster_path
      FROM "Season"
      WHERE tv_media_id = $1
      ORDER BY season_number;
    `;
    const seasonsRes = await pool.query(seasonSql, [id]);

    const castSql = `
      SELECT p.person_id, p.name, tc.character_name, tc.cast_order
      FROM "TitleCasting" tc
      JOIN "Person" p ON p.person_id = tc.person_id
      WHERE tc.media_id = $1
      ORDER BY tc.cast_order ASC NULLS LAST;
    `;
    const castRes = await pool.query(castSql, [id]);

    const crewSql = `
      SELECT p.person_id, p.name, tca.department, tca.job_title
      FROM "TitleCrewAssignment" tca
      JOIN "Person" p ON p.person_id = tca.person_id
      WHERE tca.media_id = $1
      ORDER BY p.name;
    `;
    const crewRes = await pool.query(crewSql, [id]);

    const companySql = `
      SELECT c.company_id, c.name, mc.role
      FROM "MediaCompany" mc
      JOIN "Company" c ON c.company_id = mc.company_id
      WHERE mc.media_id = $1
      ORDER BY c.name;
    `;
    const companyRes = await pool.query(companySql, [id]);

    return res.json({
      ...mapSqlTvShow(row, seasonsRes.rows),

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
