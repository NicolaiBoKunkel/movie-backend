import { PrismaClient } from '@prisma/client';

// Create a global prisma instance to avoid connection issues
declare global {
  var prisma: PrismaClient | undefined;
}

// Use a singleton pattern for the Prisma client
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Test the database connection
prisma.$connect()
  .then(() => console.log('[prisma] connected to database'))
  .catch((err: Error) => console.error('[prisma] connection failed:', err));

// Gracefully disconnect on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;