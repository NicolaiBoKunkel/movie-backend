import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

const isRenderHost = (url?: string) => !!url && /render\.com/i.test(url);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isRenderHost(process.env.DATABASE_URL)
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });

pool
  .connect()
  .then((client: PoolClient) => {
    return client
      .query('SELECT 1')
      .then(() => {
        if (process.env.NODE_ENV !== 'test') {
          console.log('[db] connected');
        }
      })
      .catch((err: Error) => {
        if (process.env.NODE_ENV !== 'test') {
          console.error('[db] test query failed:', err);
        }
      })
      .finally(() => client.release());
  })
  .catch((err: Error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[db] connection failed:', err);
    }
  });

export default pool;
