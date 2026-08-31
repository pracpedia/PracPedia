import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';
import { geminiVision } from '@/lib/gemini-byok';

/**
 * AI vision: analyze a notebook page image and answer follow-up questions.
 *
 * Request body: { imageUrl: string, question?: string, language: 'en' | 'bn_book' }
 * - Without `question`: returns an initial overview of the page.
 * - With `question`: returns a contextual answer.
 *
 * Response: { analysis: string, aiCredits: number }
 *
 * Each call decrements the user's aiCredits by 1 (down to a floor of 0).
 * Platform owners bypass the credit deduction.
 *
 * BYOK: requires the user's own Gemini API key via the `x-gemini-api-key`
 * header. Credit deduction happens AFTER the BYOK check so a missing key
 * doesn't burn a credit. The decrement is atomic via Prisma's conditional
 * update — concurrent requests can't both see the same credit balance.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // BYOK gate — Gemini API key required. Checked BEFORE credit deduction
    // so a missing key doesn't burn a credit.
    const userApiKey = request.headers.get('x-gemini-api-key');
    if (!userApiKey || !userApiKey.trim()) {
      return NextResponse.json(
        { error: 'Gemini API key required. Open "Gemini Key" in your profile sidebar and connect your free Google Gemini API key to use AI features.', needsGeminiKey: true },
        { status: 403 }
      );
    }

    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { imageUrl, question, language } = body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl is required.' }, { status: 400 });
    }

    // ── Credit accounting (platform owners bypass) ─────────────────────────
    // Atomic conditional decrement — concurrent requests can't both succeed at
    // decrementing past zero. If the row's `aiCredits` is already 0 the update
    // returns count=0 and we reject.
    let aiCredits = u.aiCredits;
    const bypassCredits = isPlatformOwner(u.email);
    if (!bypassCredits) {
      if (u.aiCredits <= 0) {
        return NextResponse.json(
          { error: 'Out of AI credits. Use the "Recharge trial credits" button to top up.', outOfCredits: true },
          { status: 402 }
        );
      }
      const updated = await db.user.updateMany({
        where: { id: u.id, aiCredits: { gt: 0 } },
        data: { aiCredits: { decrement: 1 } },
      });
      if (updated.count === 0) {
        return NextResponse.json(
          { error: 'Out of AI credits. Use the "Recharge trial credits" button to top up.', outOfCredits: true },
          { status: 402 }
        );
      }
      aiCredits = Math.max(0, u.aiCredits - 1);
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
      return NextResponse.json({ analysis, aiCredits });
    } catch (aiErr: any) {
      console.warn('AI vision (analyze-page) failed:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.', aiCredits: u.aiCredits },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('POST /api/scan/analyze-page error:', err);
    return NextResponse.json({ error: 'Page analysis failed.' }, { status: 500 });
  }
}
