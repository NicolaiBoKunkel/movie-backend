-- ============================================================
-- INDEX PERFORMANCE COMPARISON EXAMPLE FOR PGADMIN
-- ============================================================
-- This script demonstrates the performance impact of indexes
-- by comparing query execution before and after index creation
-- ============================================================

-- ============================================================
-- STEP 1: DROP EXISTING INDEXES (TEMPORARY)
-- ============================================================
-- Note: We're dropping indexes temporarily for testing purposes only
-- Make sure to recreate them afterward!

DROP INDEX IF EXISTS idx_mediaitem_fts;
DROP INDEX IF EXISTS idx_mediaitem_title_trgm;
DROP INDEX IF EXISTS idx_mediaitem_type_rating;
DROP INDEX IF EXISTS idx_mediaitem_popularity;
DROP INDEX IF EXISTS "MediaGenre_media_id_genre_id_idx";
DROP INDEX IF EXISTS "MediaGenre_media_id_idx";
DROP INDEX IF EXISTS "MediaGenre_genre_id_idx";
DROP INDEX IF EXISTS "MediaCompany_media_id_company_id_role_idx";
DROP INDEX IF EXISTS "MediaCompany_media_id_idx";
DROP INDEX IF EXISTS "MediaCompany_company_id_idx";
DROP INDEX IF EXISTS "TitleCasting_media_id_person_id_idx";
DROP INDEX IF EXISTS "TitleCasting_media_id_idx";
DROP INDEX IF EXISTS "TitleCasting_person_id_idx";

-- ============================================================
-- STEP 2: RUN EXPLAIN ANALYZE WITHOUT INDEXES
-- ============================================================
-- This shows the query plan and execution time WITHOUT indexes

EXPLAIN ANALYZE
SELECT 
    mi."media_id",
    mi."original_title",
    mi."media_type",
    mi."vote_average",
    mi."popularity",
    STRING_AGG(DISTINCT g."name", ', ' ORDER BY g."name") as genres
FROM "MediaItem" mi
LEFT JOIN "MediaGenre" mg ON mi."media_id" = mg."media_id"
LEFT JOIN "Genre" g ON mg."genre_id" = g."genre_id"
WHERE mi."media_type" = 'movie'
  AND mi."vote_average" >= 7.0
  AND mi."popularity" > 10
GROUP BY mi."media_id", mi."original_title", mi."media_type", mi."vote_average", mi."popularity"
ORDER BY mi."popularity" DESC
LIMIT 20;

-- ============================================================
-- Example: Complex Join Query Without Indexes
-- ============================================================

EXPLAIN ANALYZE
SELECT 
    mi."original_title",
    p."name" as actor_name,
    tc."character_name",
    mi."vote_average"
FROM "MediaItem" mi
JOIN "TitleCasting" tc ON mi."media_id" = tc."media_id"
JOIN "Actor" a ON tc."person_id" = a."person_id"
JOIN "Person" p ON a."person_id" = p."person_id"
WHERE mi."media_type" = 'movie'
  AND mi."vote_average" >= 8.0
ORDER BY mi."vote_average" DESC, tc."cast_order"
LIMIT 50;

-- ============================================================
-- STEP 3: RECREATE ALL INDEXES
-- ============================================================
-- Now we recreate the indexes for optimal performance

-- MediaGenre indexes
CREATE UNIQUE INDEX IF NOT EXISTS "MediaGenre_media_id_genre_id_idx" 
ON "MediaGenre" ("media_id", "genre_id");

CREATE INDEX IF NOT EXISTS "MediaGenre_media_id_idx" 
ON "MediaGenre" ("media_id");

CREATE INDEX IF NOT EXISTS "MediaGenre_genre_id_idx" 
ON "MediaGenre" ("genre_id");

-- MediaCompany indexes
CREATE UNIQUE INDEX IF NOT EXISTS "MediaCompany_media_id_company_id_role_idx" 
ON "MediaCompany" ("media_id", "company_id", "role");

CREATE INDEX IF NOT EXISTS "MediaCompany_media_id_idx" 
ON "MediaCompany" ("media_id");

CREATE INDEX IF NOT EXISTS "MediaCompany_company_id_idx" 
ON "MediaCompany" ("company_id");

-- TitleCasting indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TitleCasting_media_id_person_id_idx" 
ON "TitleCasting" ("media_id", "person_id");

CREATE INDEX IF NOT EXISTS "TitleCasting_media_id_idx" 
ON "TitleCasting" ("media_id");

CREATE INDEX IF NOT EXISTS "TitleCasting_person_id_idx" 
ON "TitleCasting" ("person_id");

-- Full-text search indexes (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_mediaitem_fts
ON "MediaItem"
USING GIN (
  to_tsvector('english',
    coalesce("original_title",'') || ' ' || coalesce("overview",'')
  )
);

CREATE INDEX IF NOT EXISTS idx_mediaitem_title_trgm
ON "MediaItem"
USING GIN ("original_title" gin_trgm_ops);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_mediaitem_type_rating 
ON "MediaItem" ("media_type", "vote_average");

CREATE INDEX IF NOT EXISTS idx_mediaitem_popularity 
ON "MediaItem" ("popularity" DESC);

-- ============================================================
-- STEP 4: RUN EXPLAIN ANALYZE WITH INDEXES
-- ============================================================
-- This shows the query plan and execution time WITH indexes
-- Compare the execution time and query plan with STEP 2!

EXPLAIN ANALYZE
SELECT 
    mi."media_id",
    mi."original_title",
    mi."media_type",
    mi."vote_average",
    mi."popularity",
    STRING_AGG(DISTINCT g."name", ', ' ORDER BY g."name") as genres
FROM "MediaItem" mi
LEFT JOIN "MediaGenre" mg ON mi."media_id" = mg."media_id"
LEFT JOIN "Genre" g ON mg."genre_id" = g."genre_id"
WHERE mi."media_type" = 'movie'
  AND mi."vote_average" >= 7.0
  AND mi."popularity" > 10
GROUP BY mi."media_id", mi."original_title", mi."media_type", mi."vote_average", mi."popularity"
ORDER BY mi."popularity" DESC
LIMIT 20;

-- ============================================================
-- Example: Complex Join Query With Indexes
-- ============================================================

EXPLAIN ANALYZE
SELECT 
    mi."original_title",
    p."name" as actor_name,
    tc."character_name",
    mi."vote_average"
FROM "MediaItem" mi
JOIN "TitleCasting" tc ON mi."media_id" = tc."media_id"
JOIN "Actor" a ON tc."person_id" = a."person_id"
JOIN "Person" p ON a."person_id" = p."person_id"
WHERE mi."media_type" = 'movie'
  AND mi."vote_average" >= 8.0
ORDER BY mi."vote_average" DESC, tc."cast_order"
LIMIT 50;

-- ============================================================
-- STEP 5: PERFORMANCE COMPARISON SUMMARY
-- ============================================================
-- Compare the results from STEP 2 (without indexes) and STEP 4 (with indexes)
-- 
-- Look for these key metrics in EXPLAIN ANALYZE output:
-- 1. Execution Time: Total time taken (ms)
-- 2. Planning Time: Time spent planning the query
-- 3. Scan Type: Sequential Scan vs Index Scan
-- 4. Rows Processed: Number of rows examined
--
-- Expected improvements with indexes:
-- - Faster execution time (often 10-100x faster)
-- - Index Scan instead of Sequential Scan
-- - Fewer rows processed
-- - Lower cost estimates
-- ============================================================
