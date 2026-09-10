import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await withRetry(() =>
      db.user.update({
        where: { id: payload.userId },
        data: { lastSeenAt: new Date() },
        select: { id: true },
      })
    );

    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err: any) {
    console.warn('Presence heartbeat failed:', err?.message || err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}