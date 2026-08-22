import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';

export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, phoneNumber, bio, profilePic, rateDrawingOnly, rateDrawingWriting, specialties, isAvailable } = body;

    const u = await db.user.findUnique({ where: { id: payload.userId } });
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Artist-only fields: only update if the user is an artist AND the field is provided
    const isArtist = u.role === 'artist';
    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name);
    if (phoneNumber !== undefined) updateData.phoneNumber = String(phoneNumber);
    if (bio !== undefined) updateData.bio = String(bio);
    if (profilePic !== undefined) updateData.profilePic = String(profilePic);
    if (isArtist) {
      if (rateDrawingOnly !== undefined) updateData.rateDrawingOnly = Number(rateDrawingOnly) || 0;
      if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;
      if (specialties !== undefined) {
        const arr = Array.isArray(specialties)
          ? specialties
          : String(specialties).split(',').map((s: string) => s.trim()).filter(Boolean);
        updateData.specialtiesJson = JSON.stringify(arr);
      }
      if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    }

    const updated = await db.user.update({ where: { id: u.id }, data: updateData });
    const newToken = await signToken({ userId: updated.id, email: updated.email, role: updated.role });
    return NextResponse.json({ token: newToken, user: serializeUser(updated) });
  } catch (err: any) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Could not update profile.' }, { status: 500 });
  }
}
