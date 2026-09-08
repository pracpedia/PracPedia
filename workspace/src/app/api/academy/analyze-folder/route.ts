import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { geminiGenerate, geminiVision } from '@/lib/gemini-byok';

/**
 * POST /api/academy/analyze-folder
 *
 * Analyzes an ENTIRE practical folder (all pages) at once.
 * The user picks a subject + practical folder, and the AI gets:
 *   1. All images from that folder (sent as inline base64 to Gemini Vision)
 *   2. A combined prompt asking it to explain the full practical
 *
 * Supports Q&A mode — user can ask follow-up questions about the same folder.
 *
 * Body: {
 *   folderId: string,
 *   question?: string,        // optional — if provided, Q&A mode
 *   language?: 'en' | 'bn' | 'bn_book',
 *   mode?: 'explain' | 'qa'  // default: explain
 * }
 *
 * Requires BYOK Gemini API key via x-gemini-api-key header.
 */

const MAX_IMAGES = 8; // Gemini limit — send up to 8 pages per request

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userApiKey = request.headers.get('x-gemini-api-key');
    if (!userApiKey?.trim()) {
      return NextResponse.json({
        error: 'Gemini API key required. Click "Connect AI Key" to add your key.',
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { folderId, question, language = 'en', mode = 'explain' } = body;

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required.' }, { status: 400 });
    }

    // Fetch the folder with all its images
    const folder = await db.folder.findUnique({ where: { id: String(folderId) } });
    if (!folder) {
      return NextResponse.json({ error: 'Practical folder not found.' }, { status: 404 });
    }

    const allImages: any[] = safeJsonParseArray(folder.imagesJson);
    if (!allImages || allImages.length === 0) {
      return NextResponse.json({ error: 'No images found in this practical folder.' }, { status: 400 });
    }

    // Limit to MAX_IMAGES pages (Gemini has input size limits)
    const images = allImages.slice(0, MAX_IMAGES);
    const isBn = language === 'bn' || language === 'bn_book';

    // ── Build the prompt ──
    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'qa' && question) {
      // Q&A mode — user asks a specific question about the practical
      systemPrompt = isBn
        ? `তুমি একজন অভিজ্ঞ HSC বিজ্ঞান শিক্ষক। ছাত্র একটি সম্পূর্ণ প্র্যাক্টিক্যাল নোটবুক (একাধিক পৃষ্ঠা) দেখছে এবং সেটি সম্পর্কে প্রশ্ন করছে। ছবিগুলো মনোযোগ দিয়ে দেখো এবং ছাত্রের প্রশ্নের উত্তর বাংলায় দাও।`
        : `You are an expert HSC science teacher. The student is viewing a complete practical notebook (multiple pages) and asking a question about it. Carefully examine the images and answer the student's question in English.`;
      userPrompt = isBn
        ? `প্র্যাক্টিক্যাল: ${folder.title}\n\nছাত্রের প্রশ্ন: ${question}\n\nঅনুগ্রহ করে ছবিগুলো দেখে উত্তর দাও।`
        : `Practical: ${folder.title}\n\nStudent's question: ${question}\n\nPlease examine the images and answer.`;
    } else {
      // Explain mode — AI explains the entire practical
      systemPrompt = isBn
        ? `তুমি একজন অভিজ্ঞ HSC বিজ্ঞান শিক্ষক। ছাত্র একটি সম্পূর্ণ প্র্যাক্টিক্যাল নোটবুক দেখছে (একাধিক পৃষ্ঠা)। প্রতিটি পৃষ্ঠা মনোযোগ দিয়ে দেখো এবং সম্পূর্ণ প্র্যাক্টিক্যালটি বাংলায় ব্যাখ্যা করো। নিচের বিষয়গুলো অন্তর্ভুক্ত করো:\n\n১. প্র্যাক্টিক্যালের নাম ও উদ্দেশ্য\n২. ব্যবহৃত যন্ত্রপাতি ও উপকরণ\n৩. পদ্ধতি (ধাপে ধাপে)\n৪. পর্যবেক্ষণ ও ডেটা টেবিল\n৫. গণনা ও সূত্র\n৬. ফলাফল ও সতর্কতা\n\nপ্রতিটি পৃষ্ঠার বিষয়বস্তু আলাদাভাবে উল্লেখ করো।`
        : `You are an expert HSC science teacher. The student is viewing a complete practical notebook (multiple pages). Carefully examine each page and explain the ENTIRE practical in English. Include:\n\n1. Practical name and objective\n2. Apparatus and materials used\n3. Procedure (step by step)\n4. Observation and data tables\n5. Calculations and formulas\n6. Results and precautions\n\nReference each page's content separately (Page 1, Page 2, etc.).`;
      userPrompt = isBn
        ? `প্র্যাক্টিক্যাল: ${folder.title}\nবিষয়: ${folder.subjectId || 'বিজ্ঞান'}\nমোট পৃষ্ঠা: ${images.length}\n\nনিচের ছবিগুলো একটি সম্পূর্ণ প্র্যাক্টিক্যাল নোটবুকের পৃষ্ঠাগুলো। সম্পূর্ণ প্র্যাক্টিক্যালটি ব্যাখ্যা করো।`
        : `Practical: ${folder.title}\nSubject: ${folder.subjectId || 'Science'}\nTotal pages: ${images.length}\n\nThe images below are pages from a complete practical notebook. Explain the entire practical.`;
    }

    // ── Send images to Gemini Vision ──
    // Gemini supports multiple images in a single request via inline_data parts
    const imageParts: any[] = [];

    for (let i = 0; i < images.length; i++) {
      const imgUrl = images[i]?.url || images[i];
      if (!imgUrl || typeof imgUrl !== 'string') continue;

      try {
        let base64: string;
        let mime: string;

        if (imgUrl.startsWith('data:')) {
          const [meta, b64] = imgUrl.split(',');
          mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          base64 = b64;
        } else {
          // Fetch external URL (Cloudinary) and convert to base64
          const imgRes = await fetch(imgUrl);
          if (!imgRes.ok) continue;
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          base64 = buffer.toString('base64');
          mime = imgRes.headers.get('content-type') || 'image/jpeg';
        }

        imageParts.push({
          inline_data: { mime_type: mime, data: base64 },
        });
      } catch {
        // Skip images that fail to fetch
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json({
        error: 'Could not load any images from this practical. Please try again.',
      }, { status: 400 });
    }

    // Build the Gemini request body with text + all images
    const geminiBody: any = {
      contents: [{
        role: 'user',
        parts: [
          { text: userPrompt },
          ...imageParts.map((part, idx) => ({
            inline_data: part.inline_data,
          })),
        ],
      }],
      generationConfig: {
        temperature: mode === 'qa' ? 0.5 : 0.7,
        maxOutputTokens: mode === 'qa' ? 2000 : 4000,
      },
    };
    if (systemPrompt) {
      geminiBody.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    // Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': userApiKey.trim(),
        },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const detail = errData?.error?.message || '';
      return NextResponse.json({
        error: `AI analysis failed (${geminiRes.status}): ${detail || geminiRes.statusText}`,
      }, { status: 500 });
    }

    const geminiData = await geminiRes.json().catch(() => ({}));
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof responseText !== 'string' || !responseText.trim()) {
      return NextResponse.json({
        error: 'AI returned an empty response. Please try again.',
      }, { status: 500 });
    }

    return NextResponse.json({
      content: responseText,
      folderTitle: folder.title,
      pagesAnalyzed: imageParts.length,
      mode,
    });
  } catch (err: any) {
    console.error('POST /api/academy/analyze-folder error:', err);
    return NextResponse.json({
      error: 'Could not analyze practical. Please try again.',
    }, { status: 500 });
  }
}
