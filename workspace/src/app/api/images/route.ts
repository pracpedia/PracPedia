import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { uploadDataUrl } from '@/lib/blob-storage';

/**
 * POST /api/images
 *
 * Attach an image to a folder. Admin / super_admin only — regular users
 * (students, artists) cannot mutate admin-managed folders.
 *
 * The read-modify-write of `imagesJson` is wrapped in a transaction so
 * two concurrent uploads don't both read the same array and lose one image.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
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

    const finalUrl = imageUrl.startsWith('data:')
      ? await uploadDataUrl(String(imageUrl), 'folders')
      : String(imageUrl);

    // Transaction + read-from-row to avoid the lost-update race where two
    // concurrent uploads both parse the same imagesJson, both push, and one
    // image is silently dropped.
    const updated = await db.$transaction(async (tx) => {
      const fresh = await tx.folder.findUniqueOrThrow({ where: { id: folder.id } });
      const images = safeJsonParseArray(fresh.imagesJson);
      images.push({ url: finalUrl, title: String(title || '') });
      return tx.folder.update({
        where: { id: fresh.id },
        data: { imagesJson: JSON.stringify(images) },
      });
    });

    const images = safeJsonParseArray(updated.imagesJson);
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
