import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/gemini/verify
 *
 * Verifies a Gemini API key by calling the Gemini API **from the server**
 * (not from the browser). This bypasses "User location is not supported"
 * errors because the request originates from the server's location (e.g.,
 * Vercel US/EU data center), not the user's browser location.
 *
 * Body: { apiKey: string }
 * Returns: { valid: boolean, model?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ valid: false, error: 'API key is required.' }, { status: 400 });
    }

    const cleanKey = apiKey.trim();

    // Try multiple models in order — only models that currently exist.
    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': cleanKey,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 5 },
            }),
          }
        );

        if (res.ok) {
          // Key works with this model
          return NextResponse.json({ valid: true, model });
        }

        const data = await res.json().catch(() => ({}));
        const errMsg = data?.error?.message || '';

        // If 403 (invalid key), no point trying other models
        if (res.status === 403) {
          return NextResponse.json({
            valid: false,
            error: `Invalid API key: ${errMsg}`,
          }, { status: 401 });
        }

        // If "location not supported" — the key is valid but the server
        // location is blocked. This will work on Vercel deployment.
        if (errMsg.includes('User location is not supported')) {
          return NextResponse.json({
            valid: false,
            error: 'Your API key is valid, but the server location is blocked by Google. This will work when deployed to Vercel. You can save the key now and it will work in production.',
            locationBlocked: true,
          }, { status: 200 });
        }

        // 404 (model not found) — try next model
        // Other errors — try next model
      } catch {
        // Network error — try next model
      }
    }

    // All models failed — but not due to invalid key or location block
    return NextResponse.json({
      valid: false,
      error: 'Key verification failed. The key may be invalid or no models are available.',
    }, { status: 401 });
  } catch (err: any) {
    console.error('POST /api/gemini/verify error:', err);
    return NextResponse.json({
      valid: false,
      error: 'Verification failed. Please check your API key.',
    }, { status: 500 });
  }
}
