import { Router } from "express";
import pool from "../db/pool";
import { z } from "zod";

const router = Router();

const createTvSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  firstAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genreIds: z.array(z.number().int().positive()).min(1),

  lastAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  overview: z.string().nullable().optional(),
  language: z.string().length(2).default("en"),
  status: z.string().min(1).max(50).default("Returning Series"),

  popularity: z.number().nonnegative().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().nonnegative().optional(),

  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  inProduction: z.boolean().optional(),
  numSeasons: z.number().int().nonnegative().optional(),
  numEpisodes: z.number().int().nonnegative().optional(),
  showType: z.string().min(1).max(100).optional(),
});

const updateTvSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  overview: z.string().nullable().optional(),
  language: z.string().length(2).optional(),
  status: z.string().min(1).max(50).optional(),

  popularity: z.number().nonnegative().optional(),
  vote: z.number().min(0).max(10).optional(),
  voteCount: z.number().int().nonnegative().optional(),

  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  homepageUrl: z.string().nullable().optional(),

  firstAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastAirDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),

  inProduction: z.boolean().optional(),
  numSeasons: z.number().int().nonnegative().optional(),
  numEpisodes: z.number().int().nonnegative().optional(),
  showType: z.string().min(1).max(100).optional(),

  genreIds: z.array(z.number().int().positive()).optional(),
});



