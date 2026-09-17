import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeUser } from '@/lib/user-serializer';
import { withRetry } from '@/lib/db-retry';

export async function GET(_req: NextRequest) {
  try {
    // Marketplace lists artists who have rates set (rateDrawingOnly > 0).
    const artists = await withRetry(() =>
      db.user.findMany({
        where: {
          role: 'artist',
          rateDrawingOnly: { gt: 0 },
        },
        orderBy: [{ isAvailable: 'desc' }, { rating: 'desc' }, { completedOrders: 'desc' }],
      })
    );
    return NextResponse.json(artists.map((a) => serializeUser(a)));
  } catch (err: any) {
    console.error('GET /api/artists error:', err);
    return NextResponse.json({ error: 'Could not load artists.' }, { status: 500 });
  }
}