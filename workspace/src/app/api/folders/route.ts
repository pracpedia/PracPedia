import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    const folders = await db.folder.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(
      folders.map((f) => ({
        id: f.id,
        subjectId: f.subjectId,
        title: f.title,
        description: f.description,
        images: JSON.parse(f.imagesJson || '[]'),
        createdAt: f.createdAt,
      })),
    );
  } catch (err: any) {
    console.error('GET /api/folders error:', err);
    return NextResponse.json({ error: 'Could not load folders.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const body = await request.json();
    const { title, description, subjectId } = body;
    if (!title || !description || !subjectId) {
      return NextResponse.json({ error: 'title, description, subjectId required.' }, { status: 400 });
    }
    const created = await db.folder.create({
      data: {
        title: String(title),
        description: String(description),
        subjectId: String(subjectId),
        imagesJson: '[]',
      },
    });
    return NextResponse.json({
      id: created.id,
      subjectId: created.subjectId,
      title: created.title,
      description: created.description,
      images: [],
      createdAt: created.createdAt,
    });
  } catch (err: any) {
    console.error('POST /api/folders error:', err);
    return NextResponse.json({ error: 'Could not create folder.' }, { status: 500 });
  }
}
