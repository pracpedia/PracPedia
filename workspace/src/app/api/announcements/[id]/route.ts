import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const { id } = await params;
    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/announcements/[id] error:', err);
    return NextResponse.json({ error: 'Could not delete announcement.' }, { status: 500 });
  }
}
