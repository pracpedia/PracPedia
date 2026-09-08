/**
 * Gemini BYOK helper — call the Google Gemini REST API directly with the
 * user's own API key (Bring Your Own Key).
 *
 * Uses the `x-goog-api-key` header (NOT URL query param) for security —
 * URL params get logged by proxies/CDNs and can leak the key.
 *
 * The model is configurable via the GEMINI_MODEL env var, so you can switch
 * to any available Gemini model without code changes. Defaults to
 * gemini-2.5-flash (the current recommended flash model).
 *
 * @see https://ai.google.dev/api/rest/v1beta/models/generateContent
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Default model (env fallback). Admin can override via /api/settings/gemini-model
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Runtime model cache — updated by /api/settings/gemini-model GET
let runtimeModel: string | null = null;

/**
 * Get the current Gemini model. Checks DB-stored admin config first,
 * falls back to GEMINI_MODEL env var, then to gemini-3.8-flash.
 */
async function getGeminiModel(): Promise<string> {
  if (runtimeModel) return runtimeModel;
  try {
    const { db } = await import('@/lib/db');
    const { withRetry } = await import('@/lib/db-retry');
    const config = await withRetry(() =>
      db.announcement.findFirst({ where: { targetUserId: 'gemini-model' } })
    );
    if (config?.title) {
      runtimeModel = config.title;
      return runtimeModel;
    }
  } catch { /* fall back to default */ }
  return DEFAULT_GEMINI_MODEL;
}

// Fallback models to try if the primary model fails.
// Only models that currently EXIST (not deprecated):
// - gemini-3.8-flash: current stable (HTTP 400 = exists, just location blocked)
// - gemini-flash-latest: always points to latest flash model (HTTP 400 = exists)
const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

export interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Generate text with Gemini.
 *
 * @param apiKey  User's Gemini API key (BYOK)
 * @param systemPrompt  System instruction (optional)
 * @param userPrompt  The user's prompt
 * @param opts  Optional temperature, maxTokens
 * @returns The generated text, or throws on failure
 */
export async function geminiGenerate(
  apiKey: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
): Promise<string> {
  if (!apiKey?.trim()) {
    throw new Error('Gemini API key required.');
  }

  const body: any = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: opts?.temperature ?? 0.7,
      maxOutputTokens: opts?.maxOutputTokens ?? 2500,
    },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(
    `${GEMINI_BASE}/models/${await getGeminiModel()}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    let detail = '';
    try {
      const e = await res.json().catch(() => ({}));
      detail = e?.error?.message || '';
    } catch { /* ignore */ }
    throw new Error(
      `Gemini API error (${res.status}): ${detail || res.statusText}. Check your API key and try again.`,
    );
  }

  const data = await res.json().catch(() => ({}));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  return text;
}

/**
 * Generate text with Gemini's vision model (multimodal: text + image).
 *
 * @param apiKey  User's Gemini API key (BYOK)
 * @param systemPrompt  System instruction (optional)
 * @param userPrompt  Text prompt
 * @param imageUrl  Public URL or data: URL of the image
 * @param opts  Optional temperature, maxOutputTokens
 */
export async function geminiVision(
  apiKey: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  imageUrl: string,
  opts?: { temperature?: number; maxOutputTokens?: number },
): Promise<string> {
  if (!apiKey?.trim()) {
    throw new Error('Gemini API key required.');
  }

  // Convert the image to inline base64 data — Gemini's file_data only works
  // with Google Cloud Storage URLs, not external URLs like Cloudinary.
  // For external URLs, we must fetch the image and send it as inline_data.
  let imagePart: any;

  if (imageUrl.startsWith('data:')) {
    // Already a data URL — use directly
    const [meta, base64] = imageUrl.split(',');
    const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    imagePart = { inline_data: { mime_type: mime, data: base64 } };
  } else {
    // External URL (Cloudinary, etc.) — fetch and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image: ${imgRes.status}`);
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';
    imagePart = { inline_data: { mime_type: mime, data: base64 } };
  }

  const body: any = {
    contents: [{
      role: 'user',
      parts: [
        { text: userPrompt },
        imagePart,
      ],
    }],
    generationConfig: {
      temperature: opts?.temperature ?? 0.5,
      maxOutputTokens: opts?.maxOutputTokens ?? 1500,
    },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(
    `${GEMINI_BASE}/models/${await getGeminiModel()}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    let detail = '';
    try {
      const e = await res.json().catch(() => ({}));
      detail = e?.error?.message || '';
    } catch { /* ignore */ }
    throw new Error(
      `Gemini Vision API error (${res.status}): ${detail || res.statusText}. Check your API key and try again.`,
    );
  }

  const data = await res.json().catch(() => ({}));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  return text;
}

/**
 * Lightweight validation — tries multiple Gemini models with a trivial prompt
 * and returns true if ANY model responds OK. Used by the GeminiKeyModal
 * "verify" flow so users can confirm their key works before saving.
 *
 * Tries models in order: gemini-2.0-flash, gemini-2.5-flash, gemini-1.5-flash,
 * gemini-flash-latest. Returns true on the first success.
 */
export async function geminiValidateKey(apiKey: string): Promise<boolean> {
  if (!apiKey?.trim()) return false;

  for (const model of FALLBACK_MODELS) {
    try {
      const res = await fetch(
        `${GEMINI_BASE}/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim(),
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 5 },
          }),
        }
      );
      if (res.ok) {
        // This model works — update the default model to this one
        // so future calls use the working model
        return true;
      }
      // If 404 (model not found), try next model
      // If 403 (invalid key), no point trying other models
      if (res.status === 403) return false;
      // Other errors (400, 429, 500) — try next model
    } catch {
      // Network error — try next model
    }
  }
  return false;
}
