import { Router } from 'express';
import pool from '../db/pool';
import { z } from 'zod';

const router = Router();

// --- Schema (Zod) ---
const createMovieSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // ISO date
  genreIds: z.array(z.number().int().positive()).min(1),
  language: z.string().length(2).default('en'),
  status: z.string().min(1).max(50).default('Released'),
  vote: z.number().min(0).max(10).default(0),
  budget: z.number().int().min(0).default(0),
  revenue: z.number().int().min(0).default(0),
  adult: z.boolean().default(false),
  runtime: z.number().int().positive().nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

// --- POST /movies ---
router.post('/', async (req, res) => {
  // 1) Validate input
  const parsed = createMovieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parsed.error.issues,
    });
  }
  const b = parsed.data;

  try {
    // 2) Call stored function (atomic)
    const sql = `
      SELECT add_movie_with_genres(
        $1, $2, $3, $4::BIGINT[], $5, $6, $7, $8, $9, $10, $11, $12
      ) AS media_id;
    `;
    const params = [
      b.tmdbId,
      b.title,
      b.releaseDate,
      b.genreIds,
      b.language,
      b.status,
      b.vote,
      b.budget,
      b.revenue,
      b.adult,
      b.runtime ?? null,
      b.collectionId ?? null,
    ];

    const { rows } = await pool.query(sql, params);
    const mediaId = rows[0]?.media_id;

    return res.status(201).json({ mediaId });
  } catch (err: any) {
    const msg = String(err?.message || err);

    // FK violation (e.g., invalid genre id) → 400
    if (msg.includes('MediaGenre_genre_id_fkey') || msg.includes('foreign key')) {
      return res.status(400).json({
        error: 'Invalid genreIds: one or more do not exist',
        details: msg,
      });
    }

    // Unique (tmdb_id) collision, etc. → 400
    if (/duplicate key value/.test(msg)) {
      return res.status(400).json({ error: 'Duplicate key', details: msg });
    }

    console.error('[POST /movies] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
