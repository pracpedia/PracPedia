/**
 * Lightweight in-memory rate limiter.
 *
 * Uses a sliding-window counter per identifier (IP or email). No external
 * dependencies — works on a single server instance. For multi-instance
 * deployments (Vercel, Kubernetes, etc.), replace with `@upstash/ratelimit`
 * backed by Upstash Redis.
 *
 * Trade-offs:
 *  - Pro: zero dependencies, instant setup
 *  - Pro: no network calls
 *  - Con: state is per-process — N server instances = N× the limit
 *  - Con: resets on server restart
 *
 * Usage:
 *   const limiter = new RateLimiter({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } });
 */

interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed within the window. */
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;        // epoch ms
  retryAfterSec: number;  // seconds until next request is allowed
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private windowMs: number;
  private max: number;

  constructor(opts: RateLimitOptions) {
    this.windowMs = opts.windowMs;
    this.max = opts.max;
  }

  /**
   * Check whether the identifier is allowed to make a request.
   * Side effect: increments the counter if allowed.
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(identifier);

    // No bucket or expired → start fresh
    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + this.windowMs;
      this.buckets.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.max - 1,
        resetAt,
        retryAfterSec: 0,
      };
    }

    // Bucket active
    if (bucket.count >= this.max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
        retryAfterSec,
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      remaining: this.max - bucket.count,
      resetAt: bucket.resetAt,
      retryAfterSec: 0,
    };
  }

  /** Reset a specific identifier's bucket (e.g. after successful login). */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  /** Force-clean expired buckets — call periodically to prevent memory leak. */
  sweep(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-configured limiters for common use cases
// ─────────────────────────────────────────────────────────────────────────────

/** 5 login attempts per minute per IP — blocks brute force. */
export const loginLimiter = new RateLimiter({ windowMs: 60_000, max: 5 });

/** 3 registration attempts per 10 minutes per IP — blocks account spam. */
export const registerLimiter = new RateLimiter({ windowMs: 10 * 60_000, max: 3 });

/** 10 AI requests per minute per user — prevents abuse. */
export const aiLimiter = new RateLimiter({ windowMs: 60_000, max: 10 });

/** 30 chat messages per minute per user. */
export const chatLimiter = new RateLimiter({ windowMs: 60_000, max: 30 });

/** 20 client error reports per minute per IP — generous so a broken page can
 * fan-out multiple errors (window.onerror + unhandledrejection + React error
 * boundary) without being throttled, but blocks deliberate flooding. */
export const errorLogLimiter = new RateLimiter({ windowMs: 60_000, max: 20 });

// Periodic cleanup every 5 minutes to free memory
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    loginLimiter.sweep();
    registerLimiter.sweep();
    aiLimiter.sweep();
    chatLimiter.sweep();
    errorLogLimiter.sweep();
  }, 5 * 60_000).unref?.();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extract client IP from a Next.js request
// ─────────────────────────────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  // Walk common proxy headers in order of trust
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return 'unknown';
}

/**
 * Build standard rate-limit response headers.
 * Useful for clients to display "retry in X seconds" UI.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.allowed ? result.remaining + 1 : 0),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
    ...(result.retryAfterSec > 0 ? { 'Retry-After': String(result.retryAfterSec) } : {}),
  };
}
