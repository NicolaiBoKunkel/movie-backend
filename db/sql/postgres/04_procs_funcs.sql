-- =====================================================================
-- STORED FUNCTIONS AND PROCEDURES (FULL CRUD VERSION)
-- Supports ALL fields in MediaItem + Movie + TVShow
-- All fields are OPTIONAL and default to NULL (table defaults apply)
-- No COMMIT statements (correct PostgreSQL behavior)
-- =====================================================================


-- =====================================================================
-- FUNCTION: add_movie_with_genres
-- Creates a MediaItem (movie), Movie row, and MediaGenre links.
-- All fields optional except title + TMDB ID + release-date + genres.
-- Table defaults handle NULLs automatically.
-- Returns: BIGINT (new media_id)
-- =====================================================================

CREATE OR REPLACE FUNCTION add_movie_with_genres(
  p_tmdb_id          BIGINT,
  p_title            TEXT,
  p_release_date     DATE,
  p_genre_ids        BIGINT[],

  -- MediaItem optional metadata
  p_overview         TEXT DEFAULT NULL,
  p_language         CHAR(2) DEFAULT 'en',
  p_status           VARCHAR(50) DEFAULT 'Released',
  p_popularity       NUMERIC DEFAULT NULL,
  p_vote_average     NUMERIC(3,1) DEFAULT NULL,
  p_vote_count       INT DEFAULT NULL,
  p_poster_path      TEXT DEFAULT NULL,
  p_backdrop_path    TEXT DEFAULT NULL,
  p_homepage_url     TEXT DEFAULT NULL,

  -- Movie specific optional fields
  p_budget           BIGINT DEFAULT NULL,
  p_revenue          BIGINT DEFAULT NULL,
  p_adult_flag       BOOLEAN DEFAULT NULL,
  p_runtime_minutes  INT DEFAULT NULL,
  p_collection_id    BIGINT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_media_id BIGINT;
BEGIN
  ---------------------------------------------------------------------
  -- Insert into MediaItem
  ---------------------------------------------------------------------
  INSERT INTO "MediaItem"
    ("tmdb_id", "media_type", "original_title", "overview",
     "original_language", "status", "popularity", "vote_average",
     "vote_count", "poster_path", "backdrop_path", "homepage_url")
  VALUES
    (p_tmdb_id, 'movie', p_title, p_overview,
     p_language, p_status, p_popularity, p_vote_average,
     p_vote_count, p_poster_path, p_backdrop_path, p_homepage_url)
  RETURNING "media_id" INTO v_media_id;

  ---------------------------------------------------------------------
  -- Insert into Movie
  ---------------------------------------------------------------------
  INSERT INTO "Movie"
    ("media_id", "release_date", "budget", "revenue",
     "adult_flag", "runtime_minutes", "collection_id")
  VALUES
    (v_media_id, p_release_date, p_budget, p_revenue,
     p_adult_flag, p_runtime_minutes, p_collection_id);

  ---------------------------------------------------------------------
  -- Insert Genre links
  ---------------------------------------------------------------------
  IF p_genre_ids IS NOT NULL THEN
    INSERT INTO "MediaGenre" ("media_id", "genre_id")
    SELECT v_media_id, gid FROM unnest(p_genre_ids) AS gid;
  END IF;

  RETURN v_media_id;
END;
$$;


GRANT EXECUTE ON FUNCTION add_movie_with_genres(
  BIGINT, TEXT, DATE, BIGINT[],
  TEXT, CHAR(2), VARCHAR(50), NUMERIC, NUMERIC, INT,
  TEXT, TEXT, TEXT,
  BIGINT, BIGINT, BOOLEAN, INT, BIGINT
) TO app_user, admin_user;



-- =====================================================================
-- FUNCTION: add_tvshow_with_genres
-- Creates MediaItem + TVShow + genre links (FULL CRUD version).
-- All fields optional; table defaults apply.
-- Returns: BIGINT (media_id)
-- =====================================================================

CREATE OR REPLACE FUNCTION add_tvshow_with_genres(
  p_tmdb_id          BIGINT,
  p_title            TEXT,
  p_first_air_date   DATE,
  p_genre_ids        BIGINT[],

  p_last_air_date    DATE DEFAULT NULL,

  -- Shared MediaItem metadata
  p_overview         TEXT DEFAULT NULL,
  p_language         CHAR(2) DEFAULT 'en',
  p_status           VARCHAR(50) DEFAULT 'Returning Series',
  p_popularity       NUMERIC DEFAULT NULL,
  p_vote_average     NUMERIC(3,1) DEFAULT NULL,
  p_vote_count       INT DEFAULT NULL,
  p_poster_path      TEXT DEFAULT NULL,
  p_backdrop_path    TEXT DEFAULT NULL,
  p_homepage_url     TEXT DEFAULT NULL,

  -- TV-specific fields
  p_in_production    BOOLEAN DEFAULT NULL,
  p_num_seasons      INT DEFAULT NULL,
  p_num_episodes     INT DEFAULT NULL,
  p_show_type        TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_media_id BIGINT;
BEGIN
  ---------------------------------------------------------------------
  -- Insert into MediaItem
  ---------------------------------------------------------------------
  INSERT INTO "MediaItem"
    ("tmdb_id", "media_type", "original_title", "overview",
     "original_language", "status", "popularity", "vote_average",
     "vote_count", "poster_path", "backdrop_path", "homepage_url")
  VALUES
    (p_tmdb_id, 'tv', p_title, p_overview,
     p_language, p_status, p_popularity, p_vote_average,
     p_vote_count, p_poster_path, p_backdrop_path, p_homepage_url)
  RETURNING "media_id" INTO v_media_id;

  ---------------------------------------------------------------------
  -- Insert into TVShow
  ---------------------------------------------------------------------
  INSERT INTO "TVShow"
    ("media_id", "first_air_date", "last_air_date", "in_production",
     "number_of_seasons", "number_of_episodes", "show_type")
  VALUES
    (v_media_id, p_first_air_date, p_last_air_date, p_in_production,
     p_num_seasons, p_num_episodes, p_show_type);

  ---------------------------------------------------------------------
  -- Insert Genre links (FIXED: added AS gid)
  ---------------------------------------------------------------------
  IF p_genre_ids IS NOT NULL THEN
    INSERT INTO "MediaGenre" ("media_id", "genre_id")
    SELECT v_media_id, gid FROM unnest(p_genre_ids) AS gid;
  END IF;

  RETURN v_media_id;
END;
$$;


GRANT EXECUTE ON FUNCTION add_tvshow_with_genres(
  BIGINT, TEXT, DATE, BIGINT[], DATE,
  TEXT, CHAR(2), VARCHAR(50), NUMERIC, NUMERIC, INT,
  TEXT, TEXT, TEXT,
  BOOLEAN, INT, INT, TEXT
) TO app_user, admin_user;




-- =====================================================================
-- PROCEDURE: delete_movie_with_cleanup
-- Removes ALL related movie data.
-- No COMMIT (PostgreSQL will error if inside a transaction).
-- =====================================================================

CREATE OR REPLACE PROCEDURE delete_movie_with_cleanup(p_media_id BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM "MediaGenre"         WHERE "media_id" = p_media_id;
  DELETE FROM "TitleCasting"       WHERE "media_id" = p_media_id;
  DELETE FROM "TitleCrewAssignment"WHERE "media_id" = p_media_id;
  DELETE FROM "MediaCompany"       WHERE "media_id" = p_media_id;

  DELETE FROM "Movie"              WHERE "media_id" = p_media_id;

  DELETE FROM "MediaItem"
  WHERE "media_id" = p_media_id AND "media_type" = 'movie';
END;
$$;

GRANT EXECUTE ON PROCEDURE delete_movie_with_cleanup(BIGINT)
TO app_user, admin_user;



-- =====================================================================
-- PROCEDURE: delete_tvshow_with_cleanup
-- Removes TV Show, seasons, episodes, casting, crew, companies, etc.
-- No COMMIT.
-- =====================================================================

CREATE OR REPLACE PROCEDURE delete_tvshow_with_cleanup(p_media_id BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_season_ids   BIGINT[];
  v_episode_ids  BIGINT[];
BEGIN
  ---------------------------------------------------------------------
  -- Collect season + episode IDs
  ---------------------------------------------------------------------
  SELECT array_agg("season_id")
    INTO v_season_ids
    FROM "Season"
    WHERE "tv_media_id" = p_media_id;

  IF v_season_ids IS NOT NULL THEN
    SELECT array_agg("episode_id")
      INTO v_episode_ids
      FROM "Episode"
      WHERE "season_id" = ANY(v_season_ids);
  END IF;

  ---------------------------------------------------------------------
  -- Cleanup episodes and episode-level relations
  ---------------------------------------------------------------------
  IF v_episode_ids IS NOT NULL THEN
    DELETE FROM "EpisodeCasting"       WHERE "episode_id" = ANY(v_episode_ids);
    DELETE FROM "EpisodeCrewAssignment"WHERE "episode_id" = ANY(v_episode_ids);
    DELETE FROM "Episode"              WHERE "episode_id" = ANY(v_episode_ids);
  END IF;

  ---------------------------------------------------------------------
  -- Cleanup seasons
  ---------------------------------------------------------------------
  IF v_season_ids IS NOT NULL THEN
    DELETE FROM "Season" WHERE "season_id" = ANY(v_season_ids);
  END IF;

  ---------------------------------------------------------------------
  -- Cleanup show-level relations
  ---------------------------------------------------------------------
  DELETE FROM "MediaGenre"          WHERE "media_id" = p_media_id;
  DELETE FROM "TitleCasting"        WHERE "media_id" = p_media_id;
  DELETE FROM "TitleCrewAssignment" WHERE "media_id" = p_media_id;
  DELETE FROM "MediaCompany"        WHERE "media_id" = p_media_id;

  ---------------------------------------------------------------------
  -- Remove TVShow + MediaItem
  ---------------------------------------------------------------------
  DELETE FROM "TVShow" WHERE "media_id" = p_media_id;

  DELETE FROM "MediaItem"
  WHERE "media_id" = p_media_id AND "media_type" = 'tv';
END;
$$;

GRANT EXECUTE ON PROCEDURE delete_tvshow_with_cleanup(BIGINT)
TO app_user, admin_user;
