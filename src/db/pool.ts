import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

// Debug: Log what we're using
console.log('[pool] DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('[pool] NODE_ENV:', process.env.NODE_ENV);

// Use DATABASE_URL if available (production), otherwise use individual vars (local dev)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'moviedb',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
    });

pool
  .connect()
  .then((client: PoolClient) => {
    return client
      .query('SELECT 1')
      .then(() => console.log('[db] connected'))
      .catch((err: Error) => console.error('[db] test query failed:', err))
      .finally(() => client.release());
  })
  .catch((err: Error) => console.error('[db] connection failed:', err));

export default pool;
