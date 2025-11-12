/**
 * Seed your PostgreSQL DB from the JSON (tmdb_sample_1000.ids_only_1_1000.json)
 *
 * Usage:
 *   ts-node seed_postgres_from_json.ts --json tmdb_sample_1000.ids_only_1_1000.json \
 *     --dsn "postgres://user:password@localhost:5432/yourdb"
 */

import { readFileSync } from "fs";
import path from "path";
import { Client } from "pg";

// ---------- Helper utilities ----------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const cur = args[i];
    if (!cur) continue;
    if (cur.startsWith("--")) {
      const key = cur.replace(/^--/, "");
      const next = args[i + 1];
      // If next is missing or looks like another flag, treat this flag as boolean "true"
      if (!next || next.startsWith("--")) {
        opts[key] = "true";
      } else {
        opts[key] = next;
        i++;
      }
    }
  }
  return opts;
}

async function insertValues<T extends Record<string, any>>(
  client: Client,
  table: string,
  cols: string[],
  rows: T[],
  conflict?: string
) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    console.log(`— skipping ${table}: no data`);
    return;
  }

  // Deduplicate rows in-memory based on conflict columns (or inferred id-like column)
  function dedupeRows(rowsArr: T[], keyCols?: string[]) {
    const seen = new Set<string>();
    const out: T[] = [];
    const keys = keyCols && keyCols.length ? keyCols : (() => {
      const pick = cols.find(c => c === 'id' || c === 'tmdb_id' || c.endsWith('_id'));
      return pick ? [pick] : [];
    })();

    if (!keys.length) return rowsArr; // nothing to dedupe by

    for (const r of rowsArr) {
      const k = keys.map(c => String(r[c] ?? '')).join('::');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  }

  // Normalize conflict param into column array if provided
  let conflictCols: string[] | undefined = undefined;
  if (conflict && String(conflict).trim().length > 0) {
    const raw = String(conflict).trim().replace(/^[()\s]+|[()\s]+$/g, '');
    conflictCols = raw.split(/\s*,\s*/).filter(Boolean);
  }
  if (conflictCols) {
    rows = dedupeRows(rows, conflictCols as string[]);
  } else {
    rows = dedupeRows(rows);
  }

  // PostgreSQL has a limit on the number of parameters in a single query.
  // Chunk rows into smaller batches to avoid exceeding that limit.
  const chunkSize = 500; // safe default; tune if necessary
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);

    const valuesPlaceholders = chunk
      .map((_, rowIdx) =>
        `(${cols.map((_, colIdx) => `$${rowIdx * cols.length + colIdx + 1}`).join(", ")})`
      )
      .join(", ");

    const base = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES ${valuesPlaceholders}`;
    // Determine ON CONFLICT target. If conflict is provided use that, otherwise try to auto-detect
    // a sensible primary key candidate (prefer 'id' or columns ending in '_id').
    let effectiveConflict: string | undefined = undefined;
    if (conflict && String(conflict).trim().length > 0) {
      const confTrim = String(conflict).trim();
      effectiveConflict = confTrim.startsWith("(") ? confTrim : `(${confTrim})`;
    } else {
      // Prefer explicit 'id', then 'tmdb_id', then table-specific id (movie_id), then any _id
      const tableId = `${table.toLowerCase()}_id`;
      const pick = cols.find(c => c === "id" || c === "tmdb_id" || c === tableId || c.endsWith("_id"));
      if (pick) {
        effectiveConflict = `(${pick})`;
      }
    }

    const sql = effectiveConflict ? `${base} ON CONFLICT ${effectiveConflict} DO NOTHING` : base;

    const flatValues = chunk.flatMap(r => cols.map(c => (r[c] === undefined ? null : r[c])));
    const spName = `sp_${table}_${start}`.replace(/[^a-zA-Z0-9_]/g, '_');
    // Use a savepoint so a failing batch doesn't abort the whole transaction
    await client.query(`SAVEPOINT ${spName}`);
    try {
      await client.query(sql, flatValues);
      console.log(`✅ Inserted ${chunk.length} rows into ${table}`);
      await client.query(`RELEASE SAVEPOINT ${spName}`);
    } catch (err: any) {
      // Roll back to savepoint to clear the failed statement and continue
      try {
        await client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
      } catch (rbErr) {
        console.error(`Failed to rollback to savepoint ${spName}:`, rbErr);
        throw err;
      }
      if (err && err.code === '23505') {
        console.log(`⚠️ Duplicate key error inserting into ${table}: ${err.detail ?? err.message ?? err}`);
        continue;
      }
      if (err && err.code === '23503') {
        console.log(`⚠️ Foreign key constraint violation inserting into ${table}: ${err.detail ?? err.message ?? err}`);
        continue;
      }
      throw err;
    }
  }
}

async function printCounts(client: Client, tables: string[]) {
  try {
    console.log("\n🔎 Verifying row counts:");
    for (const t of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*)::int AS cnt FROM "${t}"`);
        const cnt = res.rows?.[0]?.cnt ?? 0;
        console.log(`  - ${t}: ${cnt}`);
      } catch (e: any) {
        console.log(`  - ${t}: (error reading count: ${e?.message ?? e})`);
      }
    }
  } catch (err) {
    console.error("Failed to print counts:", err);
  }
}

