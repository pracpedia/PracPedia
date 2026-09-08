import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

/**
 * GET /api/settings/gemini-model
 * Returns the current Gemini model (from DB admin config, or env default).
 * Public — any authenticated user can see which model is in use.
 */
export async function GET(request: NextRequest) {
  try {
    const config = await withRetry(() =>
      db.announcement.findFirst({ where: { targetUserId: 'gemini-model' } })
    );

    const model = config?.title || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    return NextResponse.json({ model });
  } catch (err: any) {
    console.error('GET /api/settings/gemini-model error:', err);
    return NextResponse.json({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });
  }
}

/**
 * PUT /api/settings/gemini-model
 * Super-admin only. Updates the Gemini model at runtime — no env restart needed.
 * Body: { model: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { model } = body;

    if (!model || typeof model !== 'string' || model.trim().length < 3) {
      return NextResponse.json({ error: 'Valid model name required.' }, { status: 400 });
    }

    const cleanModel = model.trim().slice(0, 100);
    const data = {
      title: cleanModel,
      content: 'gemini-model-config',
      deadline: null,
      createdByName: 'gemini-model',
      targetUserId: 'gemini-model',
      createdById: payload.userId,
    };

    const existing = await withRetry(() =>
      db.announcement.findFirst({ where: { targetUserId: 'gemini-model' } })
    );

    if (existing) {
      await db.announcement.update({ where: { id: existing.id }, data });
    } else {
      try {
        await db.announcement.create({ data });
      } catch (createErr: any) {
        const race = await db.announcement.findFirst({ where: { targetUserId: 'gemini-model' } });
        if (race) {
          await db.announcement.update({ where: { id: race.id }, data });
        } else {
          throw createErr;
        }
      }
    }

    return NextResponse.json({ model: cleanModel, success: true });
  } catch (err: any) {
    console.error('PUT /api/settings/gemini-model error:', err);
    return NextResponse.json({ error: 'Could not update Gemini model.' }, { status: 500 });
  }
}
