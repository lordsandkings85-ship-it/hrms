import type { Notification } from '../api/client';
import type { UserProfile } from '../store/useAuthStore';

/**
 * Resolves the destination route when a user clicks on a notification,
 * taking into account the user's role (Employee vs Admin/HR/Manager) and
 * the notification's type, audience, and content.
 */
export function getNotificationTargetUrl(notif: Notification, user?: UserProfile | null): string {
  const roleName = user?.role?.name?.toLowerCase() || '';
  const isSuperAdmin = !!user?.isSuperAdmin;
  const isSystem = !!user?.role?.isSystem;
  const isAdminOrHr =
    isSuperAdmin ||
    isSystem ||
    roleName.includes('admin') ||
    roleName.includes('hr') ||
    roleName.includes('human resource');
  const canApprove = !!user?.canApproveApproval || isAdminOrHr || roleName.includes('manager');

  const refType = (notif.referenceType || '').toUpperCase();
  const type = (notif.type || '').toUpperCase();
  const audience = (notif.audience || '').toUpperCase();
  const id = notif.id || '';
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();
  const text = `${title} ${message}`;

  // Synthetic dashboard notifications
  if (id === 'reg-alert') return '/attendance/regularization';
  if (id === 'leave-approval-alert') return '/approvals/leave';
  if (id.startsWith('jobs-info') || type.includes('RECRUIT') || refType.includes('JOB') || text.includes('job opening')) {
    return '/recruitment';
  }

  // Security alerts (restricted to Admins)
  if (refType === 'SECURITY_EVENT' || type === 'SECURITY_ALERT' || type === 'SECURITY_EVENT' || text.includes('security alert')) {
    return isAdminOrHr ? '/security' : '/dashboard';
  }

  // Announcements and Milestones (Birthday, Work Anniversary)
  if (
    refType === 'ANNOUNCEMENT' ||
    type === 'ANNOUNCEMENT' ||
    refType === 'EMPLOYEE' ||
    text.includes('announcement') ||
    text.includes('birthday') ||
    text.includes('anniversary')
  ) {
    return isAdminOrHr ? '/announcements' : '/announcements/company';
  }

  // Permission Requests & Decisions
  if (refType === 'PERMISSION_REQUEST' || type === 'PERMISSION' || text.includes('permission')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/attendance/permission-approval';
    }
    return '/attendance/permission';
  }

  // Attendance Regularization Requests & Decisions
  if (refType === 'REGULARIZATION_REQUEST' || type === 'REGULARIZATION' || text.includes('regularization')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/attendance/regularization';
    }
    return '/attendance/my';
  }

  // Attendance Correction Requests
  if (refType === 'CORRECTION_REQUEST' || type === 'CORRECTION' || text.includes('correction')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/attendance/correction';
    }
    return '/attendance/my';
  }

  // Leave Requests & Decisions
  if (refType === 'LEAVE_REQUEST' || refType === 'LEAVE' || type === 'LEAVE' || text.includes('leave')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      (text.includes('pending') || text.includes('applied') || text.includes('approval') || text.includes('requested'));
    if (isApprovalNotice) {
      return '/approvals/leave';
    }
    return '/leave';
  }

  // Comp-off Requests
  if (refType === 'COMPOFF' || type === 'COMPOFF' || text.includes('comp off') || text.includes('compoff')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/approvals/compoff';
    }
    return '/leave';
  }

  // Overtime Requests
  if (refType === 'OVERTIME' || type === 'OVERTIME' || text.includes('overtime')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/approvals/overtime';
    }
    return '/attendance/overtime';
  }

  // Travel Claims
  if (refType === 'TRAVEL' || type === 'TRAVEL' || text.includes('travel')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/approvals/travel';
    }
    return '/travel';
  }

  // Loans & Advances
  if (refType === 'LOAN' || type === 'LOAN' || text.includes('loan')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/approvals/loan';
    }
    return '/payroll';
  }
  if (refType === 'ADVANCE' || type === 'ADVANCE' || text.includes('advance')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/approvals/advance';
    }
    return '/payroll';
  }

  // Shift Change
  if (refType === 'SHIFT' || type === 'SHIFT' || text.includes('shift')) {
    const isApprovalNotice = (audience === 'HR' || audience === 'MANAGER' || canApprove) &&
      !audience.includes('PERSONAL') &&
      !text.includes('approved') &&
      !text.includes('rejected');
    if (isApprovalNotice) {
      return '/approvals/shift';
    }
    return '/shifts';
  }

  // Resignation / Exit
  if (refType === 'RESIGNATION' || refType === 'EXIT' || type === 'EXIT' || text.includes('resignation') || text.includes('exit')) {
    return '/exit';
  }

  // Helpdesk
  if (refType === 'HELPDESK' || type === 'HELPDESK' || text.includes('ticket')) {
    return '/helpdesk';
  }

  return '/dashboard';
}

