import { PrismaClient } from '@prisma/client';

// Prisma 7 requires explicit connection arguments (Adapter or Accelerate URL)
// or standard connection if supported by the environment config.
// See: https://pris.ly/d/client-constructor

// Note: Ensure you have "dotenv" config loaded if running outside Next.js context.
// In Next.js, env vars are loaded automatically.

// Use the singleton pattern to avoid multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient(); // Note: Might need adapter args here in Prisma 7

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
