import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const subject = await db.subject.findUnique({ where: { id } });
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    return NextResponse.json({ ...subject, id: subject.id });
  } catch (err: any) {
    // Don't mask real errors (DB failures, code bugs) as 404 — log and
    // return 500 so the client surfaces the error instead of treating
    // it as "not found".
    console.error('GET /api/subjects/[id] error:', err);
    return NextResponse.json({ error: 'Could not load subject.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_subjects');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_subjects' }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const updated = await db.subject.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
      },
    });
    return NextResponse.json({ ...updated, id: updated.id });
  } catch (err: any) {
    console.error('PUT /api/subjects/[id] error:', err);
    return NextResponse.json({ error: 'Could not update subject.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await requirePermission(request, 'manage_subjects');
    if (denied) return NextResponse.json({ error: 'Forbidden — requires permission: manage_subjects' }, { status: 403 });
    const { id } = await params;
    await db.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/subjects/[id] error:', err);
    return NextResponse.json({ error: 'Could not delete subject.' }, { status: 500 });
  }
}
