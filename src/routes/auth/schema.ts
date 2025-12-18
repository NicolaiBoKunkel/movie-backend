import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(100), // unit break test (10)
  password: z.string().min(6).max(200), // unit break test (10)
  role: z.enum(['admin','user']).optional()
});

export const loginSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6).max(200),
});
