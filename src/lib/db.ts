import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Custom log filter — suppresses the noisy `prisma:error` lines for
// connection drops that the withRetry() wrapper will auto-recover from.
// Keeps actual query errors visible so we don't hide real bugs.
const silentConnectionErrors = [
  "Can't reach database server",
  'Server has timed out',
  'Connection terminated',
  'Connection closed',
  'kind: Closed',
  'closed the connection',
  'P1001',
  'P1002',
];

const prismaLogger = (event: any) => {
  const msg = String(event?.message || '');
  // If this is a known connection-drop error, downgrade to a single warn line
  // (withRetry will silently recover from it).
  if (silentConnectionErrors.some(p => msg.includes(p))) {
    console.warn(`[db] transient connection drop — withRetry will recover (${msg.slice(0, 120)})`);
    return;
  }
  // Real error — log it normally
  console.error(`[prisma] ${event.level}: ${msg}`);
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
        log: [
      // Route errors through $on('error', ...) instead of stdout.
      // This lets prismaLogger filter out noisy connection-drop errors
      // that withRetry() will auto-recover from.
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'stdout' },
    ],
  });

// Attach our custom logger to suppress noisy connection-drop errors.
if (!globalForPrisma.prisma) {
  try {
    (db as any).$on('error', prismaLogger);
  } catch {
    // $on may not be available in all Prisma versions — silently ignore
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
