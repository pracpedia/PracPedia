import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';

/**
 * Retry wrapper — Neon serverless Postgres can drop idle connections.
 * If the first query fails with a connection error, wait 1s and retry.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (err?.code === 'P1001' || err?.message?.includes('connection') || err?.message?.includes('timed out')) {
        console.warn(`DB connection error (attempt ${i + 1}/${retries}), retrying...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const u = await withRetry(() =>
      db.user.findUnique({ where: { id: payload.userId } })
    );

    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user: serializeUser(u) });
  } catch (err: any) {
    console.error('GET /api/auth/me error:', err);
    // If DB connection fails, return 503 so the client knows to retry
    if (err?.message?.includes('connection') || err?.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database connection issue. Retrying...' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
