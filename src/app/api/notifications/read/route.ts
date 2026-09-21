import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/notifications/read
 *
 * Marks all notifications as read by updating user.lastNotificationSeen to now.
 * No request body needed — just the auth token.
 *
 * Response:
 *   { ok: true, lastNotificationSeen: string (ISO) }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    await db.user.update({
      where: { id: payload.userId },
      data: { lastNotificationSeen: now },
    });

    return NextResponse.json({
      ok: true,
      lastNotificationSeen: now.toISOString(),
    });
  } catch (err: any) {
    console.error('POST /api/notifications/read error:', err);
    return NextResponse.json(
      { error: 'Could not mark notifications as read.' },
      { status: 500 },
    );
  }
}
