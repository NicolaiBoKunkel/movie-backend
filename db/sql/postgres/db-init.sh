#!/bin/bash
set -euo pipefail

# db-init.sh
# Idempotent initialization script to run inside a postgres client container
# This script will:
#  - create roles (if missing)
#  - set passwords for app_user/admin_user if APP_DB_PW/ADMIN_DB_PW env vars set
#  - apply schema (01_schema.sql) if a sentinel table doesn't exist
#  - apply grants (07_users_privs.sql)
#  - ensure the app-level user table (09_user_account.sql) exists

PSQL="psql -v ON_ERROR_STOP=1"

# Helper to run SQL file as postgres
run_as_postgres() {
  local sqlfile="$1"
  echo "-- Running $sqlfile as postgres"
  cat "/sql/$sqlfile" | $PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -q
}

# Normalize optional env vars and Wait for Postgres to be ready
# Provide defaults so script doesn't fail with 'unbound variable' under set -u
PGPORT="${PGPORT:-5432}"
PGPASSWORD="${PGPASSWORD:-}"

echo "Waiting for Postgres at $PGHOST:$PGPORT (up to 60s)"
RETRIES=30
SLEEP=2
until PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" -d "$PGDATABASE" -c '\q' >/dev/null 2>&1; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -le 0 ]; then
    echo "Timed out waiting for Postgres at $PGHOST:$PGPORT"
    exit 1
  fi
  sleep $SLEEP
done


# 1) Ensure roles exist (idempotent)
cat <<'SQL' | $PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE"
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_user') THEN
    CREATE ROLE admin_user LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
    CREATE ROLE readonly_user LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restricted_ro') THEN
    CREATE ROLE restricted_ro LOGIN;
  END IF;
END $$;
SQL

# 2) Set passwords if provided
if [ -n "${APP_DB_PW:-}" ]; then
  echo "Setting password for app_user"
  echo "ALTER ROLE app_user WITH PASSWORD '$(echo "$APP_DB_PW" | sed "s/'/''/g")';" | $PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE"
fi

if [ -n "${ADMIN_DB_PW:-}" ]; then
  echo "Setting password for admin_user"
  echo "ALTER ROLE admin_user WITH PASSWORD '$(echo "$ADMIN_DB_PW" | sed "s/'/''/g")';" | $PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE"
fi

# 3) Apply schema if MediaItem table missing
# Check information_schema for the presence of the exact table name
echo "Checking for existing MediaItem table"
exists=$($PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -tA -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='MediaItem');")
echo "information_schema.exists=$exists"
if [ "${exists:-f}" = "f" ]; then
  echo "MediaItem not found - applying schema"
  run_as_postgres "01_schema.sql"
else
  echo "Schema appears present (MediaItem exists) - skipping schema application"
fi

# 3b) Apply stored functions + procedures
run_as_postgres "04_procs_funcs.sql"

# 4) Apply grants (07)
run_as_postgres "07_users_privs.sql"

# 4b) Create / refresh audit triggers
run_as_postgres "05_triggers.sql"

# 4c) Apply fulltext
run_as_postgres "08_fulltext.sql"

# 5) SQL seeder removed by request: this project uses JSON seeding instead.
echo "NOTE: SQL file 02_seed.sql was removed; JSON seeding (seed-json) is the supported method now."

# 6) Ensure UserAccount table exists
run_as_postgres "09_user_account.sql"

# 7) Create a dev admin user if DEV_ADMIN_PW provided (optional)
if [ -n "${DEV_ADMIN_PW:-}" ]; then
  echo "Creating dev admin user"
  # create extension if not exists
  echo "CREATE EXTENSION IF NOT EXISTS pgcrypto;" | $PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE"
  # insert or do nothing if exists
  cat <<SQL | $PSQL -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE"
INSERT INTO "UserAccount" (username, password_hash, role)
SELECT 'admin', crypt('$(echo "$DEV_ADMIN_PW" | sed "s/'/''/g")', gen_salt('bf')), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM "UserAccount" WHERE username='admin');
SQL
fi

echo "db-init finished"