/**
 * Image storage — dual-provider with priority + automatic failover.
 *
 * Providers:
 *   - Cloudinary (CDN-optimized, image transformations, 25GB free)
 *   - Backblaze B2 (S3-compatible raw object storage, 10GB free, cheaper at scale)
 *
 * Configuration (env vars):
 *   PRIMARY_STORAGE=cloudinary   (or "b2")  — which provider to try first
 *   BACKUP_STORAGE=b2            (or "cloudinary" or "none") — failover target
 *
 *   # Cloudinary
 *   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 *
 *   # Backblaze B2 (S3-compatible API)
 *   B2_KEY_ID=...
 *   B2_APPLICATION_KEY=...
 *   B2_BUCKET_NAME=...
 *   B2_ENDPOINT=https://s3.us-west-002.backblazeb2.com
 *   B2_PUBLIC_URL_BASE=https://f000.backblazeb2.com/file/<bucket>
 *
 * Behaviour:
 *   - uploadImage(): tries PRIMARY, falls back to BACKUP on failure.
 *   - deleteImage(): auto-detects provider by URL pattern + deletes from the right one.
 *   - NO base64 fallback in production — if both fail, throws a clear error.
 */

import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

type Provider = 'cloudinary' | 'b2' | 'none';

function getPrimary(): Provider {
  const v = (process.env.PRIMARY_STORAGE || 'cloudinary').toLowerCase().trim();
  return (v === 'b2' || v === 'cloudinary') ? v : 'cloudinary';
}

function getBackup(): Provider {
  const v = (process.env.BACKUP_STORAGE || 'b2').toLowerCase().trim();
  return (v === 'b2' || v === 'cloudinary' || v === 'none') ? v : 'b2';
}

function isCloudinaryConfigured(): boolean {
  return !!process.env.CLOUDINARY_URL;
}

function isB2Configured(): boolean {
  return !!(
    process.env.B2_KEY_ID &&
    process.env.B2_APPLICATION_KEY &&
    process.env.B2_BUCKET_NAME &&
    process.env.B2_ENDPOINT &&
    process.env.B2_PUBLIC_URL_BASE
  );
}

export function isBlobStorageConfigured(): boolean {
  return isCloudinaryConfigured() || isB2Configured();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function uniqueFilename(title: string | undefined, ext: string): string {
  const slug = title && title.trim() ? slugify(title) : 'image';
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slug}-${ts}${rand}.${ext}`;
}

function extFromMime(mime: string | undefined): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

async function toBuffer(input: File | Blob): Promise<Buffer> {
  const arrayBuffer = await input.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary provider
// ─────────────────────────────────────────────────────────────────────────────

let cloudinaryConfigured = false;
function configureCloudinary(): void {
  if (cloudinaryConfigured) return;
  const url = process.env.CLOUDINARY_URL;
  if (!url) throw new Error('Cloudinary not configured: missing CLOUDINARY_URL');
  cloudinary.config({ url });
  cloudinaryConfigured = true;
}

async function uploadToCloudinary(
  input: File | Blob | string,
  namespace: string,
  title?: string,
): Promise<string> {
  configureCloudinary();

  const uploadOptions: any = {
    folder: `pracpedia/${namespace}`,
    resource_type: 'image',
    unique_filename: true,
    overwrite: false,
  };
  if (title && title.trim()) {
    const slug = slugify(title);
    if (slug) uploadOptions.public_id = slug;
  }

  if (typeof input === 'string') {
    if (!input.startsWith('data:')) return input;
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(input, uploadOptions, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
    return result.secure_url;
  }

  const buffer = await toBuffer(input);
  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err: any, res: any) => {
      if (err) reject(err);
      else resolve(res);
    });
    stream.end(buffer);
  });
  return result.secure_url;
}

async function deleteFromCloudinary(url: string): Promise<void> {
  configureCloudinary();
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;
  await new Promise<void>((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function extractCloudinaryPublicId(url: string): string | null {
  try {
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    let publicId = match[1];
    const lastDot = publicId.lastIndexOf('.');
    if (lastDot > 0) publicId = publicId.substring(0, lastDot);
    return publicId;
  } catch {
    return null;
  }
}

function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

// ─────────────────────────────────────────────────────────────────────────────
// Backblaze B2 provider (S3-compatible)
// ─────────────────────────────────────────────────────────────────────────────

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  if (!isB2Configured()) {
    throw new Error('B2 not configured: missing B2 env vars');
  }
  s3Client = new S3Client({
    endpoint: process.env.B2_ENDPOINT!,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.B2_KEY_ID!,
      secretAccessKey: process.env.B2_APPLICATION_KEY!,
    },
    forcePathStyle: true,
  });
  return s3Client;
}

async function uploadToB2(
  input: File | Blob | string,
  namespace: string,
  title?: string,
): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.B2_BUCKET_NAME!;
  const publicUrlBase = process.env.B2_PUBLIC_URL_BASE!;

  let buffer: Buffer;
  let mime: string;
  if (typeof input === 'string') {
    if (!input.startsWith('data:')) return input;
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    mime = match[1];
    buffer = Buffer.from(match[2], 'base64');
  } else {
    buffer = await toBuffer(input);
    mime = (input as File).type || 'image/jpeg';
  }

  const ext = extFromMime(mime);
  const filename = uniqueFilename(title, ext);
  const key = `pracpedia/${namespace}/${filename}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mime,
  }));

  const base = publicUrlBase.replace(/\/+$/, '');
  return `${base}/${key}`;
}

