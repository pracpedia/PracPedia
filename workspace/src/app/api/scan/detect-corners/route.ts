import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { geminiVision } from '@/lib/gemini-byok';

/**
 * AI vision: detect the 4 corners of a notebook page in a base64 image.
 *
 * Request body: { imageBase64: string }
 * Response: { corners: { topLeft: [x,y], topRight: [x,y], bottomRight: [x,y], bottomLeft: [x,y] } }
 *
 * Coordinates are returned as fractions 0..1 so the client can map them onto
 * the displayed image at any size.
 *
 * Requires the user's Gemini API key via the `x-gemini-api-key` header (BYOK).
 * Without it we return 403 so the client can prompt the user to connect a key.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userApiKey = request.headers.get('x-gemini-api-key');
    if (!userApiKey || !userApiKey.trim()) {
      return NextResponse.json(
        { error: 'Gemini API key required. Open "Gemini Key" in your profile sidebar and connect your free Google Gemini API key to use AI features.', needsGeminiKey: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageBase64 } = body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required.' }, { status: 400 });
    }

    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const sysPrompt = `You are a precise document scanner. Inspect the image and return the 4 corners of the notebook page (or the dominant rectangular document). Reply ONLY with a JSON object — no markdown, no prose — in this exact shape:
{"topLeft":[x,y],"topRight":[x,y],"bottomRight":[x,y],"bottomLeft":[x,y]}
Coordinates must be fractions in 0..1 (x = horizontal from left, y = vertical from top).`;

    const userPrompt = 'Detect the 4 corners of the notebook page in this image and return them as the JSON object described.';

    let raw: string;
    try {
      raw = await geminiVision(userApiKey.trim(), sysPrompt, userPrompt, dataUrl, {
        temperature: 0.1,
        maxOutputTokens: 500,
      });
    } catch (aiErr: any) {
      console.warn('AI vision (detect-corners) failed:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.' },
        { status: 502 }
      );
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: 'Gemini did not return detectable corners. Please try a clearer photo or drag the corners manually.' },
        { status: 502 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(match[0]);
    } catch (_) {
      return NextResponse.json(
        { error: 'Gemini returned malformed corners. Please try again or drag the corners manually.' },
        { status: 502 }
      );
    }

    const keys = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const;
    if (!keys.every((k) => Array.isArray(parsed[k]) && parsed[k].length === 2 && parsed[k].every((n: any) => typeof n === 'number' && n >= 0 && n <= 1))) {
      return NextResponse.json(
        { error: 'Gemini returned malformed corners. Please try again or drag the corners manually.' },
        { status: 502 }
      );
    }

    const corners = {
      topLeft: parsed.topLeft,
      topRight: parsed.topRight,
      bottomRight: parsed.bottomRight,
      bottomLeft: parsed.bottomLeft,
    };
    return NextResponse.json({ corners });
  } catch (err: any) {
    console.error('POST /api/scan/detect-corners error:', err);
    return NextResponse.json({ error: 'Corner detection failed.' }, { status: 500 });
  }
}
