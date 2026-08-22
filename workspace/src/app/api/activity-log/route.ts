import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/activity-log
 *
 * Returns recent activity log entries for the admin real-time feed.
 *
 * Query params:
 *   ?limit=50       — max 200, default 50
 *   ?category=auth  — filter by category (auth|user|content|marketplace|chat|system)
 *   ?action=login   — filter by action type
 *   ?since=ISO      — only entries newer than this timestamp (for long-polling)
 *
 * Auth: requires admin or super_admin role.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role gate — only admins can view the activity log
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50));
    const category = searchParams.get('category');
    const action = searchParams.get('action');
    const since = searchParams.get('since');

    // Build where clause
    const where: any = {};
    if (category) where.category = String(category);
    if (action) where.action = String(action);
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const entries = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        ...e,
        metadata: JSON.parse(e.metadataJson || '{}'),
      })),
      count: entries.length,
      polledAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('GET /api/activity-log error:', err);
    return NextResponse.json({ error: 'Could not load activity log.' }, { status: 500 });
  }
}
