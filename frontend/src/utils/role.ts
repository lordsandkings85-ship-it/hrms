import type { UserProfile } from '../store/useAuthStore';

export function isStaffUser(user: UserProfile | null): boolean {
  if (!user) return true;
  if (user.isSuperAdmin) return false;
  if (user.role?.isSystem) return false;
  const roleName = (user.role?.name ?? '').toLowerCase();
  return !['admin', 'hr', 'human resource', 'manager'].some((k) => roleName.includes(k));
}

export function isAdminOrHr(user: UserProfile | null): boolean {
  return !isStaffUser(user);
}

export function isHrOnly(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin || user.role?.isSystem) return false;
  const roleName = (user.role?.name ?? '').toLowerCase();
  return roleName.includes('hr') || roleName.includes('human resource') || roleName.includes('manager');
}
