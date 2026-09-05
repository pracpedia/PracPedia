/**
 * Image storage abstraction — Cloudflare R2 (S3-compatible).
 *
 * FREE TIER: 10 GB storage, 1M writes/month, 10M reads/month, ZERO egress fees.
 *
 * Setup:
 *   1. Create a Cloudflare account → R2 → Create bucket
 *   2. Settings → API → Create API Token (Object Read & Write)
 *   3. Enable public access (Custom Domain or r2.dev subdomain)
 *   4. Add these to .env:
 *
 *     R2_ACCOUNT_ID=your_account_id
 *     R2_ACCESS_KEY_ID=your_access_key
 *     R2_SECRET_ACCESS_KEY=your_secret_key
 *     R2_BUCKET_NAME=your_bucket_name
 *     R2_PUBLIC_URL=https://your-bucket.your-account.r2.dev
 *
 * When R2 is NOT configured (missing env vars), falls back to base64 data URLs
 * stored inline in the DB — fine for local dev, not for production.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// ─────────────────────────────────────────────────────────────────────────────
// R2 client (lazy-init — only created when first needed)
// ─────────────────────────────────────────────────────────────────────────────

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 not configured: missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY');
  }
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestHandler: {
      requestTimeout: 30000,
      connectionTimeout: 10000,
    } as any,
  });
  return r2Client;
}

/**
 * Check whether R2 is configured (all required env vars present).
 */
export function isBlobStorageConfigured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload an image to R2 and return a publicly-accessible URL.
 *
 * Accepts either a File/Blob (from multipart form upload) or a base64 data URL
 * string (from client-side FileReader). Auto-detects and handles both.
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

  // ── Production: Cloudflare R2 ──
  const fileName = (input as File).name || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext) ? ext : 'jpg';
  const filename = `${namespace}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
  const contentType = getContentType(safeExt, (input as File).type);

  let buffer: Buffer;
  try {
    const arrayBuffer = await input.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Failed to read file for R2 upload:', err);
    return fileToDataUrl(input);
  }

  // Upload with retry
  const maxRetries = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await getR2Client().send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: filename,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      return `${process.env.R2_PUBLIC_URL}/${filename}`;
    } catch (err: any) {
      lastErr = err;
      console.error(`R2 upload attempt ${attempt}/${maxRetries} failed:`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  console.error('R2 upload failed after all retries, falling back to base64:', lastErr?.message || lastErr);
  return fileToDataUrl(input);
}

/**
 * Upload a base64 data URL to R2.
 * If R2 is not configured, returns the data URL as-is (dev fallback).
 */
export async function uploadDataUrl(
  dataUrl: string,
  namespace: string = 'uploads'
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  if (!isBlobStorageConfigured()) {
    return dataUrl;
  }

  const { mime, buffer } = dataUrlToBuffer(dataUrl);
  const ext = mimeToExt(mime);
  const filename = `${namespace}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const maxRetries = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await getR2Client().send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: filename,
          Body: buffer,
          ContentType: mime,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      return `${process.env.R2_PUBLIC_URL}/${filename}`;
    } catch (err: any) {
      lastErr = err;
      console.error(`R2 data URL upload attempt ${attempt}/${maxRetries} failed:`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }

  console.error('R2 data URL upload failed after all retries, keeping base64:', lastErr?.message || lastErr);
  return dataUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete an image from R2.
 * Safe to call with ANY URL type — never throws.
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    if (!url || url.startsWith('data:')) return;
    if (!isBlobStorageConfigured()) return;

    const r2Base = process.env.R2_PUBLIC_URL!;
    if (!url.startsWith(r2Base)) return;

    const key = url.substring(r2Base.length + 1);
    if (!key) return;

    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch (err: any) {
    console.error('R2 delete failed (non-fatal):', err?.message || err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getContentType(ext: string, fallbackMime?: string): string {
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  };
  return types[ext] || fallbackMime || 'image/jpeg';
}

function mimeToExt(mime: string): string {
  const exts: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return exts[mime] || 'jpg';
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

function dataUrlToBuffer(dataUrl: string): { mime: string; buffer: Buffer } {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const buffer = Buffer.from(base64, 'base64');
  return { mime, buffer };
}
