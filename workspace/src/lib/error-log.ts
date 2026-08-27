/**
 * File-based error log writer/reader.
 *
 * Errors reported by the client are persisted as JSON-lines
 * (one JSON object per line) at /home/z/my-project/logs/errors.log.
 *
 * This avoids a Prisma migration (just for dev logging) while still giving
 * admins a queryable on-disk record. For production you'd swap this for
 * Sentry / Datadog / a Postgres `ErrorLog` table — the API surface here is
 * small enough that the swap is a one-file change.
 */

import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = '/home/z/my-project/logs';
const LOG_FILE = path.join(LOG_DIR, 'errors.log');

export interface ErrorLogEntry {
  ts: string;
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  userAgent?: string;
  ip?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  extra?: Record<string, any>;
}

/**
 * Append an entry to the JSON-lines error log.
 * Creates the log dir/file if it doesn't exist yet.
 */
export async function appendErrorLog(entry: ErrorLogEntry): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(LOG_FILE, line, 'utf8');
  } catch (err) {
    // Never throw from the logger — the original error report should still
    // get a 200 response so the client doesn't keep retrying.
    console.error('[error-log] Could not append to log file:', err);
  }
}

/**
 * Read the last N entries (newest first).
 * Returns an empty array if the file doesn't exist or is empty.
 */
export async function readErrorLog(limit = 100): Promise<ErrorLogEntry[]> {
  try {
    const raw = await fs.readFile(LOG_FILE, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    // Take the last `limit` lines and reverse (newest first)
    const tail = lines.slice(-limit).reverse();
    const entries: ErrorLogEntry[] = [];
    for (const line of tail) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip malformed lines — don't fail the whole read
      }
    }
    return entries;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return [];
    console.error('[error-log] Could not read log file:', err);
    return [];
  }
}

/**
 * Clear the error log. Admin-only by route; this helper does no auth.
 */
export async function clearErrorLog(): Promise<void> {
  try {
    await fs.writeFile(LOG_FILE, '', 'utf8');
  } catch (err) {
    console.error('[error-log] Could not clear log file:', err);
  }
}
