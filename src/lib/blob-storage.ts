/**
 * Image storage abstraction — Cloudinary.
 *
 * FREE TIER (NO CARD REQUIRED): 25 GB storage, 25 GB bandwidth/month,
 * automatic image optimization, global CDN.
 *
 * Setup:
 *   1. Create a Cloudinary account (https://cloudinary.com — email only, no card)
 *   2. Dashboard → copy your CLOUDINARY_URL
 *   3. Add to .env:
 *
 *     CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 *
 * When Cloudinary is NOT configured (missing env var), falls back to base64
 * data URLs stored inline in the DB — fine for local dev, not for production.
 *
 * Usage:
 *   import { uploadImage, deleteImage } from '@/lib/blob-storage';
 *   const url = await uploadImage(file, 'folder-123');
 *   await deleteImage(url);
 */

import { v2 as cloudinary } from 'cloudinary';

// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary config (lazy-init — only configured when first needed)
// ─────────────────────────────────────────────────────────────────────────────

let isConfigured = false;

function configureCloudinary(): void {
  if (isConfigured) return;
  // The CLOUDINARY_URL env var is the standard config format.
  // cloudinary.v2.config() auto-reads it if set.
  // But we call it explicitly to be safe.
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error('Cloudinary not configured: missing CLOUDINARY_URL env var');
  }
  // cloudinary auto-parses CLOUDINARY_URL on import, but let's be explicit:
  // Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  cloudinary.config({ url });
  isConfigured = true;
}

/**
 * Check whether Cloudinary is configured (CLOUDINARY_URL env var present).
 */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.CLOUDINARY_URL;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload an image to Cloudinary and return a publicly-accessible URL.
 *
 * Accepts either a File/Blob (from multipart form upload) or a base64 data URL
 * string (from client-side FileReader). Auto-detects and handles both.
 *
 * @param input - File/Blob OR base64 data URL string
 * @param namespace - Folder prefix (e.g. 'folders', 'chat', 'portfolio', 'avatars')
 * @returns Public URL (Cloudinary URL or base64 data URL if not configured)
 */
export async function uploadImage(
  input: File | Blob | string,
  namespace: string = 'uploads'
): Promise<string> {
  // If input is a string, it's a data URL — use uploadDataUrl
  if (typeof input === 'string') {
    return uploadDataUrl(input, namespace);
  }

  // ── Dev fallback: base64 data URL ──
  if (!isBlobStorageConfigured()) {
    return fileToDataUrl(input);
  }

  // ── Production: Cloudinary ──
  configureCloudinary();

  // Convert File/Blob to Buffer
  let buffer: Buffer;
  try {
    const arrayBuffer = await input.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Failed to read file for Cloudinary upload:', err);
    return fileToDataUrl(input);
  }

  // Upload with retry
  const maxRetries = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadBuffer(buffer, namespace, (input as File).type);
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

/**
 * Upload a base64 data URL to Cloudinary.
 * If Cloudinary is not configured, returns the data URL as-is (dev fallback).
 */
export async function uploadDataUrl(
  dataUrl: string,
  namespace: string = 'uploads'
): Promise<string> {
  // Validate it's actually a data URL
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  // ── Dev fallback: keep as data URL ──
  if (!isBlobStorageConfigured()) {
    return dataUrl;
  }

  // ── Production: Cloudinary ──
  configureCloudinary();

  // Cloudinary accepts data URLs directly via upload()
  const maxRetries = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(
          dataUrl,
          {
            folder: `pracpedia/${namespace}`,
            resource_type: 'image',
          },
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

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete an image from Cloudinary.
 * Safe to call with ANY URL type — never throws.
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    if (!url || url.startsWith('data:')) return;
    if (!isBlobStorageConfigured()) return;

    // Check if it's a Cloudinary URL
    if (!url.includes('res.cloudinary.com')) return;

    configureCloudinary();

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{format}
    const publicId = extractPublicId(url);
    if (!publicId) return;

    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'image' },
        (err: any) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  } catch (err: any) {
    console.error('Cloudinary delete failed (non-fatal):', err?.message || err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a Buffer to Cloudinary using upload_stream.
 */
function uploadBuffer(buffer: Buffer, namespace: string, mimeType?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `pracpedia/${namespace}`,
        resource_type: 'image',
      },
      (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Extract the public_id from a Cloudinary URL.
 * Input:  https://res.cloudinary.com/tn1bzkyj/image/upload/v1234567890/folders/abc123.jpg
 * Output: pracpedia/folders/abc123
 */
function extractPublicId(url: string): string | null {
  try {
    // Match everything after /image/upload/ and the optional version prefix
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    let publicId = match[1];
    // Remove file extension
    const lastDot = publicId.lastIndexOf('.');
    if (lastDot > 0) {
      publicId = publicId.substring(0, lastDot);
    }
    return publicId;
  } catch {
    return null;
  }
}

/**
 * Convert a File/Blob to a base64 data URL.
 * Server-safe: uses Buffer on server, FileReader in browser.
 */
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
