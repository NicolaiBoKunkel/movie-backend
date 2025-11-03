import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  // ssl: { rejectUnauthorized: false } // enable if later use managed DB with SSL
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
