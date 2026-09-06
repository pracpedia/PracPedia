import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { uploadDataUrl } from '@/lib/blob-storage';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId');

    // Public portfolio view: if artistId is provided, anyone authenticated can see it
    // Otherwise, show the authenticated artist's own portfolio
    const where = artistId ? { artistId: String(artistId) } : { artistId: payload.userId };
    const items = await db.portfolioItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items.map((p) => ({
      ...p,
      id: p.id,
      tags: safeJsonParseArray(p.tagsJson),
    })));
  } catch (err: any) {
    console.error('GET /api/portfolio error:', err);
    return NextResponse.json({ error: 'Could not load portfolio.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Only artists can upload portfolio items
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u || u.role !== 'artist') {
      return NextResponse.json({ error: 'Only artists can manage portfolios.' }, { status: 403 });
    }
    const body = await request.json();
    const { imageUrl, title, description, tags } = body;
    if (!imageUrl || !title) {
      return NextResponse.json({ error: 'imageUrl and title are required.' }, { status: 400 });
    }

    // Upload to blob storage if it's a data URL
    const finalImageUrl = imageUrl.startsWith('data:')
      ? await uploadDataUrl(String(imageUrl), 'portfolio')
      : String(imageUrl);

    const tagArr = Array.isArray(tags)
      ? tags
      : (tags ? String(tags).split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const created = await db.portfolioItem.create({
      data: {
        artistId: u.id,
        imageUrl: finalImageUrl,
        title: String(title),
        description: description ? String(description) : '',
        tagsJson: JSON.stringify(tagArr),
      },
    });
    return NextResponse.json({
      ...created,
      id: created.id,
      tags: tagArr,
    });
  } catch (err: any) {
    console.error('POST /api/portfolio error:', err);
    return NextResponse.json({ error: 'Could not upload portfolio item.' }, { status: 500 });
  }
}
