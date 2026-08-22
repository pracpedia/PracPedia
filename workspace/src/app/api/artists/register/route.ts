import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, getUserFromRequest } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { serializeUser } from '@/lib/user-serializer';

// Artist registration with two-tier pricing and portfolio setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phoneNumber, profilePic, bio, rateDrawingOnly, rateDrawingWriting, specialties, isAvailable } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);
    const tagArr = Array.isArray(specialties)
      ? specialties
      : (specialties ? String(specialties).split(',').map((s: string) => s.trim()).filter(Boolean) : []);

    const artist = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        name: String(name || email.split('@')[0]),
        passwordHash,
        role: 'artist',
        bio: bio ? String(bio) : null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        profilePic: profilePic || null,
        rateDrawingOnly: Number(rateDrawingOnly) || 150,
        rateDrawingWriting: Number(rateDrawingWriting) || 300,
        specialtiesJson: JSON.stringify(tagArr),
        isAvailable: isAvailable !== false,
        rating: 5.0,
        completedOrders: 0,
      },
    });

    const token = await signToken({ userId: artist.id, email: artist.email, role: artist.role });
    return NextResponse.json({ token, user: serializeUser(artist) });
  } catch (err: any) {
    console.error('POST /api/artists/register error:', err);
    return NextResponse.json({ error: 'Artist registration failed.' }, { status: 500 });
  }
}

// Update artist profile (rates, specialties, availability) — only the artist or super_admin
export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u || u.role !== 'artist') {
      return NextResponse.json({ error: 'Only artists can update artist profiles.' }, { status: 403 });
    }
    const body = await request.json();
    const { rateDrawingOnly, rateDrawingWriting, specialties, isAvailable } = body;
    const updateData: any = {};
    if (rateDrawingOnly !== undefined) updateData.rateDrawingOnly = Number(rateDrawingOnly) || 0;
    if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;
    if (specialties !== undefined) {
      const arr = Array.isArray(specialties)
        ? specialties
        : String(specialties).split(',').map((s: string) => s.trim()).filter(Boolean);
      updateData.specialtiesJson = JSON.stringify(arr);
    }
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    const updated = await db.user.update({ where: { id: u.id }, data: updateData });
    return NextResponse.json(serializeUser(updated));
  } catch (err: any) {
    console.error('PUT /api/artists/register error:', err);
    return NextResponse.json({ error: 'Could not update artist profile.' }, { status: 500 });
  }
}
