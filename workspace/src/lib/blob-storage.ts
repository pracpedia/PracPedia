/**
 * Image storage abstraction.
 *
 * Uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (production on Vercel).
 * Falls back to base64 data URLs when the token is absent (local dev).
 *
 * This keeps the DB small in production (images live in Blob storage, not the
 * database) while allowing local dev to work with zero setup.
 *
 * Usage:
 *   import { uploadImage, deleteImage } from '@/lib/blob-storage';
 *
 *   const url = await uploadImage(file, 'folder-123');
 *   await deleteImage(url);
 */

import { put, del } from '@vercel/blob';

/**
 * Upload an image file and return a publicly-accessible URL.
 *
 * @param file - The File/Blob to upload
 * @param namespace - A folder-like prefix (e.g. 'folders', 'chat', 'portfolio', 'avatars')
 * @returns URL string (either Vercel Blob URL or base64 data URL)
 */
export async function uploadImage(
  file: File | Blob,
  namespace: string = 'uploads'
): Promise<string> {
  // ── Dev fallback: base64 data URL ────────────────────────────────────────
  // Used when BLOB_READ_WRITE_TOKEN is not set (local dev without Vercel Blob).
  // Images get stored inline in the DB as data URLs — fine for dev, bad for prod.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fileToDataUrl(file);
  }

  // ── Production: Vercel Blob ───────────────────────────────────────────────
  const ext = (file as File).name?.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${namespace}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return blob.url;
}

/**
 * Upload a base64 data URL string to Vercel Blob.
 * Used when the client already has a data URL (e.g. from FileReader) and we
 * want to migrate it to Blob storage.
 *
 * In dev (no token), returns the data URL as-is.
 */
export async function uploadDataUrl(
  dataUrl: string,
  namespace: string = 'uploads'
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return dataUrl; // dev fallback — keep as data URL
  }

  // Convert data URL → Blob → upload
  const blob = dataUrlToBlob(dataUrl);
  return uploadImage(blob, namespace);
}

/**
 * Delete an image from storage.
 * Safe to call with any URL — if it's a data URL, this is a no-op.
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url || url.startsWith('data:')) return; // data URLs can't be deleted

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(url);
    } catch (err) {
      console.error('Failed to delete blob:', err);
      // Don't throw — image deletion is best-effort
    }
  }
}

/**
 * Check whether Vercel Blob is configured.
 * Useful for showing a "dev mode" indicator in the UI.
 */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a File/Blob to a base64 data URL.
 *
 * Server-safe: uses `Buffer` (Node) when `FileReader` is unavailable (i.e. in
 * the Next.js server runtime), and falls back to `FileReader` in the browser.
 */
async function fileToDataUrl(file: File | Blob): Promise<string> {
  // Browser path
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Server path (Node.js — Next.js route handlers)
  // Convert Blob/File to a Buffer, then base64-encode.
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // Determine mime type — File has `.type`, Blob has `.type` too.
  const mime = (file as File).type || 'image/jpeg';
  const base64 = buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  // Server-safe base64 decode (atob exists in Node 16+ via Buffer, in browser natively)
  const binary = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
