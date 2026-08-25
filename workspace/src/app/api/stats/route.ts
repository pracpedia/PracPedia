import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const subjects = await db.subject.count();
    const folders = await db.folder.count();
    const users = await db.user.count();
    const announcements = await db.announcement.count();
    const bookings = await db.booking.count();
    const artists = await db.user.count({ where: { role: 'artist' } });
    const portfolioItems = await db.portfolioItem.count();
    const chatMessages = await db.chatMessage.count();
    const hireRequests = await db.hireRequest.count();

    // Count images stored inside folder.imagesJson
    const allFolders = await db.folder.findMany({ select: { imagesJson: true } });
    let images = 0;
    for (const f of allFolders) {
      try {
        const arr = JSON.parse(f.imagesJson || '[]');
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
