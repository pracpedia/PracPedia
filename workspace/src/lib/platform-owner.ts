/**
 * Platform owner protection.
 *
 * The platform owner is the first super_admin — they cannot be demoted,
 * deleted, or blocked by any other admin (including other super_admins).
 *
 * Identified by:
 *   1. Email matching the seed super admin (admin@gallery.com)
 *   2. Or matching any email in PLATFORM_OWNER_EMAILS env var
 */

const SEED_OWNER_EMAILS = [
  'admin@gallery.com',
];

export function isPlatformOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = String(email).toLowerCase().trim();
  if (SEED_OWNER_EMAILS.includes(normalized)) return true;
  const envOwners = (process.env.PLATFORM_OWNER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return envOwners.includes(normalized);
}

/**
 * Check by user ID — fetches the user from DB to get their email.
 * Use this in API routes where you have the userId but not the email.
 */
export async function isPlatformOwnerById(userId: string): Promise<boolean> {
  try {
    // Lazy import to avoid circular dependency at module load time
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    return isPlatformOwner(user?.email);
  } catch {
    return false;
  }
}
