import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; imgIndex: string }> },
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const { folderId, imgIndex } = await params;
    const idx = parseInt(imgIndex, 10);
    if (Number.isNaN(idx)) {
      return NextResponse.json({ error: 'Invalid image index' }, { status: 400 });
    }
    const folder = await db.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    const images = JSON.parse(folder.imagesJson || '[]') as { url: string; title: string }[];
    if (idx < 0 || idx >= images.length) {
      return NextResponse.json({ error: 'Image index out of range' }, { status: 400 });
    }
    images.splice(idx, 1);
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
    console.error('DELETE /api/images/[folderId]/[imgIndex] error:', err);
    return NextResponse.json({ error: 'Could not delete image.' }, { status: 500 });
  }
}
