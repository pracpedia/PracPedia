import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * PUT /api/hire/[id] — update a hire request's status.
 * Admin/super_admin only.
 *
 * Body: { status: 'pending' | 'completed' | 'cancelled' }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — admin only.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(String(status))) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const existing = await db.hireRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Hire request not found.' }, { status: 404 });
    }

    const updated = await db.hireRequest.update({
      where: { id },
      data: { status: String(status) },
    });

    return NextResponse.json({ ...updated, id: updated.id });
  } catch (err: any) {
    console.error('PUT /api/hire/[id] error:', err);
    return NextResponse.json({ error: 'Could not update hire request.' }, { status: 500 });
  }
}
