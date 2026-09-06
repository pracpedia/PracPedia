import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Public-safe subset (no auth needed): subjects, folders, artists, announcements
    const subjects = await db.subject.count();
    const folders = await db.folder.count();
    const artists = await db.user.count({ where: { role: 'artist' } });
    const announcements = await db.announcement.count();

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
