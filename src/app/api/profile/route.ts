import { NextRequest, NextResponse } from 'next/server';
import { safeJsonParseArray } from '@/lib/json';
import { db } from '@/lib/db';
import { getUserFromRequest, signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/user-serializer';
import { uploadDataUrl } from '@/lib/blob-storage';

export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, phoneNumber, bio, profilePic, rateDrawingOnly, rateDrawingWriting, notebookCost, specialties, isAvailable } = body;

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
       if (profilePic !== undefined) {
      // Upload avatar to blob storage if it's a data URL.
      // Use the user's name as the Cloudinary title so the asset is easily
      // identifiable in the Cloudinary Media Library.
      const displayName = name !== undefined ? String(name) : (u.name || 'user');
      updateData.profilePic = profilePic.startsWith('data:')
        ? await uploadDataUrl(String(profilePic), 'avatars', displayName)
        : String(profilePic);
    }
    if (isArtist) {
      if (rateDrawingOnly !== undefined) updateData.rateDrawingOnly = Number(rateDrawingOnly) || 0;
      if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;
      if (notebookCost !== undefined) updateData.notebookCost = Number(notebookCost) || 0;
      if (specialties !== undefined) {
        const arr = Array.isArray(specialties)
          ? specialties
          : String(specialties).split(',').map((s: string) => s.trim()).filter(Boolean);
        updateData.specialtiesJson = JSON.stringify(arr);
      }
      if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    }

        // ── Assistant graduation: assistant → independent artist ──
    if (body.graduateToIndependent === true && u.parentArtistId) {
      if (!body.rateDrawingOnly || !body.rateDrawingWriting) {
        return NextResponse.json({
          error: 'Please set your drawing rates before becoming an independent artist.'
        }, { status: 400 });
      }
      updateData.parentArtistId = null;
      updateData.rateDrawingOnly = Math.max(50, Math.min(2000, Number(body.rateDrawingOnly) || 150));
      updateData.rateDrawingWriting = Math.max(100, Math.min(4000, Number(body.rateDrawingWriting) || 300));
      updateData.notebookCost = Number(body.notebookCost) || 100;
      if (body.specialties) {
        const arr = Array.isArray(body.specialties)
          ? body.specialties
          : String(body.specialties).split(',').map((s: string) => s.trim()).filter(Boolean);
        updateData.specialtiesJson = JSON.stringify(arr);
      }
      if (body.bio) updateData.bio = String(body.bio);
      updateData.isAvailable = true;
    }

    // ── Student → Artist conversion ──
    if (body.becomeArtist === true && u.role === 'user') {
      if (!body.rateDrawingOnly || !body.rateDrawingWriting) {
        return NextResponse.json({
          error: 'Please set your drawing rates to become an artist.'
        }, { status: 400 });
      }
      updateData.role = 'artist';
      updateData.rateDrawingOnly = Math.max(50, Math.min(2000, Number(body.rateDrawingOnly) || 150));
      updateData.rateDrawingWriting = Math.max(100, Math.min(4000, Number(body.rateDrawingWriting) || 300));
      updateData.notebookCost = Number(body.notebookCost) || 100;
      if (body.specialties) {
        const arr = Array.isArray(body.specialties)
          ? body.specialties
          : String(body.specialties).split(',').map((s: string) => s.trim()).filter(Boolean);
        updateData.specialtiesJson = JSON.stringify(arr);
      }
      if (body.bio) updateData.bio = String(body.bio);
      updateData.isAvailable = true;
    }

    const updated = await db.user.update({ where: { id: u.id }, data: updateData });
    const newToken = await signToken({ userId: updated.id, email: updated.email, role: updated.role });
    return NextResponse.json({ token: newToken, user: serializeUser(updated) });
  } catch (err: any) {
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Could not update profile.' }, { status: 500 });
  }
}
