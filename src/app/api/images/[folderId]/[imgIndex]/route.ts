import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { deleteImage } from '@/lib/blob-storage';

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
    const images = safeJsonParseArray(folder.imagesJson) as { url: string; title: string }[];

    // Be defensive about the index — if it's out of range, the client probably
    // had stale state. Return a clear error so the frontend can refresh.
    if (idx < 0 || idx >= images.length) {
      return NextResponse.json({
        error: `Image index out of range (got ${idx}, valid 0–${Math.max(0, images.length - 1)}). Refresh the folder and try again.`,
      }, { status: 400 });
    }

    // Capture the URL BEFORE splicing it out, so we can delete from Cloudinary
    const targetImage = images[idx];
    const targetUrl = typeof targetImage === 'string' ? targetImage : targetImage?.url;

    // Remove from DB first — this is the source of truth for the frontend.
    images.splice(idx, 1);
    const updated = await db.folder.update({
      where: { id: folder.id },
      data: { imagesJson: JSON.stringify(images) },
    });

    // Then best-effort delete from Cloudinary. We do this AFTER the DB update
    // so that even if Cloudinary fails, the image is already removed from the
    // app (the DB is the source of truth, not Cloudinary).
    if (targetUrl) {
      try {
        await deleteImage(targetUrl);
      } catch (cloudErr) {
        // Non-fatal — image is already removed from DB, just log the Cloudinary failure
        console.warn('Cloudinary delete failed (image already removed from DB):', cloudErr);
      }
    }

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