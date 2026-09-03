/**
 * Safely parse a JSON response body, returning a fallback on failure.
 *
 * Why this exists:
 *  - `await res.json()` throws `SyntaxError: Unexpected token '<'` when
 *    the response body is HTML (Next.js 404/500 page, gateway timeout, etc.)
 *    rather than JSON. This is common in production behind proxies/CDNs.
 *  - The thrown SyntaxError gets caught by the outer try/catch and reported
 *    as a generic "Network error", masking the actual HTTP status.
 *
 * Usage:
 *   const data = await safeResJson(res);
 *   if (!res.ok) { throw new Error(data?.error || 'Request failed'); }
 */
export async function safeResJson<T = any>(res: Response): Promise<T | Record<string, never>> {
  try {
    return await res.json() as T;
  } catch {
    return {};
  }
}
