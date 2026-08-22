import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { subject, topic, count = 5, language = 'en' } = body;

    const sysPrompt = `You are an MCQ generator for the PracPedia academy platform.
Subject: ${subject || 'General Science'}
Topic: ${topic || 'General'}
Number of questions: ${count}
Response Language: ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}

Return a JSON array of ${count} multiple choice questions. Each question must have:
- "question": the question text
- "options": array of exactly 4 strings (the answer choices)
- "answer": integer (0-3) — the index of the correct option
- "explanation": a short explanation of why the answer is correct

Return ONLY the JSON array, no markdown fences or surrounding text.`;

    let parsed: any[] = [];
    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      // BYOK: set user's API key as env var if provided via header
      const userApiKey = request.headers.get('x-gemini-api-key');
      if (userApiKey) process.env.GEMINI_API_KEY = userApiKey;
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: `Generate ${count} MCQs on: ${topic} (${subject})` },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      });
      const raw = completion.choices?.[0]?.message?.content || '[]';
      // Extract JSON from possible markdown fences
      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (aiErr: any) {
      console.error('AI SDK error in MCQ:', aiErr);
      parsed = generateFallbackMCQs(subject, topic, count);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = generateFallbackMCQs(subject, topic, count);
    }

    return NextResponse.json({ questions: parsed });
  } catch (err: any) {
    console.error('POST /api/academy/mcq error:', err);
    return NextResponse.json({ error: 'Could not generate MCQs.' }, { status: 500 });
  }
}

function generateFallbackMCQs(subject: string | undefined, topic: string | undefined, count: number): any[] {
  const subj = subject || 'General Science';
  const top = topic || 'this topic';
  const qs: any[] = [];
  for (let i = 0; i < Math.max(1, Math.min(count, 10)); i++) {
    qs.push({
      question: `Sample MCQ #${i + 1} on ${top} (${subj}). Which statement is correct?`,
      options: [
        'Option A — the primary definition or concept',
        'Option B — a common misconception',
        'Option C — an unrelated distractor',
        'Option D — a partially correct statement',
      ],
      answer: 0,
      explanation: 'Option A is correct because it directly aligns with the textbook definition.',
    });
  }
  return qs;
}
