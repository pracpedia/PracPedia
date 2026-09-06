import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { getUserFromRequest } from '@/lib/auth';
import { geminiVision } from '@/lib/gemini-byok';

/**
 * AI vision: analyze a notebook page image and answer follow-up questions.
 *
 * Request body: { imageUrl: string, question?: string, language: 'en' | 'bn_book' }
 * - Without `question`: returns an initial overview of the page.
 * - With `question`: returns a contextual answer.
 *
 * Response: { analysis: string }
 *
 * No AI credits needed — the user brings their own Gemini API key (BYOK),
 * so the call goes directly to Google's API with the user's own quota.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // BYOK gate — Gemini API key required.
    const userApiKey = request.headers.get('x-gemini-api-key');
    if (!userApiKey || !userApiKey.trim()) {
      return NextResponse.json(
        { error: 'Gemini API key required. Open "Gemini Key" in your profile sidebar and connect your free Google Gemini API key to use AI features.', needsGeminiKey: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageUrl, question, language } = body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl is required.' }, { status: 400 });
    }

    const isBn = language === 'bn_book';
    const langName = isBn ? 'Bengali (Bangla)' : 'English';

    const sysPrompt = `You are an expert academic tutor for the PracPedia HSC Science practical notebook platform.
You are looking at a scanned notebook page. ${question ? 'Answer the student question clearly and concisely.' : 'Provide a clear, structured overview of what is on this page — theory, formulas, observations, diagrams.'}
Respond in ${langName}.
Use Markdown formatting. Keep the response under 500 words.
If the image is unclear or not a notebook page, say so politely and suggest a clearer scan.`;

    const userPrompt = question || 'Analyze this notebook page and give me a structured overview.';

    try {
      const analysis = await geminiVision(userApiKey.trim(), sysPrompt, userPrompt, imageUrl, {
        temperature: 0.5,
        maxOutputTokens: 1500,
      });
      return NextResponse.json({ analysis });
    } catch (aiErr: any) {
      console.warn('AI vision (analyze-page) failed:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.' },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('POST /api/scan/analyze-page error:', err);
    return NextResponse.json({ error: 'Page analysis failed.' }, { status: 500 });
  }
}
