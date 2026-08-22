import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { prompt, subject, topic, language = 'en' } = body;
    if (!prompt && !subject && !topic) {
      return NextResponse.json({ error: 'Prompt, subject or topic required.' }, { status: 400 });
    }

    // Compose the AI prompt
    const sysPrompt = `You are an elite academic tutor for the PracPedia platform.
Generate a detailed, structured lesson on the requested topic.
Subject: ${subject || 'General Science'}
Topic: ${topic || prompt}
Response Language: ${language === 'bn' ? 'Bengali (Bangla)' : 'English'}

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

    let aiResponse: string;
    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      });
      aiResponse = completion.choices?.[0]?.message?.content || '';
    } catch (aiErr: any) {
      console.error('AI SDK error:', aiErr);
      // Fallback static content if AI is unavailable
      aiResponse = generateFallbackLesson(subject, topic || prompt, language);
    }

    if (!aiResponse) {
      aiResponse = generateFallbackLesson(subject, topic || prompt, language);
    }

    return NextResponse.json({ content: aiResponse });
  } catch (err: any) {
    console.error('POST /api/academy/lesson error:', err);
    return NextResponse.json({ error: 'Could not generate lesson.' }, { status: 500 });
  }
}

function generateFallbackLesson(subject: string | undefined, topic: string | undefined, language: string): string {
  const lang = language === 'bn' ? 'Bengali' : 'English';
  const subj = subject || 'General Science';
  const top = topic || 'the topic';
  return `## Lesson Overview

This is a structured lesson on **${top}** for the subject **${subj}** in ${lang}. Our focus here is to give you a clear, practical introduction that connects textbook theory with real laboratory practice.

## Key Concepts

- Definition and fundamental principles of ${top}
- Core formulas and their derivation
- Important experimental setup and apparatus
- Common observation patterns and data analysis
- Sources of error and their mitigation
- Real-world applications in everyday science
- Practice questions and self-assessment checkpoints

## Detailed Explanation

The topic of ${top} is central to ${subj}. Understanding it requires both theoretical knowledge and practical demonstration. We will explore the underlying principles, work through practical examples, and end with reflective questions.

In the laboratory, you will encounter ${top} through direct observation. Take careful measurements, record them in tables, and analyze the resulting patterns. Always follow safety protocols and use proper apparatus.

When working through problems related to ${top}, start by identifying known quantities and the unknown you are solving for. Apply the appropriate formula, substitute values with correct units, and verify your final answer through dimensional analysis.

## Important Formulas

\`\`\`
Key equation: result = input1 × input2 / constant
\`\`\`

## Real-World Applications

1. Industrial process control
2. Environmental monitoring
3. Medical diagnostics
4. Engineering and design calculations

## Quick Summary

- ${top} is a core concept in ${subj}
- Understanding requires both theory and practical lab work
- Apply proper formulas and check units carefully

## Practice Questions

1. Define ${top} and list its key properties.
2. Derive the main formula and explain each term.
3. Solve a numerical example with realistic values.
4. Identify two sources of error in measuring ${top}.
5. Describe one real-world application of ${top}.

> _Note: AI service is currently unavailable. This is a structured template lesson._`;
}
