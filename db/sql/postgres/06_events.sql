-- DDL event logging using PostgreSQL event triggers

-- 1) Table to store DDL events
CREATE TABLE IF NOT EXISTS ddl_event_log (
  id           BIGSERIAL PRIMARY KEY,
  event_type   TEXT        NOT NULL,   -- e.g. 'ddl_command_end'
  tag          TEXT        NOT NULL,   -- e.g. 'CREATE TABLE', 'ALTER TABLE'
  object_names TEXT[],                 -- affected objects, e.g. '{public."Movie"}'
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Event trigger function
CREATE OR REPLACE FUNCTION log_ddl_event()
RETURNS event_trigger AS $$
BEGIN
  INSERT INTO ddl_event_log (event_type, tag, object_names)
  SELECT
    TG_EVENT,
    TG_TAG,
    ARRAY(SELECT object_identity FROM pg_event_trigger_ddl_commands());
END;
$$ LANGUAGE plpgsql;

-- 3) Event trigger (fires after any DDL command finishes)
DROP EVENT TRIGGER IF EXISTS trg_log_ddl;
CREATE EVENT TRIGGER trg_log_ddl
ON ddl_command_end
EXECUTE FUNCTION log_ddl_event();
