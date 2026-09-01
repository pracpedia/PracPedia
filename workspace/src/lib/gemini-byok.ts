/**
 * Gemini BYOK helper — call the Google Gemini REST API directly with the
 * user's own API key (Bring Your Own Key).
 *
 * Why not use the z-ai-web-dev-sdk?
 *   The SDK reads its key from a `.z-ai-config` JSON file (cwd, homedir, or
 *   /etc/.z-ai-config). It does NOT read `process.env.GEMINI_API_KEY`, so
 *   mutating that env var per-request (the previous BYOK approach) had two
 *   critical bugs:
 *     1. The SDK ignored the mutated env var entirely.
 *     2. Even if it had read it, concurrent requests from different users
 *        would have leaked each other's keys (process.env is global state).
 *
 *   This helper bypasses the SDK entirely and calls the public Gemini REST
 *   endpoints with the user's key as the `x-goog-api-key` header. Per-request,
 *   no global state, no race condition.
 *
 * @see https://ai.google.dev/api/rest/v1beta/models/generateContent
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Generate text with Gemini Pro.
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
    `${GEMINI_BASE}/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    let detail = '';
    try {
      const e = await res.json();
      detail = e?.error?.message || '';
    } catch (_) { /* ignore */ }
    throw new Error(
      `Gemini API error (${res.status}): ${detail || res.statusText}. Check your API key and try again.`,
    );
  }

  const data = await res.json();
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

  const body: any = {
    contents: [{
      role: 'user',
      parts: [
        { text: userPrompt },
        { file_data: { mime_type: 'image/jpeg', file_uri: imageUrl } },
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
    `${GEMINI_BASE}/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    let detail = '';
    try {
      const e = await res.json();
      detail = e?.error?.message || '';
    } catch (_) { /* ignore */ }
    throw new Error(
      `Gemini Vision API error (${res.status}): ${detail || res.statusText}. Check your API key and try again.`,
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  return text;
}

/**
 * Lightweight validation — calls Gemini with a trivial prompt and returns
 * true only if the API responds OK. Used by the GeminiKeyModal "verify"
 * flow so users can confirm their key works before saving.
 */
export async function geminiValidateKey(apiKey: string): Promise<boolean> {
  if (!apiKey?.trim()) return false;
  try {
    const text = await geminiGenerate(
      apiKey.trim(),
      'You are a health-check bot. Reply with the single word: OK.',
      'ping',
      { temperature: 0, maxOutputTokens: 5 },
    );
    return !!text && text.length > 0;
  } catch (_) {
    return false;
  }
}
