import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { folderId, imageUrl, title } = body;
    if (!folderId || !imageUrl) {
      return NextResponse.json({ error: 'folderId and imageUrl required.' }, { status: 400 });
    }
    const folder = await db.folder.findUnique({ where: { id: String(folderId) } });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    const images = JSON.parse(folder.imagesJson || '[]');
    images.push({ url: String(imageUrl), title: String(title || '') });
    const updated = await db.folder.update({
      where: { id: folder.id },
      data: { imagesJson: JSON.stringify(images) },
    });
    return NextResponse.json({
      id: updated.id,
      subjectId: updated.subjectId,
      title: updated.title,
      description: updated.description,
      images,
      createdAt: updated.createdAt,
    });
  } catch (err: any) {
    console.error('POST /api/images error:', err);
    return NextResponse.json({ error: 'Could not add image.' }, { status: 500 });
  }
}
