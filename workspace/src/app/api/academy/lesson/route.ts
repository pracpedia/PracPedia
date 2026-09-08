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

    // BYOK gate — every AI feature on PracPedia requires the user's own
    // Gemini API key. Without it we reject with a 403 and a clear message
    // so the client can prompt the user to connect their key.
    const userApiKey = request.headers.get('x-gemini-api-key');
    if (!userApiKey || !userApiKey.trim()) {
      return NextResponse.json(
        { error: 'Gemini API key required. Open "Gemini Key" in your profile sidebar and connect your free Google Gemini API key to use AI features.', needsGeminiKey: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, subject, topic, language = 'en' } = body;
    if (!prompt && !subject && !topic) {
      return NextResponse.json({ error: 'Prompt, subject or topic required.' }, { status: 400 });
    }

    const sysPrompt = `You are an elite academic tutor for the PracPedia platform.
Generate a detailed, structured lesson on the requested topic.
Subject: ${subject || 'General Science'}
Topic: ${topic || prompt}
Response Language: ${language === 'bn' || language === 'bn_book' ? 'Bengali (Bangla)' : 'English'}

Format your response in Markdown with these sections:
1. ## Lesson Overview (1-2 paragraph intro)
2. ## Key Concepts (bullet list of 5-7 key points)
3. ## Detailed Explanation (3-4 paragraphs of in-depth content with examples)
4. ## Important Formulas (if applicable, with LaTeX-style notation in code blocks)
5. ## Real-World Applications (3-4 concrete examples)
6. ## Quick Summary (bullet recap)
7. ## Practice Questions (3-5 questions for the student)

Keep the tone academic, encouraging, and clear. Use proper Markdown formatting.`;

    const userPrompt = `Topic: ${topic || prompt}\nSubject: ${subject || 'General Science'}`;

    try {
      const aiResponse = await geminiGenerate(userApiKey.trim(), sysPrompt, userPrompt, {
        temperature: 0.7,
        maxOutputTokens: 2500,
      });
      return NextResponse.json({ content: aiResponse });
    } catch (aiErr: any) {
      console.error('Gemini lesson error:', aiErr?.message);
      return NextResponse.json(
        { error: aiErr?.message || 'Gemini AI request failed. Check that your API key is valid and try again.' },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('POST /api/academy/lesson error:', err);
    return NextResponse.json({ error: 'Could not generate lesson.' }, { status: 500 });
  }
}
