-- Transactional write function: add a movie + link genres atomically.
-- If any part fails (e.g., bad genre_id), the whole call is rolled back.

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

  -- Link genres (FKs ensure validity; any bad id raises and rolls back this call)
  IF p_genre_ids IS NOT NULL THEN
    INSERT INTO "MediaGenre" ("media_id","genre_id")
    SELECT v_media_id, gid FROM unnest(p_genre_ids) AS gid;
  END IF;

  RETURN v_media_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
