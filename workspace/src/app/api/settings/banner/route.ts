import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/settings/banner
 * Returns the banner configuration (public — visible on landing page).
 * Stored as a singleton in the Announcement table with targetUserId = 'banner-config'.
 */
export async function GET() {
  try {
    const config = await db.announcement.findFirst({
      where: { targetUserId: 'banner-config' },
    });

    if (!config) {
      return NextResponse.json({
        enabled: true,
        text: '⭐ 2026 Bangladesh National Board Curriculum Standards Fully Integrated for HSC Candidates',
        bgColor: 'rgba(8, 47, 73, 0.4)',
        textColor: '#22d3ee',
        size: 'md',
      });
    }

    return NextResponse.json({
      enabled: config.content !== 'disabled',
      text: config.title,
      bgColor: config.deadline || 'rgba(8, 47, 73, 0.4)',
      textColor: config.createdByName || '#22d3ee',
      size: config.content || 'md',
    });
  } catch (err: any) {
    console.error('GET /api/settings/banner error:', err);
    return NextResponse.json({ error: 'Could not load banner config.' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/banner
 * Super admin updates the banner configuration.
 * Body: { enabled, text, bgColor, textColor, size }
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, text, bgColor, textColor, size } = body;

    const existing = await db.announcement.findFirst({
      where: { targetUserId: 'banner-config' },
    });

    const data = {
      title: String(text || '').slice(0, 500),
      content: enabled ? String(size || 'md') : 'disabled',
      deadline: String(bgColor || 'rgba(8, 47, 73, 0.4)').slice(0, 100),
      createdByName: String(textColor || '#22d3ee').slice(0, 50),
      targetUserId: 'banner-config',
      createdById: payload.userId,
    };

    if (existing) {
      await db.announcement.update({ where: { id: existing.id }, data });
    } else {
      try {
        await db.announcement.create({ data });
      } catch (createErr: any) {
        const race = await db.announcement.findFirst({ where: { targetUserId: 'banner-config' } });
        if (race) {
          await db.announcement.update({ where: { id: race.id }, data });
        } else {
          throw createErr;
        }
      }
    }

    return NextResponse.json({ enabled, text, bgColor, textColor, size });
  } catch (err: any) {
    console.error('PUT /api/settings/banner error:', err);
    return NextResponse.json({ error: 'Could not update banner config.' }, { status: 500 });
  }
}
