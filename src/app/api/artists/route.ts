import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { serializeUser } from '@/lib/user-serializer';

export async function GET(_req: NextRequest) {
  try {
    // Public endpoint: list all available artists
    const artists = await db.user.findMany({
      where: { role: 'artist' },
      orderBy: [{ isAvailable: 'desc' }, { rating: 'desc' }, { completedOrders: 'desc' }],
    });
    return NextResponse.json(artists.map((a) => serializeUser(a)));
  } catch (err: any) {
    console.error('GET /api/artists error:', err);
    return NextResponse.json({ error: 'Could not load artists.' }, { status: 500 });
  }
}
