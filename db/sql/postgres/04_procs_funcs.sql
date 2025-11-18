-- Functions for inserting movies and TV shows transactionally

-- Add movie with genres (atomic transaction)
CREATE OR REPLACE FUNCTION add_movie_with_genres(
  p_tmdb_id        BIGINT,
  p_title          TEXT,
  p_release        DATE,
  p_genre_ids      BIGINT[],
  p_language       CHAR(2)      DEFAULT 'en',
  p_status         TEXT         DEFAULT 'Released',
  p_vote           NUMERIC(3,1) DEFAULT 0,
  p_budget         BIGINT       DEFAULT 0,
  p_revenue        BIGINT       DEFAULT 0,
  p_adult          BOOLEAN      DEFAULT FALSE,
  p_runtime        INT          DEFAULT NULL,
  p_collection_id  BIGINT       DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_media_id BIGINT;
BEGIN
  INSERT INTO "MediaItem"
    ("tmdb_id","media_type","original_title","overview","original_language","status","vote_average")
  VALUES
    (p_tmdb_id, 'movie', p_title, NULL, p_language, p_status, p_vote)
  RETURNING "media_id" INTO v_media_id;

  INSERT INTO "Movie"
    ("media_id","release_date","budget","revenue","adult_flag","runtime_minutes","collection_id")
  VALUES
    (v_media_id, p_release, p_budget, p_revenue, p_adult, p_runtime, p_collection_id);

  IF p_genre_ids IS NOT NULL THEN
    INSERT INTO "MediaGenre" ("media_id","genre_id")
    SELECT v_media_id, gid FROM unnest(p_genre_ids) AS gid;
  END IF;

  RETURN v_media_id;
END;
$$;


-- Add TV show with genres (atomic transaction, updated)
CREATE OR REPLACE FUNCTION add_tvshow_with_genres(
  p_tmdb_id          BIGINT,
  p_title            TEXT,
  p_first_air_date   DATE,
  p_genre_ids        BIGINT[],
  p_last_air_date    DATE          DEFAULT NULL,
  p_language         CHAR(2)       DEFAULT 'en',
  p_status           TEXT          DEFAULT 'Returning Series',
  p_vote             NUMERIC(3,1)  DEFAULT 0,
  p_in_production    BOOLEAN       DEFAULT FALSE,
  p_num_seasons      INT           DEFAULT 0,
  p_num_episodes     INT           DEFAULT 0,
  p_show_type        TEXT          DEFAULT 'Scripted'
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_media_id BIGINT;
BEGIN
  INSERT INTO "MediaItem"
    ("tmdb_id","media_type","original_title","overview","original_language","status","vote_average")
  VALUES
    (p_tmdb_id, 'tv', p_title, NULL, p_language, p_status, p_vote)
  RETURNING "media_id" INTO v_media_id;

  INSERT INTO "TVShow"
    ("media_id","first_air_date","last_air_date","in_production",
     "number_of_seasons","number_of_episodes","show_type")
  VALUES
    (v_media_id, p_first_air_date, p_last_air_date, p_in_production,
     p_num_seasons, p_num_episodes, p_show_type);

  IF p_genre_ids IS NOT NULL THEN
    INSERT INTO "MediaGenre" ("media_id","genre_id")
    SELECT v_media_id, gid FROM unnest(p_genre_ids) AS gid;
  END IF;

  RETURN v_media_id;
END;
$$;


-- Privilege grants for app and admin roles
GRANT EXECUTE ON FUNCTION add_movie_with_genres(BIGINT, TEXT, DATE, BIGINT[], CHAR(2), TEXT, NUMERIC, BIGINT, BIGINT, BOOLEAN, INT, BIGINT) TO app_user, admin_user;
GRANT EXECUTE ON FUNCTION add_tvshow_with_genres(BIGINT, TEXT, DATE, BIGINT[], DATE, CHAR(2), TEXT, NUMERIC, BOOLEAN, INT, INT, TEXT) TO app_user, admin_user;

