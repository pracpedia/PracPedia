import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { uploadImage } from '@/lib/blob-storage';

/**
 * POST /api/announcements/upload-file
 *
 * Admin/super_admin attaches a downloadable file to an announcement.
 * Accepts multipart/form-data with a single `file` field, returns a public
 * URL (Vercel Blob in production, base64 data URL in dev) so the client can
 * then pass that URL to POST /api/announcements as `fileUrl`.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    const MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds the 50 MB upload limit.' },
        { status: 413 },
      );
    }

    const url = await uploadImage(file, 'announcements');
    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
    });
  } catch (err: any) {
    console.error('POST /api/announcements/upload-file error:', err);
    return NextResponse.json({ error: 'File upload failed.' }, { status: 500 });
  }
}
