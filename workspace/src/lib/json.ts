/**
 * Safe JSON parse helper.
 *
 * Why this exists:
 *  - `JSON.parse` throws on malformed input — a single bad row in the DB
 *    (from a partial write, manual edit, or encoding issue) would break
 *    an entire list endpoint.
 *  - Wrapping every `JSON.parse(... || '[]')` in try/catch inline is noisy.
 *
 * Usage:
 *   const imgs = safeJsonParse(folder.imagesJson, [] as string[]);
 *   const meta = safeJsonParse<Metadata>(raw, defaultMeta);
 */
export function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON parse for arrays — shorthand for `safeJsonParse(input, [])`.
 */
export function safeJsonParseArray<T>(input: string | null | undefined, fallback: T[] = []): T[] {
  return safeJsonParse<T[]>(input, fallback);
}