async function deleteFromB2(url: string): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.B2_BUCKET_NAME!;
  const publicUrlBase = (process.env.B2_PUBLIC_URL_BASE || '').replace(/\/+$/, '');

  if (!url.startsWith(publicUrlBase)) {
    console.warn('[B2 delete] URL does not match B2_PUBLIC_URL_BASE, skipping:', url.slice(0, 80));
    return;
  }
  const key = url.substring(publicUrlBase.length + 1);
  if (!key) return;

  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}

function isB2Url(url: string): boolean {
  const base = (process.env.B2_PUBLIC_URL_BASE || '').replace(/\/+$/, '');
  return !!base && url.startsWith(base);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher — picks primary, falls back to backup
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadImage(
  input: File | Blob | string,
  namespace: string = 'uploads',
  title?: string,
): Promise<string> {
  if (typeof input === 'string' && !input.startsWith('data:')) {
    return input;
  }

  if (!isBlobStorageConfigured()) {
    if (typeof input === 'string') return input;
    return fileToDataUrl(input);
  }

  const primary = getPrimary();
  const backup = getBackup();

  try {
    if (primary === 'cloudinary' && isCloudinaryConfigured()) {
      return await uploadToCloudinary(input, namespace, title);
    }
    if (primary === 'b2' && isB2Configured()) {
      return await uploadToB2(input, namespace, title);
    }
    throw new Error(`Primary storage "${primary}" is not configured`);
  } catch (primaryErr: any) {
    console.error(`[storage] Primary (${primary}) failed:`, primaryErr?.message || primaryErr);

    if (backup !== 'none' && backup !== primary) {
      try {
        if (backup === 'cloudinary' && isCloudinaryConfigured()) {
          console.warn('[storage] Falling back to Cloudinary (backup)');
          return await uploadToCloudinary(input, namespace, title);
        }
        if (backup === 'b2' && isB2Configured()) {
          console.warn('[storage] Falling back to B2 (backup)');
          return await uploadToB2(input, namespace, title);
        }
      } catch (backupErr: any) {
        console.error(`[storage] Backup (${backup}) also failed:`, backupErr?.message || backupErr);
        throw new Error(`Image upload failed: primary (${primary}) and backup (${backup}) both errored. Primary: ${primaryErr?.message}. Backup: ${backupErr?.message}.`);
      }
    }

    throw new Error(`Image upload failed: ${primaryErr?.message || primary}. No backup configured.`);
  }
}

export async function uploadDataUrl(
  dataUrl: string,
  namespace: string = 'uploads',
  title?: string,
): Promise<string> {
  return uploadImage(dataUrl, namespace, title);
}

export async function deleteImage(url: string): Promise<void> {
  try {
    if (!url || url.startsWith('data:')) {
      console.log('[deleteImage] skipping — URL is empty or base64');
      return;
    }

    if (isCloudinaryUrl(url)) {
      console.log('[deleteImage] deleting from Cloudinary:', url.slice(0, 80));
      await deleteFromCloudinary(url);
      console.log('[deleteImage] Cloudinary delete OK');
      return;
    }

    if (isB2Url(url)) {
      console.log('[deleteImage] deleting from B2:', url.slice(0, 80));
      await deleteFromB2(url);
      console.log('[deleteImage] B2 delete OK');
      return;
    }

    console.log('[deleteImage] URL does not match any known provider, skipping:', url.slice(0, 80));
  } catch (err: any) {
    console.error('[deleteImage] failed (non-fatal):', err?.message || err);
  }
}