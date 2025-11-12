-- Create database users and assign correct privileges
-- Run this AFTER the schema (01_schema.sql). The old SQL seeder (02_seed.sql)
-- has been removed; this project now uses JSON seeding (see scripts/seed_postgres_from_json.ts)
-- privileges but does NOT embed plaintext passwords. Use the helper
-- scripts/create_db_roles.ps1 to set secure passwords interactively or via
-- environment variables before attempting to connect as those users.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  ELSE
    RAISE NOTICE 'Role app_user already exists, skipping';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_user') THEN
    CREATE ROLE admin_user LOGIN;
  ELSE
    RAISE NOTICE 'Role admin_user already exists, skipping';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
    CREATE ROLE readonly_user LOGIN;
  ELSE
    RAISE NOTICE 'Role readonly_user already exists, skipping';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restricted_ro') THEN
    CREATE ROLE restricted_ro LOGIN;
  ELSE
    RAISE NOTICE 'Role restricted_ro already exists, skipping';
  END IF;
END $$;

-- NOTE: change the database name below if your DB is not named 'moviedb'
GRANT CONNECT ON DATABASE moviedb TO app_user, admin_user, readonly_user, restricted_ro;

GRANT USAGE ON SCHEMA public TO app_user, admin_user, readonly_user, restricted_ro;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user, restricted_ro;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO app_user, admin_user, readonly_user, restricted_ro;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
