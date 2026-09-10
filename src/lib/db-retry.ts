/**
 * Retry wrapper for Prisma DB queries — handles Neon serverless connection drops.
 *
 * Neon scales to zero when idle. The first request after idle can take 5-10
 * seconds to wake up. This wrapper retries with generous delays so the route
 * succeeds instead of returning a 503/500.
 *
 * Usage:
 *   import { withRetry } from '@/lib/db-retry';
 *   const user = await withRetry(() => db.user.findUnique({ where: { id } }));
 */

const MAX_RETRIES = 4;
const INITIAL_DELAY_MS = 1000;

function isConnectionError(err: any): boolean {
  if (!err) return false;
  // Prisma P1001 = can't reach database server
  if (err?.code === 'P1001') return true;
  // Prisma P1002 = server has timed out
  if (err?.code === 'P1002') return true;
  // Prisma P1003 = database does not exist
  if (err?.code === 'P1003') return true;
  // Neon/Postgres "Closed" error — connection dropped after idle.
  // err has shape: { kind: 'Closed', cause: None }
  if (err?.kind === 'Closed') return true;
  // Nested cause may also carry the kind
  if (err?.cause?.kind === 'Closed') return true;
  // Check message for common connection error patterns
  const msg = err?.message || String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('connection') ||
    msg.includes('timed out') ||
    msg.includes('Timed out') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('Server has timed out') ||
    msg.includes('Connection terminated') ||
    msg.includes('Connection closed') ||
    msg.includes('kind: Closed') ||
    msg.includes('closed the connection')
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (isConnectionError(err) && i < retries - 1) {
        // Generous delays: 1s, 2s, 4s — gives Neon time to wake up
        const delay = INITIAL_DELAY_MS * Math.pow(2, i);
        console.warn(`DB connection error (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Warm up the database connection — call this on server startup or before
 * the first user-facing query. Fires a trivial query (SELECT 1) that wakes
 * up Neon without blocking the caller.
 */
let warmingUp = false;
export async function warmupDb(): Promise<void> {
  if (warmingUp) return;
  warmingUp = true;
  try {
    // Import dynamically to avoid circular dependency
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`.catch(() => {});
    console.log('DB warmup complete');
  } catch {
    // Silent — warmup is best-effort
  } finally {
    warmingUp = false;
  }
}
