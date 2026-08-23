/**
 * Granular permission system for admins.
 *
 * Super admins have ALL permissions implicitly. Regular admins only have
 * the permissions explicitly assigned to them by a super admin.
 *
 * Usage in API routes:
 *   import { hasPermission, requirePermission } from '@/lib/permissions';
 *
 *   // Simple check:
 *   if (!await hasPermission(request, 'manage_users')) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 *
 *   // Or use the helper that returns a 403 response:
 *   const denied = await requirePermission(request, 'manage_users');
 *   if (denied) return denied;
 */

import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Permission definitions — the full catalog of admin permissions.
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  category: 'users' | 'content' | 'marketplace' | 'system';
}

export const ALL_PERMISSIONS: PermissionDef[] = [
  // User management
  { key: 'manage_users', label: 'Manage Users', description: 'View, promote, demote, and remove users', category: 'users' },
  { key: 'manage_admins', label: 'Manage Admins', description: 'Add or remove admin accounts', category: 'users' },
  { key: 'manage_artists', label: 'Manage Artists', description: 'View and manage artist accounts', category: 'users' },
  { key: 'view_credentials', label: 'View Credentials', description: 'Access the plaintext credentials viewer (test mode)', category: 'users' },

  // Content management
  { key: 'manage_subjects', label: 'Manage Subjects', description: 'Create, edit, and delete subjects', category: 'content' },
  { key: 'manage_folders', label: 'Manage Folders', description: 'Create, edit, and delete folders', category: 'content' },
  { key: 'manage_images', label: 'Manage Images', description: 'Upload and delete practical notebook images', category: 'content' },
  { key: 'manage_announcements', label: 'Manage Announcements', description: 'Create and delete platform announcements', category: 'content' },

  // Marketplace
  { key: 'manage_commissions', label: 'Manage Commissions', description: 'View all bookings and set commission percentages', category: 'marketplace' },
  { key: 'manage_hire_requests', label: 'Manage Hire Requests', description: 'Approve or reject public contact form submissions', category: 'marketplace' },

  // System
  { key: 'view_activity_log', label: 'View Activity Log', description: 'Access the real-time activity feed', category: 'system' },
  { key: 'view_stats', label: 'View Stats', description: 'View platform statistics dashboard', category: 'system' },
];

export const PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the list of permission keys for a user.
 * Super admins get ALL permissions. Regular admins get only their assigned ones.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, permissionsJson: true },
    });
    if (!user) return [];
    // Super admins have all permissions
    if (user.role === 'super_admin') return PERMISSION_KEYS;
    // Regular admins get their assigned permissions
    try {
      const parsed = JSON.parse(user.permissionsJson || '[]');
      if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === 'string');
    } catch {
      return [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Check if a user has a specific permission.
 * Super admins always return true. Regular admins check their permissionsJson.
 */
export async function hasPermission(request: Request, permission: string): Promise<boolean> {
  try {
    const payload = await getUserFromRequest(request);
    if (!payload) return false;
    // Super admins have all permissions
    if (payload.role === 'super_admin') return true;
    // Regular admins check their assigned permissions
    const perms = await getUserPermissions(payload.userId);
    return perms.includes(permission);
  } catch {
    return false;
  }
}

/**
 * Require a permission — returns a 403 NextResponse if denied, or null if allowed.
 *
 * Usage:
 *   const denied = await requirePermission(request, 'manage_users');
 *   if (denied) return denied;
 */
export async function requirePermission(
  request: Request,
  permission: string
): Promise<Response | null> {
  const allowed = await hasPermission(request, permission);
  if (allowed) return null;
  return new Response(
    JSON.stringify({ error: `Forbidden — requires permission: ${permission}` }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Parse a permissions array from a JSON string (for the serializer).
 */
export function parsePermissions(permissionsJson: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(permissionsJson || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => typeof p === 'string' && PERMISSION_KEYS.includes(p));
    }
  } catch {
    // ignore
  }
  return [];
}
