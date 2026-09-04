/**
 * Shared "approver / HR" principal.
 *
 * Company-wide approval alerts (regularization pending, leave approvals,
 * job openings) and HR-audience notifications must ONLY be visible to users
 * who can actually approve those workflows. A user qualifies as an approver
 * iff they are a system/super admin OR their role holds an explicit approval
 * permission for the relevant module.
 *
 * IMPORTANT: we intentionally do NOT treat "has any permission grant" or a
 * matching role *name* as approver status — an employee whose role happens to
 * hold a stray grant (e.g. project:view) or whose title is "Office Manager"
 * is NOT an approver and must not see company-wide approval feeds.
 */

/** A role's grant rows as stored in the Permission table. */
export interface GrantLike {
  module: string;
  action: string;
}

export interface ApproverContextLike {
  isSuperAdmin?: boolean;
  roleIsSystem?: boolean;
}

/** Modules/actions that grant the capability to approve HR workflows. */
const APPROVE_PERMISSIONS: Array<{ module: string; action: string }> = [
  { module: 'leave', action: 'approve' },
  { module: 'attendance', action: 'approve' },
];

const hasGrant = (grants: GrantLike[], module: string, action: string): boolean =>
  grants.some(
    (g) =>
      (g.module === 'ALL' && g.action === 'ALL') ||
      (g.module === module && (g.action === action || g.action === 'ALL')),
  );

/**
 * True when this user/role is a genuine approver for the purpose of seeing
 * company-wide approval alerts and HR-audience notifications.
 */
export function isApprover(
  ctx: ApproverContextLike,
  grants: GrantLike[],
): boolean {
  if (ctx.isSuperAdmin || ctx.roleIsSystem) return true;
  return APPROVE_PERMISSIONS.some((p) => hasGrant(grants, p.module, p.action));
}
