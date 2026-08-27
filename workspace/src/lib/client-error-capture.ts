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

  // 1. Synchronous runtime errors
  window.addEventListener('error', (event) => {
    // Skip cross-origin script errors — they only give "Script error." with no
    // stack, so reporting them is noise.
    if (event.message === 'Script error.' && !event.filename) return;
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
    reportError({
      type: 'unhandledrejection',
      message: message || '(unhandled rejection)',
      stack,
    });
  });

  // 3. Capture React/Next.js errors that go through console.error
  //    (only those with stack traces — to avoid spamming on every console.log)
  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const first = args[0];
      const msg = typeof first === 'string' ? first :
        first instanceof Error ? first.message :
        (() => { try { return JSON.stringify(first); } catch { return String(first); } })();
      // Filter noise: don't report React DevTools warnings, prop-type warnings
      // without a stack, or warnings that already include "[Error]" prefix
      if (
        msg &&
        !msg.includes('Download the React DevTools') &&
        !msg.includes('Warning: ') &&
        (msg.includes('Error') || msg.includes('error') || args.some(a => a instanceof Error))
      ) {
        const stack = args.find((a) => a instanceof Error)?.stack || '';
        reportError({
          type: 'console_error',
          message: msg.slice(0, 2000),
          stack,
        });
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
