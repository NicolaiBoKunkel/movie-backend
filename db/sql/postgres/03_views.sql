-- Movies with aggregated genre names
CREATE OR REPLACE VIEW vw_movies_with_genres AS
SELECT
  m.media_id,
  m.original_title,
  m.vote_average,
  COALESCE(STRING_AGG(g.name, ', ' ORDER BY g.name), '') AS genres
FROM "MediaItem" m
JOIN "Movie" mo ON mo.media_id = m.media_id
LEFT JOIN "MediaGenre" mg ON mg.media_id = m.media_id
LEFT JOIN "Genre" g ON g.genre_id = mg.genre_id
GROUP BY m.media_id, m.original_title, m.vote_average;

-- TV shows with season + episode counts
CREATE OR REPLACE VIEW vw_tv_with_counts AS
SELECT
  m.media_id,
  m.original_title,
  COUNT(DISTINCT s.season_id) AS seasons,
  COUNT(e.episode_id)         AS episodes
FROM "MediaItem" m
JOIN "TVShow" t ON t.media_id = m.media_id
LEFT JOIN "Season" s  ON s.tv_media_id = t.media_id
LEFT JOIN "Episode" e ON e.season_id   = s.season_id
GROUP BY m.media_id, m.original_title;
