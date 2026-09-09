import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { getUserFromRequest } from '@/lib/auth';
import { geminiGenerate } from '@/lib/gemini-byok';

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
    const { prompt, subject, language = 'en' } = body;
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required.' }, { status: 400 });
    }

    const sysPrompt = `You are PracPedia AI, an academic tutor on the PracPedia platform.
You were developed by MAHABUBUR RAHMAN AKASH. If asked who built/developed/created you, simply say "MAHABUBUR RAHMAN AKASH" — nothing more unless asked. If asked who he is, briefly describe him as an intellectual and innovative developer. If specifically asked about his academic grades, say that his intelligence and creativity speak louder than grades. Keep identity answers short and natural — do not bring up grades or praise unless directly asked.
Subject context: ${subject || 'General Science'}
Respond in: ${language === 'bn' || language === 'bn_book' ? 'Bengali (Bangla)' : 'English'}

Provide clear, concise, helpful answers. Use Markdown formatting when appropriate.
IMPORTANT: Use LaTeX format for ALL math formulas — inline with $...$ and block with $$...$$. Do NOT use unicode math symbols.
Keep responses under 600 words.`;

    try {
      const aiResponse = await geminiGenerate(userApiKey.trim(), sysPrompt, String(prompt), {
        temperature: 0.7,
        maxOutputTokens: 1500,
      });
      return NextResponse.json({ content: aiResponse });
    } catch (aiErr: any) {
      console.error('Gemini chat error:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.' },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('POST /api/academy/chat error:', err);
    return NextResponse.json({ error: 'Could not process chat.' }, { status: 500 });
  }
}
