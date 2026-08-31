import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/platform-owner';

/**
 * Top up the authenticated user's AI credits to AI_CREDITS_DEFAULT.
 *
 * Cooldown: regular users can self-recharge at most once per 24h. This
 * prevents abuse (without a cooldown, anyone could call this endpoint
 * infinitely to refresh their credits — defeating the trial limit).
 *
 * Platform owners bypass the cooldown.
 */
const RECHARGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Platform owners bypass the cooldown.
    if (!isPlatformOwner(u.email) && u.lastRechargeAt) {
      const elapsed = Date.now() - u.lastRechargeAt.getTime();
      if (elapsed < RECHARGE_COOLDOWN_MS) {
        const remainingMs = RECHARGE_COOLDOWN_MS - elapsed;
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return NextResponse.json(
          {
            error: `Trial credits can be recharged once every 24 hours. Try again in ~${remainingHours} hour(s).`,
            cooldown: true,
            retryAfterMs: remainingMs,
          },
          { status: 429 }
        );
      }
    }

    const target = Number(process.env.AI_CREDITS_DEFAULT || '25');
    const updated = await db.user.update({
      where: { id: payload.userId },
      data: {
        aiCredits: target,
        lastRechargeAt: new Date(),
      },
    });

    return NextResponse.json({ aiCredits: updated.aiCredits });
  } catch (err: any) {
    console.error('POST /api/users/recharge-trial error:', err);
    return NextResponse.json({ error: 'Could not recharge trial credits.' }, { status: 500 });
  }
}