async function clearExistingData(client: Client) {
  console.log("🧹 Clearing existing data...");
  
  // Clear tables in reverse dependency order to avoid foreign key issues
  const clearSql = `
    DELETE FROM "TitleCrewAssignment";
    DELETE FROM "EpisodeCrewAssignment";
    DELETE FROM "EpisodeCasting";
    DELETE FROM "TitleCasting";
    DELETE FROM "MediaCompany";
    DELETE FROM "MediaGenre";
    DELETE FROM "CrewMember";
    DELETE FROM "Actor";
    DELETE FROM "Episode";
    DELETE FROM "Season";
    DELETE FROM "TVShow";
    DELETE FROM "Movie";
    DELETE FROM "MediaItem";
    DELETE FROM "Person";
    DELETE FROM "Company";
    DELETE FROM "Collection";
    DELETE FROM "Genre";
  `;
  
  await client.query(clearSql);
  console.log("✅ Existing data cleared");
}

// ---------- Main seeding logic ----------
async function main() {
  const args = parseArgs();
  // Default JSON path: allow explicit --json, JSON_PATH env var, or the bundled sample
  const jsonPath =
    args.json || process.env.JSON_PATH || path.resolve(__dirname, "../db/sql/seed_Data/tmdb_sample_1000.ids_only_1_1000.json");

  // DSN can be passed via --dsn, DSN env var, or DATABASE_URL
  const dsn = args.dsn || process.env.DSN || process.env.DATABASE_URL;

  if (!dsn) {
    console.error("Provide --dsn or set DATABASE_URL environment variable");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const client = new Client({ connectionString: dsn });

  await client.connect();
  await client.query("BEGIN");

  try {
    // Clear existing data first to avoid duplicates
    await clearExistingData(client);

    // Insert in foreign-key-safe order
    
    // 1. Independent tables first (no foreign key dependencies)
    await insertValues(client, "Genre", ["genre_id", "name"], data.Genre, "(genre_id)");
    await insertValues(client, "Collection", ["collection_id","tmdb_id","name","overview","poster_path","backdrop_path"], data.Collection, "(tmdb_id)");
    await insertValues(client, "Company", ["company_id","tmdb_id","name","origin_country","description","logo_path"], data.Company, "(company_id)");
    await insertValues(client, "Person", ["person_id","tmdb_id","name","gender","biography","birth_date","death_date","place_of_birth","profile_path"], data.Person, "(person_id)");

    // 2. MediaItem (independent)
    await insertValues(client, "MediaItem", ["media_id","tmdb_id","media_type","original_title","overview","original_language","status","popularity","vote_average","vote_count","poster_path","backdrop_path","homepage_url"], data.MediaItem, "(media_id)");
    
    // 3. Tables that depend on MediaItem
    await insertValues(client, "Movie", ["media_id","release_date","budget","revenue","adult_flag","runtime_minutes","collection_id"], data.Movie, "(media_id)");
    await insertValues(client, "TVShow", ["media_id","first_air_date","last_air_date","in_production","number_of_seasons","number_of_episodes","show_type"], data.TVShow, "(media_id)");

    // 4. Tables that depend on TVShow
    await insertValues(client, "Season", ["season_id","tv_media_id","season_number","name","air_date","episode_count","poster_path"], data.Season, "(tv_media_id, season_number)");
    
    // 5. Tables that depend on Season
    await insertValues(client, "Episode", ["episode_id","season_id","episode_number","name","air_date","runtime_minutes","overview","still_path"], data.Episode, "(season_id, episode_number)");

    // 6. Tables that depend on Person
    await insertValues(client, "Actor", ["person_id","acting_debut_year"], data.Actor, "(person_id)");
    await insertValues(client, "CrewMember", ["person_id","primary_department"], data.CrewMember, "(person_id)");

    // 7. Junction/relationship tables (depend on multiple parent tables)
    await insertValues(client, "MediaGenre", ["media_id","genre_id"], data.MediaGenre, "(media_id, genre_id)");
    await insertValues(client, "MediaCompany", ["media_id","company_id","role"], data.MediaCompany, "(media_id, company_id, role)");
    
    // 8. Casting tables (depend on Actor which depends on Person)
    await insertValues(client, "TitleCasting", ["media_id","person_id","character_name","cast_order"], data.TitleCasting, "(media_id, person_id)");
    await insertValues(client, "EpisodeCasting", ["episode_id","person_id","character_name","cast_order"], data.EpisodeCasting, "(episode_id, person_id)");
    
    // 9. Crew assignment tables (depend on CrewMember which depends on Person)
    await insertValues(client, "TitleCrewAssignment", ["media_id","person_id","department","job_title"], data.TitleCrewAssignment, "(media_id, person_id, job_title)");
    await insertValues(client, "EpisodeCrewAssignment", ["episode_id","person_id","department","job_title"], data.EpisodeCrewAssignment, "(episode_id, person_id, job_title)");

  await client.query("COMMIT");
  // Print simple verification counts for key tables
  await printCounts(client, ["MediaItem", "Movie", "TVShow"]);
  console.log("🎉 Database seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", err);
  } finally {
    await client.end();
  }
}

main();
