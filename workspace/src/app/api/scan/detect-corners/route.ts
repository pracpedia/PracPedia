import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

/**
 * AI vision: detect the 4 corners of a notebook page in a base64 image.
 *
 * Request body: { imageBase64: string }
 * Response: { corners: { topLeft: [x,y], topRight: [x,y], bottomRight: [x,y], bottomLeft: [x,y] } }
 *
 * Coordinates are returned as fractions 0..1 so the client can map them onto
 * the displayed image at any size.
 *
 * If the AI SDK or API key is unavailable, returns 200 with a default
 * centered rectangle so the client can still proceed (it already has a manual
 * drag-corner fallback UI in UploadModal).
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64 } = body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required.' }, { status: 400 });
    }

    // Use the data URL directly — the z-AI vision API accepts data: URLs.
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const sysPrompt = `You are a precise document scanner. Inspect the image and return the 4 corners of the notebook page (or the dominant rectangular document). Reply ONLY with a JSON object — no markdown, no prose — in this exact shape:
{"topLeft":[x,y],"topRight":[x,y],"bottomRight":[x,y],"bottomLeft":[x,y]}
Coordinates must be fractions in 0..1 (x = horizontal from left, y = vertical from top).`;

    let corners: any = {
      topLeft: [0.10, 0.10],
      topRight: [0.90, 0.10],
      bottomRight: [0.90, 0.90],
      bottomLeft: [0.10, 0.90],
    };

    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      const userApiKey = request.headers.get('x-gemini-api-key');
      if (userApiKey) process.env.GEMINI_API_KEY = userApiKey;
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: sysPrompt },
              { type: 'file_url', file_url: { url: dataUrl } },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      });
      const raw = completion.choices?.[0]?.message?.content || '';
      // Extract the JSON object from the model's reply (it may be wrapped in
      // code fences or surrounded by stray prose).
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Validate shape — every corner must be a [x,y] pair of numbers in 0..1.
        const keys = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const;
        if (keys.every((k) => Array.isArray(parsed[k]) && parsed[k].length === 2 && parsed[k].every((n: any) => typeof n === 'number' && n >= 0 && n <= 1))) {
          corners = { topLeft: parsed.topLeft, topRight: parsed.topRight, bottomRight: parsed.bottomRight, bottomLeft: parsed.bottomLeft };
        }
      }
    } catch (aiErr: any) {
      console.warn('AI vision (detect-corners) failed, returning default corners:', aiErr?.message);
      // Fall through with default corners — client UI lets user drag manually.
    }

    return NextResponse.json({ corners });
  } catch (err: any) {
    console.error('POST /api/scan/detect-corners error:', err);
    return NextResponse.json({ error: 'Corner detection failed.' }, { status: 500 });
  }
}
