// Helper to serialize a User row into the API response shape
// (shared across all auth routes)
import type { User } from '@prisma/client';

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin' | 'artist';
  studyTime: number;
  profilePic: string;
  phoneNumber: string;
  bio: string;
  isAdminStudent: boolean;
  isPremium: boolean;
  aiCredits: number;
  // Artist marketplace fields
  rateDrawingOnly: number;
  rateDrawingWriting: number;
  specialties: string[];
  isAvailable: boolean;
  rating: number;
  completedOrders: number;
}

export function serializeUser(u: User): SerializedUser {
  let specialties: string[] = [];
  try {
    const parsed = JSON.parse(u.specialtiesJson || '[]');
    if (Array.isArray(parsed)) {
      specialties = parsed.filter((x) => typeof x === 'string');
    }
  } catch {
    // ignore malformed JSON
  }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as 'user' | 'admin' | 'super_admin' | 'artist',
    studyTime: u.studyTime,
    profilePic: u.profilePic || '',
    phoneNumber: u.phoneNumber || '',
    bio: u.bio || '',
    isAdminStudent: u.isAdminStudent,
    isPremium: u.isPremium,
    aiCredits: u.aiCredits,
    rateDrawingOnly: u.rateDrawingOnly,
    rateDrawingWriting: u.rateDrawingWriting,
    specialties,
    isAvailable: u.isAvailable,
    rating: u.rating,
    completedOrders: u.completedOrders,
  };
}
