/**
 * Application-wide Constants
 */

// ── Pagination ────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ── Date / Time ───────────────────────────────────────────────────────────────

export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const MONTH_YEAR_FORMAT = 'MMMM YYYY';

// ── Leave Types ───────────────────────────────────────────────────────────────

export const LEAVE_STATUS = {
  PENDING:   'pending',
  APPROVED:  'approved',
  REJECTED:  'rejected',
  CANCELLED: 'cancelled',
} as const;

// ── Employee Status ───────────────────────────────────────────────────────────

export const EMPLOYEE_STATUS = {
  ACTIVE:    'active',
  INACTIVE:  'inactive',
  ON_NOTICE: 'on_notice',
  RESIGNED:  'resigned',
  SEPARATED: 'separated',
} as const;

// ── Payroll Status ────────────────────────────────────────────────────────────

export const PAYROLL_STATUS = {
  DRAFT:     'draft',
  PROCESSED: 'processed',
  PAID:      'paid',
} as const;

// ── Attendance Methods ────────────────────────────────────────────────────────

export const ATTENDANCE_METHODS = {
  WEB:       'WEB',
  MOBILE:    'MOBILE',
  BIOMETRIC: 'BIOMETRIC',
  MANUAL:    'MANUAL',
} as const;

// ── Roles ─────────────────────────────────────────────────────────────────────

export const ROLE_KEYWORDS = {
  ADMIN: ['admin', 'administrator'],
  HR:    ['hr', 'human resource', 'hrd'],
  MANAGER: ['manager', 'lead', 'head'],
} as const;

// ── App Metadata ──────────────────────────────────────────────────────────────

export const APP_NAME = 'Workora HRMS';
export const APP_VERSION = '2.0.0';
export const APP_DESCRIPTION = 'Enterprise Human Resource Management System';
