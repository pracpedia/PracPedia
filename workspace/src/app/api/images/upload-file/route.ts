import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { uploadImage } from '@/lib/blob-storage';

/**
 * Multipart file upload — accepts a single `image` File and returns a URL.
 *
 * Used by UploadModal and AdminCmsPage when the user picks a file from disk.
 * Returns the URL so the client can then call POST /api/images (with folderId
 * + imageUrl) to attach the image to a Folder.
 *
 * In dev (no BLOB_READ_WRITE_TOKEN) the file is returned as a base64 data URL.
 * In production the file is uploaded to Vercel Blob and a public URL is
 * returned.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    // 10 MB cap — protects the dev fallback (base64 inline) from blowing up
    // the DB row size.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image exceeds the 10 MB upload limit. Please use a smaller file.' },
        { status: 413 }
      );
    }

    const url = await uploadImage(file, 'folders');
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('POST /api/images/upload-file error:', err);
    return NextResponse.json({ error: 'Image upload failed.' }, { status: 500 });
  }
}
