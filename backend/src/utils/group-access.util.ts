import { PrismaService } from '../prisma/prisma.service';

/**
 * Determines whether a user has group-wide administrative privileges across
 * all entities under the Lords and Kings corporate group.
 */
export async function isGroupWideUser(prisma: PrismaService, userId?: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (
    user.email === '2018@lordsandkings.co' ||
    user.email === 'hr@lordsandkings.co' ||
    user.email === 'admin@acme.com'
  ) {
    return true;
  }
  if (user.role?.isSystem) return true;
  const roleName = user.role?.name?.toLowerCase() || '';
  if (
    roleName.includes('super admin') ||
    roleName.includes('admin') ||
    roleName.includes('group') ||
    roleName.includes('hr admin')
  ) {
    return true;
  }
  return (
    user.role?.permissions?.some(
      (p) =>
        (p.permission.module === 'ALL' ||
          p.permission.module === '*' ||
          p.permission.module === 'companies' ||
          p.permission.module === 'company' ||
          p.permission.module === 'organization' ||
          p.permission.module === 'dashboard' ||
          p.permission.module === 'employees' ||
          p.permission.module === 'attendance' ||
          p.permission.module === 'leave' ||
          p.permission.module === 'payroll') &&
        (p.permission.action === 'ALL' ||
          p.permission.action === '*' ||
          p.permission.action === 'view' ||
          p.permission.action === 'manage' ||
          p.permission.action === 'edit' ||
          p.permission.action === 'approve')
    ) || false
  );
}
