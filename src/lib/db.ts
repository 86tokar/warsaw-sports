import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Бесплатная база Neon засыпает после простоя; первое подключение после сна может занять несколько секунд.
// Prisma по умолчанию ждёт подключения 5 секунд — даём больше, чтобы страница не падала на «пробуждении».
function withTimeouts(url: string | undefined): string | undefined {
  if (!url || !url.startsWith('postgres')) return url;
  const u = new URL(url);
  if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '20');
  if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20');
  return u.toString();
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: withTimeouts(process.env.DATABASE_URL) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
