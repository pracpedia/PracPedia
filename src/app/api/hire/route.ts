import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { hireLimiter, getClientIp } from '@/lib/rate-limit';

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
    // Rate limit — 5 hire requests per 10 minutes per IP (public endpoint,
    // no auth required, so IP-based is the only option).
    const ip = getClientIp(request);
    const limit = hireLimiter.check(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { fullName, email, phone, subject, message } = body;
    if (!fullName || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message required.' }, { status: 400 });
    }
    const created = await db.hireRequest.create({
      data: {
        fullName: String(fullName).slice(0, 100),
        email: String(email).slice(0, 200),
        phone: String(phone || '').slice(0, 50),
        subject: String(subject || '').slice(0, 200),
        message: String(message).slice(0, 5000),
      },
    });
    return NextResponse.json({ ...created, id: created.id });
  } catch (err: any) {
    console.error('POST /api/hire error:', err);
    return NextResponse.json({ error: 'Could not submit hire request.' }, { status: 500 });
  }
}
