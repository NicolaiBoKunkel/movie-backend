# Movie Database Backend

A Node.js + TypeScript + Express backend connected to a PostgreSQL database running via Docker.  
The project sets up the database schema, seeds initial data, and establishes a clean starting point for API development.

---

## Features started implementing so far

- **PostgreSQL via Docker Compose**  
  - Schema script (`01_schema.sql`) (SQL seeder `02_seed.sql` removed — use JSON seeder)
  - Roles & privileges script (`07_users_privs.sql`)
  - Views for movies and TV shows (`03_views.sql`)
  - Audit logging via triggers (`05_triggers.sql`)
  - Stored function for transactional movie creation (`add_movie_with_genres`)

- **Database Tested & Verified**
  - 17 tables successfully created
  - Data seeded correctly
  - `app_user` role verified to connect and query
  - Audit logs capture all INSERT, UPDATE, DELETE operations

- **TypeScript + Express API**
  - Configured project with TypeScript, Nodemon, and Dotenv
  - Working `/health` endpoint
  - Connected to database using the `pg` library
  - `/movies` endpoint returning `MediaItem` rows
  - Ready to expand into full API

---

## Environment Variables

Create a `.env` file at the project root:

```env
# PostgreSQL connection
PGHOST=localhost
PGPORT=5432
PGDATABASE=moviedb
PGUSER=app_user
PGPASSWORD=app_password

# Express server
PORT=5000

---
Getting Started
1. Start PostgreSQL via Docker
docker compose up -d

2. Install Dependencies
npm install

3. Start the Development Server
npm run dev