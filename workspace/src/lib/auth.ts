// JWT-style token helpers using HMAC-SHA256 via Web Crypto API
// Used by API routes to issue and verify session tokens (no external deps)

/**
 * Resolve the JWT signing secret.
 *
 * In production we refuse to fall back to a default secret — if `JWT_SECRET`
 * is missing or too short, we throw on first use. This prevents the classic
 * "deployed without env vars → silently uses public default → tokens forgeable"
 * footgun.
 *
 * In development a default is allowed so `bun run dev` works out of the box.
 */
const DEV_DEFAULT_SECRET = 'pracpedia_default_dev_secret_DO_NOT_USE_IN_PROD_2026';

function resolveSecret(): string {
  const envSecret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (!envSecret) {
    if (isProd) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is not set. ' +
        'Generate one with `openssl rand -hex 32` and set it in your environment.'
      );
    }
    return DEV_DEFAULT_SECRET;
  }

  if (isProd && envSecret.length < 32) {
    throw new Error(
      `FATAL: JWT_SECRET must be at least 32 characters in production (current: ${envSecret.length}). ` +
      'Generate one with `openssl rand -hex 32`.'
    );
  }

  // Warn (don't throw) if the dev default leaked into prod env
  if (isProd && envSecret === DEV_DEFAULT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is the public dev default. Change it before deploying.');
  }

  return envSecret;
}

// Lazily-resolved secret so the throw only happens on first token operation,
// not at module load time (which would crash the build).
let _secretCache: string | null = null;
function getSecret(): string {
  if (_secretCache === null) _secretCache = resolveSecret();
  return _secretCache;
}

// Base64URL encode/decode helpers
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToString(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return b64;
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export async function signToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    // 30 day expiry
    exp: now + 60 * 60 * 24 * 30,
  };

  const enc = new TextEncoder();
  const headerB64 = bytesToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(enc.encode(JSON.stringify(fullPayload)));
  const data = `${headerB64}.${payloadB64}`;

  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data) as BufferSource);
  const sigB64 = bytesToBase64Url(new Uint8Array(sig));

  return `${data}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const key = await getKey();
    const enc = new TextEncoder();

    const sigBytes = base64ToBytes(base64UrlToString(sigB64));
    // Cast to BufferSource — TypeScript 5.7+ tightens Uint8Array's buffer to
    // ArrayBufferLike which includes SharedArrayBuffer, but Web Crypto's verify()
    // only accepts ArrayBuffer. The runtime value is always an ArrayBuffer here
    // (we construct it via `new Uint8Array(binary.length)` in base64ToBytes).
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, enc.encode(data) as BufferSource);
    if (!valid) return null;

    const payloadStr = new TextDecoder().decode(base64ToBytes(base64UrlToString(payloadB64)));
    const payload = JSON.parse(payloadStr) as TokenPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// Helper used by API routes to extract user from request
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
