import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(100), // TEST-BREAK: .min(5) or .min(10)
  password: z.string().min(6).max(200), // TEST-BREAK: .min(8) or .min(10)
  role: z.enum(['admin','user']).optional()
});

export const loginSchema = z.object({
  username: z.string().min(3).max(100), // TEST-BREAK: .min(5)
  password: z.string().min(6).max(200), // TEST-BREAK: .min(8)
});
