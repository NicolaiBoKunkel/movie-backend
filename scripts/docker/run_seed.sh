#!/usr/bin/env bash
set -euo pipefail

# run_seed.sh
# - installs postgresql client
# - waits for DB to be reachable
# - runs the JS seeder (or the TS seeder if you prefer)
# - keeps the container alive so docker compose sees the service as "up"

APP_DB_PW="${APP_DB_PW:-}"
DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@db:5432/moviedb}"
SEED_JSON_PATH="${SEED_JSON_PATH:-db/sql/seed_Data/tmdb_sample_1000.ids_only_1_1000.json}"

echo "Starting seed wrapper: will wait for DB and run seeder"

# Install psql client so we can reliably wait for Postgres to be ready
if ! command -v psql >/dev/null 2>&1; then
  echo "Installing postgresql-client..."
  apt-get update -qq && apt-get install -y -qq postgresql-client
fi

# Wait for Postgres to accept connections
PGHOST=${PGHOST:-db}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-postgres}
PGDATABASE=${PGDATABASE:-moviedb}

RETRIES=60
SLEEP=2
until PGPASSWORD="postgres" psql -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" -d "$PGDATABASE" -c '\q' >/dev/null 2>&1; do
  RETRIES=$((RETRIES-1))
  if [ $RETRIES -le 0 ]; then
    echo "Timed out waiting for Postgres at $PGHOST:$PGPORT"
    exit 1
  fi
  echo "Waiting for Postgres... ($RETRIES)"
  sleep $SLEEP
done

echo "Postgres appears ready. Preparing to seed using $DATABASE_URL"

# Install node deps if node_modules missing
if [ ! -d node_modules ]; then
  echo "Installing node dependencies (npm ci)"
  npm ci --silent
fi

# Generate Prisma client for the container environment
echo "Generating Prisma client for container environment..."
npx prisma generate

# Run the new Prisma seeder with relaxed TypeScript checking
set +e
npx ts-node --compiler-options '{"strict": false}' prisma/seed.ts
RC=$?
set -e

if [ $RC -ne 0 ]; then
  echo "Seeder exited with code $RC"
  # Keep container up for inspection (but indicate failure)
  echo "Leaving container running for inspection (seeder failed)."
  tail -f /dev/null
fi

echo "Seeder completed successfully. Container will remain running so service stays 'up'."
tail -f /dev/null
echo "Exiting after successful seed."
exit 0
