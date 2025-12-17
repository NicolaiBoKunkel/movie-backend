import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret';

export interface AuthRequest extends Request {
  user?: { sub: number; username: string; role: 'admin' | 'user' };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  // TEST-BREAK: Change to .json({ error: 'Token required' }) to break test

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
    // TEST-BREAK: Change to .json({ error: 'Token validation failed' }) to break test
  }
}

export function requireRole(role: 'admin' | 'user') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
