import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';

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
 */
const DEFAULT_AI_CREDITS = Number(process.env.AI_CREDITS_DEFAULT || '25');

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    let aiCredits = u.aiCredits;
    const bypassCredits = isPlatformOwner(u.email);
    if (!bypassCredits) {
      if (u.aiCredits <= 0) {
        return NextResponse.json(
          { error: 'Out of AI credits. Use the "Recharge trial credits" button to top up.', outOfCredits: true },
          { status: 402 }
        );
      }
      aiCredits = Math.max(0, u.aiCredits - 1);
      await db.user.update({ where: { id: u.id }, data: { aiCredits } });
    }

    const isBn = language === 'bn_book';
    const langName = isBn ? 'Bengali (Bangla)' : 'English';

    const sysPrompt = `You are an expert academic tutor for the PracPedia HSC Science practical notebook platform.
You are looking at a scanned notebook page. ${question ? 'Answer the student question clearly and concisely.' : 'Provide a clear, structured overview of what is on this page — theory, formulas, observations, diagrams.'}
Respond in ${langName}.
Use Markdown formatting. Keep the response under 500 words.
If the image is unclear or not a notebook page, say so politely and suggest a clearer scan.`;

    const userContent: any[] = [
      { type: 'text', text: question || 'Analyze this notebook page and give me a structured overview.' },
      { type: 'file_url', file_url: { url: imageUrl } },
    ];

    let analysis: string;
    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      const userApiKey = request.headers.get('x-gemini-api-key');
      if (userApiKey) process.env.GEMINI_API_KEY = userApiKey;
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.createVision({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userContent },
        ],
        thinking: { type: 'disabled' },
      });
      analysis = completion.choices?.[0]?.message?.content || '';
    } catch (aiErr: any) {
      console.warn('AI vision (analyze-page) failed, returning fallback:', aiErr?.message);
      analysis = isBn
        ? `> ⚠️ **AI সার্ভিস সাময়িকভাবে অনুপলব্ধ।**\n\nআমি আপনার নোটবুকের পৃষ্ঠাটি গ্রহণ করেছি কিন্তু এই মুহূর্তে বিশ্লেষণ করতে পারছি না। কিছুক্ষণ পর আবার চেষ্টা করুন।`
        : `> ⚠️ **AI service temporarily unavailable.**\n\nI received your notebook page but cannot analyze it right now. Please try again in a moment.`;
    }

    if (!analysis) {
      analysis = isBn
        ? `> ⚠️ AI থেকে খালি উত্তর এসেছে। আবার চেষ্টা করুন।`
        : `> ⚠️ Empty AI response received. Please try again.`;
    }

    return NextResponse.json({ analysis, aiCredits });
  } catch (err: any) {
    console.error('POST /api/scan/analyze-page error:', err);
    return NextResponse.json({ error: 'Page analysis failed.' }, { status: 500 });
  }
}
