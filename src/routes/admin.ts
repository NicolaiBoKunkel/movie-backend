import { Router } from 'express';
import pool from '../db/pool';
import { z } from 'zod';

const router = Router();

// Query validation for /admin/audit
const auditQuerySchema = z.object({
  table: z.string().optional(), // e.g. "Movie", "MediaItem"
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => !Number.isNaN(v) && v > 0 && v <= 200, {
      message: 'limit must be between 1 and 200',
    })
    .optional(),
  // optional: filter by a specific media_id row
  rowId: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => !Number.isNaN(v) && v > 0, {
      message: 'rowId must be a positive integer',
    })
    .optional(),
});

// GET /admin/audit
// Examples:
//   GET /admin/audit
//   GET /admin/audit?table=Movie
//   GET /admin/audit?table=MediaItem&limit=10
//   GET /admin/audit?action=DELETE
//   GET /admin/audit?rowId=2001
router.get('/audit', async (req, res) => {
  const parsed = auditQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parsed.error.issues,
    });
  }

  const { table, action, limit, rowId } = parsed.data;
  const effectiveLimit = limit ?? 50;

  const conditions: string[] = [];
  const params: any[] = [];
  let p = 1;

  if (table) {
    conditions.push(`table_name = $${p++}`);
    params.push(table);
  }

  if (action) {
    conditions.push(`action = $${p++}`);
    params.push(action);
  }

  if (rowId) {
    conditions.push(`row_id = $${p++}`);
    params.push(rowId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      id,
      changed_at,
      table_name,
      action,
      row_id,
      changed_by,
      old_data,
      new_data
    FROM audit_log
    ${whereClause}
    ORDER BY changed_at DESC
    LIMIT $${p};
  `;

  params.push(effectiveLimit);

  try {
    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err: any) {
    console.error('[GET /admin/audit] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
