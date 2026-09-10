import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { getUserFromRequest } from '@/lib/auth';
import { uploadImage } from '@/lib/blob-storage';

/**
 * Multipart file upload — accepts a single `image` File and returns a URL.
 *
 * Used by UploadModal and AdminCmsPage when the user picks a file from disk.
 * Returns the URL so the client can then call POST /api/images (with folderId
 * + imageUrl) to attach the image to a Folder.
 *
 * In dev (no R2_BUCKET_NAME) the file is returned as a base64 data URL.
 * In production the file is uploaded to Cloudflare R2 and a public URL is
 * returned.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Only admins/super_admins can upload images — the attach step
    // (POST /api/images) also requires admin, so allowing students/artists
    // to upload here would let them consume storage without being able to
    // attach the result to any folder.
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
    }

        const formData = await request.formData();
    const file = formData.get('image');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }
    // Optional title field — used as the Cloudinary public_id (slugified)
    const title = (formData.get('title') as string) || undefined;

    // 10 MB cap — protects the dev fallback (base64 inline) from blowing up
    // the DB row size.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image exceeds the 10 MB upload limit. Please use a smaller file.' },
        { status: 413 }
      );
    }

    const url = await uploadImage(file, 'folders', title);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('POST /api/images/upload-file error:', err);
    return NextResponse.json({ error: 'Image upload failed.' }, { status: 500 });
  }
}