async function fetchFullTvShow(id: number) {
  const tvSql = `
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
  const tv = await pool.query(tvSql, [id]);
  if (tv.rowCount === 0) return null;
  const row = tv.rows[0];

  const seasons = await pool.query(
    `SELECT season_number, name, air_date, episode_count, poster_path
     FROM "Season"
     WHERE tv_media_id = $1
     ORDER BY season_number`,
    [id]
  );

  const cast = await pool.query(
    `SELECT p.person_id, p.name, tc.character_name, tc.cast_order
     FROM "TitleCasting" tc
     JOIN "Person" p ON p.person_id = tc.person_id
     WHERE tc.media_id = $1
     ORDER BY tc.cast_order ASC NULLS LAST`,
    [id]
  );

  const crew = await pool.query(
    `SELECT p.person_id, p.name, tca.department, tca.job_title
     FROM "TitleCrewAssignment" tca
     JOIN "Person" p ON p.person_id = tca.person_id
     WHERE tca.media_id = $1
     ORDER BY p.name`,
    [id]
  );

  const companies = await pool.query(
    `SELECT c.company_id, c.name, mc.role
     FROM "MediaCompany" mc
     JOIN "Company" c ON c.company_id = mc.company_id
     WHERE mc.media_id = $1
     ORDER BY c.name`,
    [id]
  );

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

    firstAirDate: row.first_air_date ? row.first_air_date.toISOString() : null,
    lastAirDate: row.last_air_date ? row.last_air_date.toISOString() : null,

    inProduction: Boolean(row.in_production),
    numberOfSeasons: row.number_of_seasons,
    numberOfEpisodes: row.number_of_episodes,

    showType: row.show_type ?? null,

    posterPath: row.poster_path ?? null,
    backdropPath: row.backdrop_path ?? null,
    homepageUrl: row.homepage_url ?? null,

    genres: row.genres.map((g: any) => ({
      genreId: String(g.genre_id),
      name: g.genre_name,
    })),

    seasons: seasons.rows.map((s) => ({
      seasonNumber: s.season_number,
      name: s.name,
      airDate: s.air_date ? s.air_date.toISOString() : null,
      episodeCount: s.episode_count,
      posterPath: s.poster_path,
    })),

    cast: cast.rows.map((c) => ({
      personId: String(c.person_id),
      name: c.name,
      characterName: c.character_name,
      castOrder: c.cast_order,
    })),

    crew: crew.rows.map((c) => ({
      personId: String(c.person_id),
      name: c.name,
      department: c.department,
      jobTitle: c.job_title,
    })),

    companies: companies.rows.map((c) => ({
      companyId: String(c.company_id),
      name: c.name,
      role: c.role,
    })),
  };
}

router.post("/", async (req, res) => {
  const parsed = createTvSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const b = parsed.data;

  try {
    const sql = `
      SELECT add_tvshow_with_genres(
        $1, $2, $3::date, $4::bigint[], $5::date,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18
      ) AS media_id;
    `;

    const params = [
      b.tmdbId,
      b.title,
      b.firstAirDate,
      b.genreIds,
      b.lastAirDate ?? null,

      b.overview ?? null,
      b.language,
      b.status,
      b.popularity ?? 0,
      b.vote ?? 0,
      b.voteCount ?? 0,

      b.posterPath ?? null,
      b.backdropPath ?? null,
      b.homepageUrl ?? null,

      b.inProduction ?? false,
      b.numSeasons ?? 0,
      b.numEpisodes ?? 0,
      b.showType ?? null,
    ];

    const { rows } = await pool.query(sql, params);
    const newId = rows[0]?.media_id;

    const fullTv = await fetchFullTvShow(newId);
    return res.status(201).json(fullTv);

  } catch (err: any) {
    const msg = String(err.message || err);
    if (/duplicate/i.test(msg)) {
      return res.status(400).json({ error: "Duplicate TMDB ID" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const parsed = updateTvSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }
  const b = parsed.data;

  if (Object.keys(b).length === 0)
    return res.status(400).json({ error: "No update fields provided" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (b.genreIds !== undefined) {
      const valid = await client.query(
        `SELECT genre_id FROM "Genre" WHERE genre_id = ANY($1)`,
        [b.genreIds]
      );

      if (valid.rowCount !== b.genreIds.length) {
        throw new Error("Invalid genreIds");
      }

      await client.query(
        `DELETE FROM "MediaGenre" WHERE media_id = $1`,
        [id]
      );

      for (const gid of b.genreIds) {
        await client.query(
          `INSERT INTO "MediaGenre"(media_id, genre_id) VALUES ($1, $2)`,
          [id, gid]
        );
      }
    }

    const miSets: string[] = [];
    const miParams: any[] = [];
    let p = 1;

    if (b.title !== undefined)        { miSets.push(`original_title = $${p++}`); miParams.push(b.title); }
    if (b.overview !== undefined)     { miSets.push(`overview = $${p++}`); miParams.push(b.overview); }
    if (b.language !== undefined)     { miSets.push(`original_language = $${p++}`); miParams.push(b.language); }
    if (b.status !== undefined)       { miSets.push(`status = $${p++}`); miParams.push(b.status); }
    if (b.popularity !== undefined)   { miSets.push(`popularity = $${p++}`); miParams.push(b.popularity); }
    if (b.vote !== undefined)         { miSets.push(`vote_average = $${p++}`); miParams.push(b.vote); }
    if (b.voteCount !== undefined)    { miSets.push(`vote_count = $${p++}`); miParams.push(b.voteCount); }
    if (b.posterPath !== undefined)   { miSets.push(`poster_path = $${p++}`); miParams.push(b.posterPath); }
    if (b.backdropPath !== undefined) { miSets.push(`backdrop_path = $${p++}`); miParams.push(b.backdropPath); }
    if (b.homepageUrl !== undefined)  { miSets.push(`homepage_url = $${p++}`); miParams.push(b.homepageUrl); }

    if (miSets.length > 0) {
      miParams.push(id);
      const sql = `
        UPDATE "MediaItem"
        SET ${miSets.join(", ")}
        WHERE media_id = $${p} AND media_type = 'tv'
      `;
      await client.query(sql, miParams);
    }

    const tvSets: string[] = [];
    const tvParams: any[] = [];
    p = 1;

    if (b.firstAirDate !== undefined) { tvSets.push(`first_air_date = $${p++}::date`); tvParams.push(b.firstAirDate); }
    if (b.lastAirDate !== undefined)  { tvSets.push(`last_air_date = $${p++}::date`); tvParams.push(b.lastAirDate); }
    if (b.inProduction !== undefined) { tvSets.push(`in_production = $${p++}`); tvParams.push(b.inProduction); }
    if (b.numSeasons !== undefined)   { tvSets.push(`number_of_seasons = $${p++}`); tvParams.push(b.numSeasons); }
    if (b.numEpisodes !== undefined)  { tvSets.push(`number_of_episodes = $${p++}`); tvParams.push(b.numEpisodes); }
    if (b.showType !== undefined)     { tvSets.push(`show_type = $${p++}`); tvParams.push(b.showType); }

    if (tvSets.length > 0) {
      tvParams.push(id);
      const sql = `
        UPDATE "TVShow"
        SET ${tvSets.join(", ")}
        WHERE media_id = $${p}
      `;
      await client.query(sql, tvParams);
    }

    await client.query("COMMIT");

    // Fetch updated TV show with snake_case format to match tests
    const tvQuery = `
      SELECT m.media_id, m.tmdb_id, m.original_title,
             m.overview, m.original_language, m.status,
             m.popularity, m.vote_average, m.vote_count,
             m.poster_path, m.backdrop_path, m.homepage_url,
             tv.first_air_date, tv.last_air_date,
             tv.in_production, tv.number_of_seasons, tv.number_of_episodes,
             tv.show_type
      FROM "MediaItem" m
      JOIN "TVShow" tv ON tv.media_id = m.media_id
      WHERE m.media_id = $1
    `;
    const tvResult = await client.query(tvQuery, [id]);
    const show = tvResult.rows[0];

    return res.json({
      media_id: String(show.media_id),
      tmdb_id: show.tmdb_id,
      original_title: show.original_title,
      overview: show.overview,
      original_language: show.original_language,
      status: show.status,
      popularity: show.popularity,
      vote_average: show.vote_average,
      vote_count: show.vote_count,
      poster_path: show.poster_path,
      backdrop_path: show.backdrop_path,
      homepage_url: show.homepage_url,
      first_air_date: show.first_air_date,
      last_air_date: show.last_air_date,
      in_production: show.in_production,
      number_of_seasons: show.number_of_seasons,
      number_of_episodes: show.number_of_episodes,
      show_type: show.show_type,
    });

  } catch (err: any) {
    await client.query("ROLLBACK");

    if (err.message === "Invalid genreIds") {
      return res.status(400).json({ error: "Invalid genreIds" });
    }

    console.error("[PUT /tv/:id] error:", err);
    return res.status(500).json({ error: "Internal server error" });

  } finally {
    client.release();
  }
});


router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: "Invalid id" });

  try {
    const exists = await pool.query(
      `SELECT 1 FROM "MediaItem" WHERE media_id = $1 AND media_type = 'tv'`,
      [id]
    );

    if (exists.rowCount === 0) {
      return res.status(404).json({ error: "TV show not found" });
    }

    await pool.query(`CALL delete_tvshow_with_cleanup($1)`, [id]);
    return res.json({ deleted: true, mediaId: id });

  } catch (err) {
    console.error("[DELETE /tv/:id] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
