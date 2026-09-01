import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeUser } from '@/lib/user-serializer';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const artist = await db.user.findUnique({ where: { id, role: 'artist' } });
    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }
    // Include portfolio items
    const portfolio = await db.portfolioItem.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      ...serializeUser(artist),
      portfolio: portfolio.map((p) => ({
        ...p,
        id: p.id,
        tags: JSON.parse(p.tagsJson || '[]'),
      })),
    });
  } catch (err: any) {
    console.error('GET /api/artists/[id] error:', err);
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }
}
