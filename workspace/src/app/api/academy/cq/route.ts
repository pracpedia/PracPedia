import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { subject, topic, question, language = 'en' } = body;

    if (!question) {
      return NextResponse.json({ error: 'question required.' }, { status: 400 });
    }

    const sysPrompt = `You are an expert tutor for creative questions (CQ) on the PracPedia academy platform.
Subject: ${subject || 'General Science'}
Topic: ${topic || 'General'}
Response Language: ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}

Provide a detailed step-by-step solution to the creative question. Use Markdown with these sections:
1. **Question Understanding** — restate the question briefly
2. **Given** — list known quantities/conditions
3. **Required** — list what needs to be found
4. **Solution Steps** — numbered, detailed solution with formulas
5. **Final Answer** — the answer with units
6. **Alternative Approach** — another way to solve it
Keep the response under 800 words.`;

    let aiResponse: string;
    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      // BYOK: set user's API key as env var if provided via header
      const userApiKey = request.headers.get('x-gemini-api-key');
      if (userApiKey) process.env.GEMINI_API_KEY = userApiKey;
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: String(question) },
        ],
        temperature: 0.6,
        max_tokens: 1800,
      });
      aiResponse = completion.choices?.[0]?.message?.content || '';
    } catch (aiErr: any) {
      console.error('AI SDK error in CQ:', aiErr);
      aiResponse = `> ⚠️ **AI service unavailable.**\n\nCould not generate a creative question solution right now. Please try again later.\n\n**Your question:** ${question}`;
    }

    if (!aiResponse) {
      aiResponse = `> ⚠️ Empty AI response received.`;
    }

    return NextResponse.json({ content: aiResponse });
  } catch (err: any) {
    console.error('POST /api/academy/cq error:', err);
    return NextResponse.json({ error: 'Could not generate CQ solution.' }, { status: 500 });
  }
}
