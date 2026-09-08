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
          permissions: true,
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
        (p.module === 'ALL' ||
          p.module === '*' ||
          p.module === 'companies' ||
          p.module === 'company' ||
          p.module === 'organization' ||
          p.module === 'dashboard' ||
          p.module === 'employees' ||
          p.module === 'attendance' ||
          p.module === 'leave' ||
          p.module === 'payroll') &&
        (p.action === 'ALL' ||
          p.action === '*' ||
          p.action === 'view' ||
          p.action === 'manage' ||
          p.action === 'edit' ||
          p.action === 'approve')
    ) || false
  );
}
