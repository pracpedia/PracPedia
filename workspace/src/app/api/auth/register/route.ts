import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getUserFromRequest } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, profilePic, phoneNumber } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Artist registration includes rate fields
    const isArtist = role === 'artist';

    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);
    const newUser = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        name: String(name || email.split('@')[0]),
        passwordHash,
        role: isArtist ? 'artist' : 'user',
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        profilePic: profilePic || null,
        // Artist-specific marketplace fields
        rateDrawingOnly: isArtist ? Number(body.rateDrawingOnly) || 150 : 0,
        rateDrawingWriting: isArtist ? Number(body.rateDrawingWriting) || 300 : 0,
        specialtiesJson: isArtist && body.specialties
          ? JSON.stringify(Array.isArray(body.specialties) ? body.specialties : String(body.specialties).split(',').map((s: string) => s.trim()).filter(Boolean))
          : '[]',
        isAvailable: isArtist ? body.isAvailable !== false : true,
      },
    });

    const token = await signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json({ token, user: serializeUser(newUser) });
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user: serializeUser(u) });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
