/**
 * PLAINTEXT AUTH — TEST MODE ONLY
 *
 * ⚠️  This module is intentionally insecure. It stores user passwords as
 *     plaintext in the database and issues unsigned tokens. This is for local
 *     development / testing only — DO NOT DEPLOY THIS TO PRODUCTION.
 *
 * Why this exists:
 *   The developer needs to:
 *     - See every user's plaintext password in the admin credentials viewer
 *     - Log in without bcrypt hashing overhead
 *     - Inspect tokens manually for debugging
 *
 * Token format:
 *   base64(`${userId}|${email}|${role}`)
 *
 * No signature, no expiry, no secret needed. If you're reading this in a
 * production deploy, you've made a terrible mistake.
 */

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Sign a token — just base64-encode the payload. No HMAC, no secret.
 */
export async function signToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    // 365 day expiry (essentially never expires — test mode)
    exp: now + 60 * 60 * 24 * 365,
  };
  // Encode as "userId|email|role|iat|exp"
  const tokenStr = [fullPayload.userId, fullPayload.email, fullPayload.role, fullPayload.iat, fullPayload.exp].join('|');
  // base64 encode (browser-safe via btoa, Node via Buffer)
  if (typeof btoa !== 'undefined') return btoa(tokenStr);
  return Buffer.from(tokenStr, 'utf-8').toString('base64');
}

/**
 * Verify a token — just base64-decode and parse. No signature check.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const tokenStr = (typeof atob !== 'undefined')
      ? atob(token)
      : Buffer.from(token, 'base64').toString('utf-8');
    const parts = tokenStr.split('|');
    if (parts.length < 3) return null;
    const [userId, email, role, iatStr, expStr] = parts;
    if (!userId || !email || !role) return null;
    const iat = iatStr ? Number(iatStr) : 0;
    const exp = expStr ? Number(expStr) : 0;
    // Skip expiry check in test mode (tokens are long-lived)
    return { userId, email, role, iat, exp };
  } catch {
    return null;
  }
}

/**
 * Helper used by API routes to extract user from request.
 * Reads `Authorization: Bearer <token>` header.
 */
export async function getUserFromRequest(request: Request): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload) return null;
    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
