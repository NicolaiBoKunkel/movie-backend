import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

// Use DATABASE_URL if available (production), otherwise use individual vars (local dev)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
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
