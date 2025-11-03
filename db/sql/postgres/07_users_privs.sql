-- Create database users and assign correct privileges
-- Run this AFTER the schema (01_schema.sql) and seed (02_seed.sql)

DO $$ BEGIN
  CREATE ROLE app_user LOGIN PASSWORD 'app_password';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Role app_user already exists, skipping';
END $$;

DO $$ BEGIN
  CREATE ROLE admin_user LOGIN PASSWORD 'admin_password';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Role admin_user already exists, skipping';
END $$;

DO $$ BEGIN
  CREATE ROLE readonly_user LOGIN PASSWORD 'readonly_password';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Role readonly_user already exists, skipping';
END $$;

DO $$ BEGIN
  CREATE ROLE restricted_ro LOGIN PASSWORD 'restricted_password';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Role restricted_ro already exists, skipping';
END $$;

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
