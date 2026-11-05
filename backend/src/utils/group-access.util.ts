import { PrismaService } from '../prisma/prisma.service';

const WILDCARD = new Set(['ALL', '*']);
const GROUP_WIDE_ACTION = 'manage_all';

/**
 * Determines whether a user may act across every company in the group.
 *
 * Access is granted ONLY by an explicit database signal:
 *  - `User.isSuperAdmin`, or
 *  - a wildcard permission (`module` and `action` both `ALL`/`*`), or
 *  - an explicit `organization:manage_all` grant.
 *
 * It is never inferred from an e-mail address, a role display name or
 * `role.isSystem`. Those values are mutable and overloaded, and deriving
 * tenant bypass from them granted cross-tenant access to any role whose name
 * happened to contain "admin", "group" or "hr admin".
 *
 * To give a role group-wide reach, grant it `organization:manage_all` through
 * the permissions UI — the change is then auditable and revocable.
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

  return (user.role?.permissions ?? []).some((permission) => {
    const module = permission.module;
    const action = permission.action;
    if (WILDCARD.has(module) && WILDCARD.has(action)) return true;
    return module === 'organization' && (action === GROUP_WIDE_ACTION || WILDCARD.has(action));
  });
}
