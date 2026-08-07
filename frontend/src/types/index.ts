/**
 * Shared TypeScript Interfaces for the HRMS Application
 */

// ── Auth & Users ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  isSuperAdmin?: boolean;
  role?: Role;
  employee?: Employee;
}

export interface Role {
  id: string;
  name: string;
  isSystem?: boolean;
}

// ── Employee ──────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
  email?: string;
  phone?: string;
  joiningDate?: string;
  status?: 'active' | 'inactive' | 'on_notice' | 'resigned' | 'separated';
  branch?: Branch;
  department?: Department;
  designation?: Designation;
  grade?: Grade;
  reportingManager?: Partial<Employee>;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  title: string;
}

export interface Grade {
  id: string;
  name: string;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export interface AttendanceLog {
  id: string;
  employeeId: string;
  checkInTime: string;
  checkOutTime?: string;
  method?: 'WEB' | 'MOBILE' | 'BIOMETRIC' | 'MANUAL';
  date?: string;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  totalWorkingDays: number;
  totalWorkedHours: number;
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export interface LeaveRequest {
  id: string;
  employee?: Partial<Employee>;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code?: string;
}

export interface LeaveBalance {
  id: string;
  leaveType?: LeaveType;
  balance: number;
  used: number;
  total: number;
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export interface Payslip {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  grossPay: number;
  netPay: number;
  deductions: number;
  status: 'draft' | 'processed' | 'paid';
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: number;
  hra?: number;
  specialAllowance?: number;
  effectiveDate: string;
}

// ── Recruitment ───────────────────────────────────────────────────────────────

export interface JobRequisition {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'closed' | 'on_hold';
  candidates?: Candidate[];
  createdAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  resume?: string;
  status: string;
  jobId?: string;
}

export interface Interview {
  id: string;
  candidate?: Partial<Candidate>;
  job?: Partial<JobRequisition>;
  scheduledAt: string;
  interviewers?: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: string;
}

// ── Performance ───────────────────────────────────────────────────────────────

export interface KPI {
  id: string;
  name: string;
  target: number;
  achieved?: number;
  unit?: string;
}

export interface Appraisal {
  id: string;
  employeeId: string;
  period: string;
  score?: number;
  status: 'draft' | 'submitted' | 'reviewed' | 'finalized';
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
