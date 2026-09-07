import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

export async function GET(request: NextRequest) {
  try {
    // Public-safe subset (no auth needed): subjects, folders, artists, announcements
    // Wrapped in withRetry to handle Neon cold-start connection drops
    const [subjects, folders, artists, announcements] = await withRetry(async () => {
      return Promise.all([
        db.subject.count(),
        db.folder.count(),
        db.user.count({ where: { role: 'artist' } }),
        db.announcement.count(),
      ]);
    }).then(([s, f, a, an]) => [s, f, a, an] as const);

    // Sensitive counts — only returned to authenticated users
    const payload = await getUserFromRequest(request);
    const users = payload ? await db.user.count() : 0;
    const bookings = payload ? await db.booking.count() : 0;
    const portfolioItems = payload ? await db.portfolioItem.count() : 0;
    const chatMessages = payload ? await db.chatMessage.count() : 0;
    const hireRequests = payload ? await db.hireRequest.count() : 0;

    // Count images stored inside folder.imagesJson
    const allFolders = await db.folder.findMany({ select: { imagesJson: true } });
    let images = 0;
    for (const f of allFolders) {
      try {
        const arr = safeJsonParseArray(f.imagesJson);
        if (Array.isArray(arr)) images += arr.length;
      } catch { /* skip malformed */ }
    }

    return NextResponse.json({
      subjects,
      folders,
      users,
      artists,
      announcements,
      bookings,
      images,
      portfolioItems,
      chatMessages,
      hireRequests,
    });
  } catch (err: any) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Could not load stats.' }, { status: 500 });
  }
}
