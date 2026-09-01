import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity-log';
import { getClientIp, errorLogLimiter, rateLimitHeaders } from '@/lib/rate-limit';
import { appendErrorLog } from '@/lib/error-log';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Client-side error reporter.
 *
 * Receives unhandled errors, promise rejections, and React render errors from
 * the browser. Writes them to:
 *   1. /tmp/pracpedia-logs/errors.log  (JSON-lines file, persisted on disk)
 *   2. The ActivityLog table (visible in the admin dashboard feed)
 *
 * Public endpoint (no auth required) so we can capture errors that happen
 * before login. The body is rate-limited per IP to prevent log flooding.
 *
 * Body shape:
 *   {
 *     type: 'window_error' | 'unhandledrejection' | 'react_error' | 'fetch_error',
 *     message: string,
 *     stack?: string,
 *     filename?: string,
 *     lineno?: number,
 *     colno?: number,
 *     url?: string,         // page URL where the error happened
 *     userAgent?: string,
 *     extra?: object,       // any structured context the caller wants to attach
 *   }
 */

const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;
const MAX_URL = 500;
const MAX_USER_AGENT = 500;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 errors / minute / IP (generous — a single broken page
    // can emit many errors in quick succession)
    const ip = getClientIp(request);
    const rl = errorLogLimiter.check(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, reason: 'rate_limited' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Parse JSON body defensively — a malformed payload should NOT crash the
    // error-logger itself (otherwise we lose the original error).
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
    }

    const type = String(body?.type || 'unknown').slice(0, 50);
    const message = String(body?.message || '').slice(0, MAX_MESSAGE);
    const stack = String(body?.stack || '').slice(0, MAX_STACK);
    const filename = String(body?.filename || '').slice(0, 500);
    const lineno = Number(body?.lineno) || 0;
    const colno = Number(body?.colno) || 0;
    const url = String(body?.url || '').slice(0, MAX_URL);
    const userAgent = String(body?.userAgent || '').slice(0, MAX_USER_AGENT);
    let extra: Record<string, any> = {};
    if (body?.extra && typeof body.extra === 'object') {
      try {
        // Re-stringify to strip functions/symbols and cap the size
        const jsonStr = JSON.stringify(body.extra).slice(0, 4000);
        extra = JSON.parse(jsonStr);
      } catch {
        extra = { _raw: String(body.extra).slice(0, 500) };
      }
    }

    // Identify the user if they happen to be logged in (best-effort — most
    // pre-login errors won't have a token)
    const payload = await getUserFromRequest(request);

    const entry = {
      ts: new Date().toISOString(),
      type,
      message,
      stack,
      filename,
      lineno,
      colno,
      url,
      userAgent,
      ip: ip || null,
      userId: payload?.userId || null,
      userEmail: payload?.email || null,
      extra,
    };

    // 1. Persist to disk (JSON-lines)
    await appendErrorLog(entry);

    // 2. Also surface in the admin activity feed
    await logActivity({
      userId: payload?.userId,
      userName: payload?.email || 'Anonymous',
      userRole: 'user',
      action: 'client_error',
      category: 'system',
      detail: `[${type}] ${message.slice(0, 300) || '(no message)'}`,
      metadata: { url: url.slice(0, 200), filename: filename.slice(0, 100), lineno, extra },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Last-resort: never let the error-logger itself throw a 500 — that would
    // hide the original client error.
    console.error('[error-log] Internal failure:', err);
    return NextResponse.json({ ok: false, reason: 'internal' }, { status: 500 });
  }
}

/**
 * GET — admin-only viewer for the most recent error log entries.
 * Returns the last 100 entries (newest first).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const { readErrorLog } = await import('@/lib/error-log');
    const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') || '100'), 500);
    const entries = await readErrorLog(limit);
    return NextResponse.json({ entries, count: entries.length });
  } catch (err: any) {
    console.error('GET /api/error-log error:', err);
    return NextResponse.json({ error: 'Could not read error log.' }, { status: 500 });
  }
}

/**
 * DELETE — admin-only. Clears the error log file.
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const { clearErrorLog } = await import('@/lib/error-log');
    await clearErrorLog();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/error-log error:', err);
    return NextResponse.json({ error: 'Could not clear error log.' }, { status: 500 });
  }
}
