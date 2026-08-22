import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { prompt, subject, language = 'en' } = body;
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required.' }, { status: 400 });
    }

    const sysPrompt = `You are an AI academic tutor on the PracPedia platform.
Subject context: ${subject || 'General Science'}
Respond in: ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}

Provide clear, concise, helpful answers. Use Markdown formatting when appropriate.
Include code blocks for formulas, examples, or step-by-step solutions.
Keep responses under 600 words.`;

    let aiResponse: string;
    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      // The z-AI SDK reads the API key from process.env.GEMINI_API_KEY automatically.
      // BYOK: if the user sends their own key via x-gemini-api-key header, we set
      // it as the env var before calling create() (workaround for SDK not accepting args).
      const userApiKey = request.headers.get('x-gemini-api-key');
      if (userApiKey) {
        process.env.GEMINI_API_KEY = userApiKey;
      }
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: String(prompt) },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
      aiResponse = completion.choices?.[0]?.message?.content || '';
    } catch (aiErr: any) {
      console.error('AI SDK error:', aiErr);
      aiResponse = `> ⚠️ **Note:** The AI service is currently unavailable.\n\nI received your question about **${prompt}** but cannot generate a live response right now. Please try again in a moment, or review your textbook materials on this topic.`;
    }

    if (!aiResponse) {
      aiResponse = `> ⚠️ Empty AI response received. Please try again.`;
    }

    return NextResponse.json({ content: aiResponse });
  } catch (err: any) {
    console.error('POST /api/academy/chat error:', err);
    return NextResponse.json({ error: 'Could not process chat.' }, { status: 500 });
  }
}
