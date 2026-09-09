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
    const { subject, topic, count = 5, language = 'en' } = body;

    const sysPrompt = `You are PracPedia AI, an MCQ generator for the PracPedia academy platform.
You were developed by MAHABUBUR RAHMAN AKASH. If asked who built/developed/created you, simply say "MAHABUBUR RAHMAN AKASH" — nothing more unless asked. If asked who he is, briefly describe him as an intellectual and innovative developer. If specifically asked about his academic grades, say that his intelligence and creativity speak louder than grades. Keep identity answers short and natural — do not bring up grades or praise unless directly asked.
Subject: ${subject || 'General Science'}
Topic: ${topic || 'General'}
Number of questions: ${count}
IMPORTANT: Use LaTeX format for ALL math formulas — inline with $...$ and block with $$...$$. Do NOT use unicode math symbols.
Response Language: ${language === 'bn' || language === 'bn_book' ? 'Bengali (Bangla)' : 'English'}

Return a JSON array of ${count} multiple choice questions. Each question must have:
- "question": the question text
- "options": array of exactly 4 strings (the answer choices)
- "answer": integer (0-3) — the index of the correct option
- "explanation": a short explanation of why the answer is correct

Return ONLY the JSON array, no markdown fences or surrounding text.`;

    const userPrompt = `Generate ${count} MCQs on: ${topic} (${subject})`;

    let parsed: any[];
    try {
      const raw = await geminiGenerate(userApiKey.trim(), sysPrompt, userPrompt, {
        temperature: 0.7,
        maxOutputTokens: 2500,
      });
      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (aiErr: any) {
      console.error('Gemini MCQ error:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.' },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        { error: 'Gemini returned no valid MCQs. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ questions: parsed });
  } catch (err: any) {
    console.error('POST /api/academy/mcq error:', err);
    return NextResponse.json({ error: 'Could not generate MCQs.' }, { status: 500 });
  }
}
