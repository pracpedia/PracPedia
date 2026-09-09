import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_announcements');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_announcements' }, { status: 403 });
    const { id } = await params;
    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/announcements/[id] error:', err);
    return NextResponse.json({ error: 'Could not delete announcement.' }, { status: 500 });
  }
}
