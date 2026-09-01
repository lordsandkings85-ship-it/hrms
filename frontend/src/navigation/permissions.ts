/**
 * Role-based Permissions & Access Control
 * Defines what each role can and cannot access.
 */

export type AppRole = 'super_admin' | 'admin' | 'hr' | 'hr_manager' | 'employee';

/** Routes that require at least admin/hr level access */
export const ADMIN_ONLY_ROUTES: string[] = [
  '/organization',
  '/settings',
  '/billing',
  '/integrations',
  '/super-admin',
  '/compliance',
  '/reports',
];

/** Routes accessible to all authenticated users */
export const PUBLIC_AUTHENTICATED_ROUTES: string[] = [
  '/dashboard',
  '/employees/me',
  '/employees/directory',
  '/attendance',
  '/leave',
  '/payroll',
  '/helpdesk',
  '/announcements',
  '/about',
];

/** Determine if a role has admin-level access */
export function isAdminRole(roleName?: string, isSuperAdmin?: boolean): boolean {
  if (isSuperAdmin) return true;
  if (!roleName) return false;
  const lower = roleName.toLowerCase();
  return (
    lower.includes('admin') ||
    lower.includes('hr') ||
    lower.includes('human resource') ||
    lower.includes('manager')
  );
}

/** Determine if user is a global/system super-admin */
export function isSuperAdminRole(isSuperAdmin?: boolean, isSystem?: boolean): boolean {
  return !!(isSuperAdmin || isSystem);
}
