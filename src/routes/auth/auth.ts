import { Router } from 'express';
import pool from '../../db/pool';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { registerSchema, loginSchema } from './schema';

const router = Router();

const JWT_SECRET: Secret = (process.env.JWT_SECRET || 'dev_only_secret') as Secret;
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '1d';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

/**
 * POST /auth/register
 * Creates a new user. The very first registered user becomes admin automatically.
 * After that, everyone is 'user'.
 */
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }
  const { username, password, role } = parsed.data;

  try {
    // Does username exist?
    const exists = await pool.query('SELECT 1 FROM "UserAccount" WHERE "username"=$1', [username]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Is this the first user? If yes, make admin, else user.
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS c FROM "UserAccount"');
    const isFirstUser = (countRows[0].c === 0);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const finalRole = isFirstUser ? 'admin' : (role ?? 'user');

    const insertSql = `
      INSERT INTO "UserAccount"("username","password_hash","role")
      VALUES ($1,$2,$3)
      RETURNING "user_id","username","role","created_at";
    `;
    const { rows } = await pool.query(insertSql, [username, passwordHash, finalRole]);

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /auth/register] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 * Returns a JWT on success.
 */
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }
  const { username, password } = parsed.data;

  try {
    const sql = 'SELECT user_id, username, password_hash, role FROM "UserAccount" WHERE "username"=$1';
    const { rows } = await pool.query(sql, [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
    { sub: user.user_id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    return res.json({ token, user: { userId: user.user_id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('[POST /auth/login] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
