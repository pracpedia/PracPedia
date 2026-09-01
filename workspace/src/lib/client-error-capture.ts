'use client';

/**
 * Client-side error capture.
 *
 * Wires up three listeners on mount:
 *   1. `window.onerror`           — synchronous runtime errors (undefined vars, etc.)
 *   2. `window.addEventListener('unhandledrejection', …)` — promise rejections that no
 *      `.catch()` handled (very common cause of "silent" UI bugs).
 *   3. `console.error` monkey-patch — catches Next.js / React dev warnings and errors
 *      that don't always trigger window.onerror. (Optional, opt-in.)
 *
 * Reports to /api/error-log with a small payload. Debounced per (message+stack)
 * hash so a tight error loop doesn't flood the server.
 *
 * Usage:
 *   import { installErrorCapture } from '@/lib/client-error-capture';
 *   installErrorCapture();  // call once, early in the app (in a top-level layout)
 */

const REPORT_URL = '/api/error-log';
const DEDUP_WINDOW_MS = 5_000;  // skip same-error re-reports within 5s
const RECENT = new Map<string, number>();

function hash(s: string): string {
  // Lightweight 32-bit hash — fast, no deps. We only need to dedup identical
  // error reports within a session; cryptographic strength isn't required.
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function shouldReport(key: string): boolean {
  const now = Date.now();
  const last = RECENT.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  RECENT.set(key, now);
  // Periodic cleanup so RECENT doesn't grow unbounded
  if (RECENT.size > 200) {
    for (const [k, t] of RECENT) {
      if (now - t > DEDUP_WINDOW_MS * 2) RECENT.delete(k);
    }
  }
  return true;
}

interface ReportPayload {
  type: 'window_error' | 'unhandledrejection' | 'react_error' | 'fetch_error' | 'console_error';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  userAgent?: string;
  extra?: Record<string, any>;
}

/**
 * Send an error report to the server. Best-effort — never throws.
 * Uses `navigator.sendBeacon` if available (pagehide-safe); falls back to fetch.
 */
export function reportError(payload: ReportPayload): void {
  try {
    if (typeof window === 'undefined') return;
    // Enrich with browser context
    const enriched: ReportPayload = {
      ...payload,
      url: payload.url || window.location.href,
      userAgent: payload.userAgent || navigator.userAgent,
    };
    const key = hash(`${enriched.type}|${enriched.message}|${enriched.stack || ''}`);
    if (!shouldReport(key)) return;

    const body = JSON.stringify(enriched);
    // sendBeacon is fire-and-forget — perfect for errors that happen during
    // page unload. It's limited to 64KB but our payloads are tiny.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      // sendBeacon returns false if the queue is full — fall back to fetch.
      if (navigator.sendBeacon(REPORT_URL, blob)) return;
    }
    // Fallback: fetch with keepalive (also works after pagehide)
    fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Last-resort: do nothing — error reporting is best-effort.
    });
  } catch {
    // Never let the error reporter itself throw
  }
}

/**
 * Install the global error listeners. Call once, early in the app.
 * Safe to call multiple times — only the first call wires listeners.
 */
