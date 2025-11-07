-- Audit table + generic row-level audit trigger for core tables.

-- Audit table
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  row_id      BIGINT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by  TEXT        NOT NULL DEFAULT current_user,
  old_data    JSONB,
  new_data    JSONB
);

CREATE OR REPLACE FUNCTION audit_row() RETURNS trigger AS $$
DECLARE
  v_row_id BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      v_row_id := COALESCE(NEW.media_id, NEW.season_id, NEW.episode_id,
                           NEW.person_id, NEW.company_id, NEW.collection_id,
                           NEW.genre_id, NEW.casting_id, NEW.crew_assignment_id);
    EXCEPTION WHEN undefined_column THEN
      v_row_id := NULL;
    END;

    INSERT INTO audit_log(table_name, action, row_id, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, v_row_id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    BEGIN
      v_row_id := COALESCE(NEW.media_id, NEW.season_id, NEW.episode_id,
                           NEW.person_id, NEW.company_id, NEW.collection_id,
                           NEW.genre_id, NEW.casting_id, NEW.crew_assignment_id);
    EXCEPTION WHEN undefined_column THEN
      v_row_id := NULL;
    END;

    INSERT INTO audit_log(table_name, action, row_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, v_row_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    BEGIN
      v_row_id := COALESCE(OLD.media_id, OLD.season_id, OLD.episode_id,
                           OLD.person_id, OLD.company_id, OLD.collection_id,
                           OLD.genre_id, OLD.casting_id, OLD.crew_assignment_id);
    EXCEPTION WHEN undefined_column THEN
      v_row_id := NULL;
    END;

    INSERT INTO audit_log(table_name, action, row_id, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, v_row_id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach AFTER triggers to key tables
-- (Drop first so script is re-runnable)
DROP TRIGGER IF EXISTS trg_audit_mediaitem ON "MediaItem";
CREATE TRIGGER trg_audit_mediaitem
AFTER INSERT OR UPDATE OR DELETE ON "MediaItem"
FOR EACH ROW EXECUTE FUNCTION audit_row();

DROP TRIGGER IF EXISTS trg_audit_movie ON "Movie";
CREATE TRIGGER trg_audit_movie
AFTER INSERT OR UPDATE OR DELETE ON "Movie"
FOR EACH ROW EXECUTE FUNCTION audit_row();

DROP TRIGGER IF EXISTS trg_audit_tvshow ON "TVShow";
CREATE TRIGGER trg_audit_tvshow
AFTER INSERT OR UPDATE OR DELETE ON "TVShow"
FOR EACH ROW EXECUTE FUNCTION audit_row();

DROP TRIGGER IF EXISTS trg_audit_season ON "Season";
CREATE TRIGGER trg_audit_season
AFTER INSERT OR UPDATE OR DELETE ON "Season"
FOR EACH ROW EXECUTE FUNCTION audit_row();

DROP TRIGGER IF EXISTS trg_audit_episode ON "Episode";
CREATE TRIGGER trg_audit_episode
AFTER INSERT OR UPDATE OR DELETE ON "Episode"
FOR EACH ROW EXECUTE FUNCTION audit_row();

DROP TRIGGER IF EXISTS trg_audit_titlecasting ON "TitleCasting";
CREATE TRIGGER trg_audit_titlecasting
AFTER INSERT OR UPDATE OR DELETE ON "TitleCasting"
FOR EACH ROW EXECUTE FUNCTION audit_row();

DROP TRIGGER IF EXISTS trg_audit_episodecasting ON "EpisodeCasting";
CREATE TRIGGER trg_audit_episodecasting
AFTER INSERT OR UPDATE OR DELETE ON "EpisodeCasting"
FOR EACH ROW EXECUTE FUNCTION audit_row();
