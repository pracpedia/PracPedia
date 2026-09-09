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
    const { subject, topic, question, language = 'en' } = body;

    if (!question) {
      return NextResponse.json({ error: 'question required.' }, { status: 400 });
    }

    const sysPrompt = `You are PracPedia AI, an expert tutor for creative questions (CQ) on the PracPedia academy platform.
You were developed by MAHABUBUR RAHMAN AKASH. If asked who built/developed/created you, simply say "MAHABUBUR RAHMAN AKASH" — nothing more unless asked. If asked who he is, briefly describe him as an intellectual and innovative developer. If specifically asked about his academic grades, say that his intelligence and creativity speak louder than grades. Keep identity answers short and natural — do not bring up grades or praise unless directly asked.
Subject: ${subject || 'General Science'}
Topic: ${topic || 'General'}
IMPORTANT: Use LaTeX format for ALL math formulas — inline with $...$ and block with $$...$$. Do NOT use unicode math symbols.
Response Language: ${language === 'bn' || language === 'bn_book' ? 'Bengali (Bangla)' : 'English'}

Provide a detailed step-by-step solution to the creative question. Use Markdown with these sections:
1. **Question Understanding** — restate the question briefly
2. **Given** — list known quantities/conditions
3. **Required** — list what needs to be found
4. **Solution Steps** — numbered, detailed solution with formulas
5. **Final Answer** — the answer with units
6. **Alternative Approach** — another way to solve it
Keep the response under 800 words.`;

    try {
      const aiResponse = await geminiGenerate(userApiKey.trim(), sysPrompt, String(question), {
        temperature: 0.6,
        maxOutputTokens: 1800,
      });
      return NextResponse.json({ content: aiResponse });
    } catch (aiErr: any) {
      console.error('Gemini CQ error:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.' },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('POST /api/academy/cq error:', err);
    return NextResponse.json({ error: 'Could not generate CQ solution.' }, { status: 500 });
  }
}
