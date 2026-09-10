/**
 * Image storage abstraction — Cloudinary.
 */

import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;

function configureCloudinary(): void {
  if (isConfigured) return;
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error('Cloudinary not configured: missing CLOUDINARY_URL env var');
  }
  cloudinary.config({ url });
  isConfigured = true;
}

export function isBlobStorageConfigured(): boolean {
  return !!process.env.CLOUDINARY_URL;
}

/**
 * Sanitize a user-supplied title into a Cloudinary-safe public_id segment.
 * "Page 1" → "page-1"
 * "Mahabubur Rahman" → "mahabubur-rahman"
 */
function slugify(title: string): string {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function uploadImage(
  input: File | Blob | string,
  namespace: string = 'uploads',
  title?: string,
): Promise<string> {
  if (typeof input === 'string') {
    return uploadDataUrl(input, namespace, title);
  }
  if (!isBlobStorageConfigured()) {
    return fileToDataUrl(input);
  }
  configureCloudinary();
  let buffer: Buffer;
  try {
    const arrayBuffer = await input.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Failed to read file for Cloudinary upload:', err);
    return fileToDataUrl(input);
  }
  const maxRetries = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadBuffer(buffer, namespace, (input as File).type, title);
      return result;
    } catch (err: any) {
      lastErr = err;
      console.error(`Cloudinary upload attempt ${attempt}/${maxRetries} failed:`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  console.error('Cloudinary upload failed after all retries, falling back to base64:', lastErr?.message || lastErr);
  return fileToDataUrl(input);
}

export async function uploadDataUrl(
  dataUrl: string,
  namespace: string = 'uploads',
  title?: string,
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  if (!isBlobStorageConfigured()) {
    return dataUrl;
  }
  configureCloudinary();

  const uploadOptions: any = {
    folder: `pracpedia/${namespace}`,
    resource_type: 'image',
    unique_filename: true,
    overwrite: false,
  };
  if (title && title.trim()) {
    const slug = slugify(title);
    if (slug) {
      uploadOptions.public_id = slug;
    }
  }

  const maxRetries = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(
          dataUrl,
          uploadOptions,
          (err: any, res: any) => {
            if (err) reject(err);
            else resolve(res);
          }
        );
      });
      return result.secure_url;
    } catch (err: any) {
      lastErr = err;
      console.error(`Cloudinary data URL upload attempt ${attempt}/${maxRetries} failed:`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  console.error('Cloudinary data URL upload failed after all retries, keeping base64:', lastErr?.message || lastErr);
  return dataUrl;
}

export async function deleteImage(url: string): Promise<void> {
  try {
    if (!url || url.startsWith('data:')) {
      console.log('[deleteImage] skipping — URL is empty or base64 data URL');
      return;
    }
    if (!isBlobStorageConfigured()) {
      console.log('[deleteImage] skipping — Cloudinary not configured');
      return;
    }
    if (!url.includes('res.cloudinary.com')) {
      console.log('[deleteImage] skipping — URL is not a Cloudinary URL:', url.slice(0, 80));
      return;
    }
    configureCloudinary();
    const publicId = extractPublicId(url);
    if (!publicId) {
      console.log('[deleteImage] could not extract public_id from URL:', url);
      return;
    }
    console.log('[deleteImage] deleting Cloudinary asset with public_id:', publicId);
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'image' },
        (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
    console.log('[deleteImage] Cloudinary response:', JSON.stringify(result));
  } catch (err: any) {
    console.error('[deleteImage] Cloudinary delete failed (non-fatal):', err?.message || err);
  }
}

function uploadBuffer(buffer: Buffer, namespace: string, mimeType?: string, title?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: `pracpedia/${namespace}`,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
    };
    if (title && title.trim()) {
      const slug = slugify(title);
      if (slug) {
        uploadOptions.public_id = slug;
      }
    }
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res.secure_url);
      }
    );
    stream.end(buffer);
  });
}

function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    let publicId = match[1];
    const lastDot = publicId.lastIndexOf('.');
    if (lastDot > 0) {
      publicId = publicId.substring(0, lastDot);
    }
    return publicId;
  } catch {
    return null;
  }
}

async function fileToDataUrl(file: File | Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mime = (file as File).type || 'image/jpeg';
  const base64 = buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
}