import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const announcements = await db.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(
      announcements.map((a) => ({ ...a, id: a.id })),
    );
  } catch (err: any) {
    console.error('GET /api/announcements error:', err);
    return NextResponse.json({ error: 'Could not load announcements.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    const body = await request.json();
    const { title, content, deadline } = body;
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required.' }, { status: 400 });
    }
    const created = await db.announcement.create({
      data: {
        title: String(title),
        content: String(content),
        deadline: deadline ? String(deadline) : null,
        createdById: u.id,
        createdByName: u.name,
      },
    });
    return NextResponse.json({ ...created, id: created.id });
  } catch (err: any) {
    console.error('POST /api/announcements error:', err);
    return NextResponse.json({ error: 'Could not create announcement.' }, { status: 500 });
  }
}
