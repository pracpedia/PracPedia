/**
 * Retry wrapper for Prisma DB queries — handles Neon serverless connection drops.
 *
 * Neon scales to zero when idle. The first request after idle can fail with
 * P1001 ("Can't reach database server"). This wrapper retries the query
 * with exponential backoff so the route returns a successful response
 * instead of a 500 error.
 *
 * Usage:
 *   import { withRetry } from '@/lib/db-retry';
 *   const user = await withRetry(() => db.user.findUnique({ where: { id } }));
 */

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 500;

function isConnectionError(err: any): boolean {
  if (!err) return false;
  // Prisma P1001 = can't reach database server
  if (err?.code === 'P1001') return true;
  // Check message for common connection error patterns
  const msg = err?.message || String(err);
  return (
    msg.includes('Can\'t reach database server') ||
    msg.includes('connection') ||
    msg.includes('timed out') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND')
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
        const delay = INITIAL_DELAY_MS * Math.pow(2, i); // 500ms, 1000ms, 2000ms
        console.warn(`DB connection error (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