let installed = false;
export function installErrorCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // 0. CHUNK-LOAD-ERROR AUTO-RELOAD
  // ─────────────────────────────────────────────────────────────────────────
  // When the dev server restarts (e.g. after a session wipe), the OLD JS
  // chunks (with their old hashes) are no longer on disk. The browser —
  // which still has the OLD HTML cached from a previous visit — tries to
  // load chunks by their old hashes, gets a 404/error, and the resulting
  // ChunkLoadError prevents React from ever hydrating. The user sees a
  // frozen loading screen forever.
  //
  // Fix: detect ChunkLoadError on the page and AUTO-RELOAD ONCE with cache
  // busting. The reload fetches fresh HTML which references the NEW chunk
  // hashes — they exist on disk, so React hydrates normally.
  //
  // IMPORTANT: Only active in development (NODE_ENV !== 'production').
  // In production with `next start`, chunks are served from .next/static/
  // and never go missing — so the auto-reload should NEVER fire. Keeping
  // it active in production caused false-positive reloads on slow network
  // responses that matched the regex patterns.
  let chunkReloaded = false;
  const handleChunkError = (msg: string): boolean => {
    if (chunkReloaded) return false;
    // Only fire in development — production chunks don't go missing.
    if (process.env.NODE_ENV === 'production') return false;
    // Match both "ChunkLoadError" (the actual class name) and the common
    // substrings it appears with in different bundlers/versions.
    const isChunkError =
      /ChunkLoadError/i.test(msg) ||
      /Failed to load chunk/i.test(msg) ||
      /Loading chunk .+ failed/i.test(msg) ||
      /Loading CSS chunk .+ failed/i.test(msg);
    if (!isChunkError) return false;
    chunkReloaded = true;
    // Append a cache-bust query so the reload doesn't reuse the stale HTML
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('__chunk_retry', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
    return true;
  };
  // ChunkLoadError usually surfaces as an unhandled promise rejection
  // (dynamic import()) but can also throw synchronously during HMR.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error ? `${reason.name}: ${reason.message}` :
      typeof reason === 'string' ? reason :
      (() => { try { return JSON.stringify(reason); } catch { return String(reason); } })();
    if (handleChunkError(msg)) {
      // Prevent the rejection from also being reported as a regular error
      event.preventDefault();
    }
  });
  // Also catch synchronous script-load failures (e.g., a <script src="..."> 404)
  window.addEventListener('error', (event) => {
    // The `event.error` may be null for cross-origin script failures, but the
    // `event.message` is usually "Failed to load a dynamic import" or similar.
    const candidate = `${event.message || ''} ${event.error?.name || ''} ${event.error?.message || ''}`;
    if (handleChunkError(candidate)) {
      event.preventDefault();
    }
  }, true); // capture phase so we see script-load errors before the page

  // 1. Synchronous runtime errors
  window.addEventListener('error', (event) => {
    // Skip cross-origin script errors — they only give "Script error." with no
    // stack, so reporting them is noise.
    if (event.message === 'Script error.' && !event.filename) return;
    // Skip ChunkLoadError — already handled above with auto-reload
    if (event.error?.name === 'ChunkLoadError' || /ChunkLoadError|Failed to load chunk/i.test(event.message || '')) return;
    reportError({
      type: 'window_error',
      message: event.message || '(no message)',
      filename: event.filename || '',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      stack: event.error?.stack || '',
    });
  });

  // 2. Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message :
      typeof reason === 'string' ? reason :
      (() => { try { return JSON.stringify(reason); } catch { return String(reason); } })();
    const stack = reason instanceof Error ? reason.stack || '' : '';
    // Skip ChunkLoadError — already handled above with auto-reload
    if (reason?.name === 'ChunkLoadError' || /ChunkLoadError|Failed to load chunk/i.test(message || '')) return;
    reportError({
      type: 'unhandledrejection',
      message: message || '(unhandled rejection)',
      stack,
    });
  });

  // 3. Capture React/Next.js errors that go through console.error.
  //    IMPORTANT: We only report when there is an actual Error instance in
  //    the args (i.e. something was thrown, not just a dev-mode string log).
  //    This avoids double-reporting errors that already go through
  //    window.onerror, and avoids logging the dozens of Next.js dev-mode
  //    hydration/Fast-Refresh "errors" that are actually warnings.
  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      // Only react to actual thrown errors, not dev-mode text logs
      const errArg = args.find((a) => a instanceof Error);
      if (errArg && errArg.stack) {
        const msg = errArg.message || String(errArg);
        // Skip React DevTools / hydration / Fast Refresh noise
        if (
          !msg.includes('Download the React DevTools') &&
          !msg.includes('Hydration') &&
          !msg.includes('Fast Refresh') &&
          !msg.includes('Warning: ')
        ) {
          reportError({
            type: 'console_error',
            message: msg.slice(0, 2000),
            stack: errArg.stack,
          });
        }
      }
    } catch {
      // ignore — never break console.error
    }
    return origConsoleError.apply(console, args as any);
  };
}

/**
 * Wrap a fetch promise to auto-report rejections as fetch_error.
 * Usage: `const res = await reportFetchErrors(fetch(url, opts), url);`
 */
export function reportFetchErrors<T extends Promise<Response>>(p: T, url: string): T {
  p.catch((err) => {
    reportError({
      type: 'fetch_error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack || '' : '',
      extra: { requestUrl: url.slice(0, 500) },
    });
  });
  return p;
}
