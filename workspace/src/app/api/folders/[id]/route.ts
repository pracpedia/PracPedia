import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const folder = await db.folder.findUnique({ where: { id } });
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    return NextResponse.json({
      id: folder.id,
      subjectId: folder.subjectId,
      title: folder.title,
      description: folder.description,
      images: JSON.parse(folder.imagesJson || '[]'),
      createdAt: folder.createdAt,
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_folders');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_folders' }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const updated = await db.folder.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
      },
    });
    return NextResponse.json({
      id: updated.id,
      subjectId: updated.subjectId,
      title: updated.title,
      description: updated.description,
      images: JSON.parse(updated.imagesJson || '[]'),
      createdAt: updated.createdAt,
    });
  } catch (err: any) {
    console.error('PUT /api/folders/[id] error:', err);
    return NextResponse.json({ error: 'Could not update folder.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_folders');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_folders' }, { status: 403 });
    const { id } = await params;
    await db.folder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/folders/[id] error:', err);
    return NextResponse.json({ error: 'Could not delete folder.' }, { status: 500 });
  }
}
