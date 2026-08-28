import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Top up the authenticated user's AI credits to AI_CREDITS_DEFAULT.
 *
 * Used by the Lightbox/AiAcademyRoom "Recharge trial credits" button when a
 * student runs out of credits.
 *
 * Returns the new credit count so the client can update its state.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const target = Number(process.env.AI_CREDITS_DEFAULT || '25');
    const updated = await db.user.update({
      where: { id: payload.userId },
      data: { aiCredits: target },
    });

    return NextResponse.json({ aiCredits: updated.aiCredits });
  } catch (err: any) {
    console.error('POST /api/users/recharge-trial error:', err);
    return NextResponse.json({ error: 'Could not recharge trial credits.' }, { status: 500 });
  }
}
