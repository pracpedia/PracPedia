import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { withRetry } from '@/lib/db-retry';

/**
 * GET /api/settings/landing
 * Public endpoint returning landing page configuration.
 * Controls the "Trusted by N students" trust badge:
 *   - enabled: boolean (default true)
 *   - useCustomCount: boolean (false = fetch real user count from /api/stats)
 *   - customCount: number (when useCustomCount=true, show this number instead)
 */
export async function GET() {
  try {
    const config = await withRetry(() =>
      db.announcement.findFirst({
        where: { targetUserId: 'landing-config' },
      })
    );

    if (!config) {
      return NextResponse.json({
        trustBadge: { enabled: true, useCustomCount: false, customCount: 0 },
      });
    }

    const enabled = config.content !== 'disabled';
    const useCustomCount = config.content === 'custom';
    const customCount = parseInt(config.deadline || '0', 10) || 0;

    return NextResponse.json({
      trustBadge: { enabled, useCustomCount, customCount },
    });
  } catch (err: any) {
    console.error('GET /api/settings/landing error:', err);
    // Return defaults instead of 500 — the landing page can still render
    return NextResponse.json({
      trustBadge: { enabled: true, useCustomCount: false, customCount: 0 },
    });
  }
}

/**
 * PUT /api/settings/landing
 * Super-admin only. Body: { trustBadge: { enabled, useCustomCount, customCount } }
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { trustBadge } = body;
    if (!trustBadge || typeof trustBadge !== 'object') {
      return NextResponse.json({ error: 'trustBadge object required.' }, { status: 400 });
    }

    const enabled = !!trustBadge.enabled;
    const useCustomCount = !!trustBadge.useCustomCount;
    const customCount = Math.max(0, Math.min(999999, parseInt(trustBadge.customCount || '0', 10) || 0));

    const content = enabled ? (useCustomCount ? 'custom' : 'auto') : 'disabled';

    const existing = await db.announcement.findFirst({ where: { targetUserId: 'landing-config' } });

    const data = {
      title: 'Landing Page Configuration',
      content,
      deadline: String(customCount),
      createdByName: 'landing-config',
      targetUserId: 'landing-config',
      createdById: payload.userId,
    };

    if (existing) {
      await db.announcement.update({ where: { id: existing.id }, data });
    } else {
      // Race-safe insert — if two requests both reach here, one succeeds
      // and the other falls back to update.
      try {
        await db.announcement.create({ data });
      } catch (createErr: any) {
        const race = await db.announcement.findFirst({ where: { targetUserId: 'landing-config' } });
        if (race) {
          await db.announcement.update({ where: { id: race.id }, data });
        } else {
          throw createErr;
        }
      }
    }

    return NextResponse.json({ trustBadge: { enabled, useCustomCount, customCount } });
  } catch (err: any) {
    console.error('PUT /api/settings/landing error:', err);
    return NextResponse.json({ error: 'Could not update landing config.' }, { status: 500 });
  }
}
