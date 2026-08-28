import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    }
    const requests = await db.hireRequest.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(requests.map((r) => ({ ...r, id: r.id })));
  } catch (err: any) {
    console.error('GET /api/hire error:', err);
    return NextResponse.json({ error: 'Could not load hire requests.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, subject, message } = body;
    if (!fullName || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message required.' }, { status: 400 });
    }
    const created = await db.hireRequest.create({
      data: {
        fullName: String(fullName),
        email: String(email),
        phone: String(phone || ''),
        subject: String(subject || ''),
        message: String(message),
      },
    });
    return NextResponse.json({ ...created, id: created.id });
  } catch (err: any) {
    console.error('POST /api/hire error:', err);
    return NextResponse.json({ error: 'Could not submit hire request.' }, { status: 500 });
  }
}
