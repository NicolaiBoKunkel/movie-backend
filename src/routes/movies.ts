import { Router } from "express";
import pool from "../db/pool";

const router = Router();

export type GenreDto = {
  genreId: string;
  name: string;
};

export type CollectionDto = {
  collectionId: string;
  tmdbId: string | null;
  name: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
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

export type MovieDto = {
  mediaId: string;
  tmdbId: string | null;
  mediaType: "movie";
  originalTitle: string;
  overview: string | null;
  originalLanguage: string | null;
  status: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  posterPath: string | null;
  backdropPath: string | null;
  homepageUrl: string | null;
  releaseDate: string | null;
  budget: number;
  revenue: number;
  adultFlag: boolean;
  runtimeMinutes: number | null;
  collection: CollectionDto | null;
  genres: GenreDto[];
  cast: CastDto[];
  crew: CrewDto[];
  companies: CompanyDto[];
};

export type MovieSummaryDto = {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;
  posterPath: string | null;
  overview: string | null;
  releaseDate: string | null;
  genres: GenreDto[];
};


function mapSqlSummary(row: any): MovieSummaryDto {
  return {
    mediaId: String(row.media_id),
    originalTitle: row.original_title,
    voteAverage: Number(row.vote_average),
    posterPath: row.poster_path ?? null,
    overview: row.overview ?? null,
    releaseDate: row.release_date ? row.release_date.toISOString() : null,
    genres: Array.isArray(row.genres)
      ? row.genres.map((g: any) => ({
          genreId: String(g.genre_id),
          name: g.genre_name,
        }))
      : [],
  };
}


function mapSqlMovie(row: any): Partial<MovieDto> {
  return {
    mediaId: String(row.media_id),
    tmdbId: row.tmdb_id ? String(row.tmdb_id) : null,
    mediaType: "movie",
    originalTitle: row.original_title,
    overview: row.overview ?? null,
    originalLanguage: row.original_language,
    status: row.status ?? null,
    popularity: Number(row.popularity ?? 0),
    voteAverage: Number(row.vote_average),
    voteCount: Number(row.vote_count ?? 0),
    posterPath: row.poster_path ?? null,
    backdropPath: row.backdrop_path ?? null,
    homepageUrl: row.homepage_url ?? null,
    releaseDate: row.release_date ? row.release_date.toISOString() : null,
    budget: Number(row.budget ?? 0),
    revenue: Number(row.revenue ?? 0),
    adultFlag: row.adult_flag,
    runtimeMinutes: row.runtime_minutes ? Number(row.runtime_minutes) : null,
    collection: row.collection_id
      ? {
          collectionId: String(row.collection_id),
          tmdbId: row.col_tmdb_id ? String(row.col_tmdb_id) : null,
          name: row.col_name,
          overview: row.col_overview,
          posterPath: row.col_poster_path,
          backdropPath: row.col_backdrop_path,
        }
      : null,
    genres: Array.isArray(row.genres)
      ? row.genres.map((g: any) => ({
          genreId: String(g.genre_id),
          name: g.genre_name,
        }))
      : [],
  };
}


router.get("/", async (req, res) => {
  try {
    const search = (req.query.search as string | undefined)?.trim() ?? "";
    const limit = Math.min(Number(req.query.limit ?? 10) || 10, 100);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    const baseSelect = `
      SELECT
        m.media_id,
        m.original_title,
        m.vote_average::float8 AS vote_average,
        m.poster_path,
        m.overview,
        mo.release_date,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'genre_id', g.genre_id,
            'genre_name', g.name
          )
        ) FILTER (WHERE g.genre_id IS NOT NULL), '[]') AS genres
      FROM "MediaItem" m
      JOIN "Movie" mo ON mo.media_id = m.media_id
      LEFT JOIN "MediaGenre" mg ON mg.media_id = m.media_id
      LEFT JOIN "Genre" g ON g.genre_id = mg.genre_id
    `;

    if (search.length > 0) {
      const sql = `
        ${baseSelect}
        WHERE
          to_tsvector('english', coalesce(m.original_title,'') || ' ' || coalesce(m.overview,'')) @@ plainto_tsquery('english', $1)
          OR m.original_title ILIKE '%' || $1 || '%'
        GROUP BY m.media_id, mo.release_date
        ORDER BY m.media_id
        LIMIT $2 OFFSET $3;
      `;
      const { rows } = await pool.query(sql, [search, limit, offset]);
      return res.json(rows.map(mapSqlSummary));
    }

    const sql = `
      ${baseSelect}
      GROUP BY m.media_id, mo.release_date
      ORDER BY m.media_id
      LIMIT $1 OFFSET $2;
    `;
    const { rows } = await pool.query(sql, [limit, offset]);
    return res.json(rows.map(mapSqlSummary));
  } catch (err) {
    console.error("[GET /movies] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const movieSql = `
      SELECT
        m.*,
        mo.release_date,
        mo.budget,
        mo.revenue,
        mo.adult_flag,
        mo.runtime_minutes,
        mo.collection_id,
        col.tmdb_id AS col_tmdb_id,
        col.name AS col_name,
        col.overview AS col_overview,
        col.poster_path AS col_poster_path,
        col.backdrop_path AS col_backdrop_path,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'genre_id', g.genre_id,
            'genre_name', g.name
          )
        ) FILTER (WHERE g.genre_id IS NOT NULL), '[]') AS genres
      FROM "MediaItem" m
      JOIN "Movie" mo ON mo.media_id = m.media_id
      LEFT JOIN "Collection" col ON col.collection_id = mo.collection_id
      LEFT JOIN "MediaGenre" mg ON mg.media_id = m.media_id
      LEFT JOIN "Genre" g ON g.genre_id = mg.genre_id
      WHERE m.media_id = $1 AND m.media_type = 'movie'
      GROUP BY m.media_id, mo.release_date, mo.budget, mo.revenue, mo.adult_flag,
               mo.runtime_minutes, mo.collection_id, col.collection_id;
    `;

    const movieResult = await pool.query(movieSql, [id]);
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    const movie = mapSqlMovie(movieResult.rows[0]);

    const castSql = `
      SELECT p.person_id, p.name, tc.character_name, tc.cast_order
      FROM "TitleCasting" tc
      JOIN "Person" p ON p.person_id = tc.person_id
      WHERE tc.media_id = $1
      ORDER BY tc.cast_order ASC NULLS LAST;
    `;
    const castRows = await pool.query(castSql, [id]);
    const cast: CastDto[] = castRows.rows.map((r) => ({
      personId: String(r.person_id),
      name: r.name,
      characterName: r.character_name,
      castOrder: r.cast_order,
    }));

    const crewSql = `
      SELECT p.person_id, p.name, tca.department, tca.job_title
      FROM "TitleCrewAssignment" tca
      JOIN "Person" p ON p.person_id = tca.person_id
      WHERE tca.media_id = $1
      ORDER BY p.name ASC;
    `;
    const crewRows = await pool.query(crewSql, [id]);
    const crew: CrewDto[] = crewRows.rows.map((r) => ({
      personId: String(r.person_id),
      name: r.name,
      department: r.department,
      jobTitle: r.job_title,
    }));

    /* ---- COMPANIES ---- */
    const companySql = `
      SELECT c.company_id, c.name, mc.role
      FROM "MediaCompany" mc
      JOIN "Company" c ON c.company_id = mc.company_id
      WHERE mc.media_id = $1
      ORDER BY c.name ASC;
    `;
    const companyRows = await pool.query(companySql, [id]);
    const companies: CompanyDto[] = companyRows.rows.map((r) => ({
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
    console.error("[GET /movies/:id] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/related", async (req, res) => {
  const id = Number(req.params.id);
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const sql = `
      SELECT
        m2.media_id,
        m2.original_title,
        COUNT(*)::int AS shared_cast_count
      FROM "TitleCasting" tc1
      JOIN "TitleCasting" tc2
        ON tc2.person_id = tc1.person_id
       AND tc2.media_id <> tc1.media_id
      JOIN "MediaItem" m2
        ON m2.media_id = tc2.media_id
      WHERE tc1.media_id = $1
        AND m2.media_type = 'movie'
      GROUP BY m2.media_id, m2.original_title
      ORDER BY shared_cast_count DESC, m2.media_id ASC
      LIMIT $2;
    `;
    const { rows } = await pool.query(sql, [id, limit]);
    return res.json(rows);
  } catch (err) {
    console.error("[GET /movies/:id/related] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
