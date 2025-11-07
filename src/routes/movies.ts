import { Router } from 'express';
import pool from '../db/pool';

const router = Router();

/**
 * GET /movies
 * returns up to 10 media items (any type).
 */
router.get('/', async (_req, res) => {
  try {
    const sql = 'SELECT * FROM vw_movies_with_genres ORDER BY media_id LIMIT $1;';
    const { rows } = await pool.query(sql, [10]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /movies] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
