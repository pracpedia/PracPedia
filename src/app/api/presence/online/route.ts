import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

/**
 * Returns the list of users who have heartbeated within the last 2 minutes.
 *
 * Response shape:
 *   {
 *     online: [{ id, name, profilePic, role, isYou }],
 *     count: number,
 *     you: boolean,
 *     ts: number
 *   }
 *
 * Auth required — only authenticated users can see who's online.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Online = heartbeat within last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const onlineUsers = await withRetry(() =>
      db.user.findMany({
        where: {
          lastSeenAt: { gte: twoMinutesAgo },
        },
        select: {
          id: true,
          name: true,
          profilePic: true,
          role: true,
          lastSeenAt: true,
        },
        orderBy: { lastSeenAt: 'desc' },
        take: 50, // cap at 50 to prevent huge payloads
      })
    );

    return NextResponse.json({
      online: onlineUsers.map(u => ({
        id: u.id,
        name: u.name,
        profilePic: u.profilePic,
        role: u.role,
        isYou: u.id === payload.userId,
      })),
      count: onlineUsers.length,
      you: onlineUsers.some(u => u.id === payload.userId),
      ts: Date.now(),
    });
  } catch (err: any) {
    console.warn('Presence online fetch failed:', err?.message || err);
    // Best-effort — return empty list instead of 500 so the UI doesn't crash
    return NextResponse.json({ online: [], count: 0, you: false, ts: Date.now() });
  }
}