-- Enable extensions and add full-text search index on MediaItem
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text index on title + overview
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
