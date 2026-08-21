
import { useAuthStore } from '../store/useAuthStore';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_BASE = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

function getToken() {
  return localStorage.getItem('accessToken');
}

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<{ token: string | null; sessionDead: boolean }> | null = null;

async function refreshAccessToken(): Promise<{ token: string | null; sessionDead: boolean }> {
  const refreshToken = localStorage.getItem('refreshToken');
  const accessToken = getToken();
  const userId = accessToken ? getUserIdFromToken(accessToken) : null;
  if (!refreshToken || !userId) return { token: null, sessionDead: true };

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, refreshToken }),
        });
        if (!res.ok) return { token: null, sessionDead: true };
        const data = await res.json();
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          return { token: data.accessToken, sessionDead: false };
        }
        return { token: null, sessionDead: true };
      } catch {
        return { token: null, sessionDead: false };
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection or try again in a moment.');
  }

  if (res.status === 401 && !_retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed.token) return api<T>(path, options, true);
    if (refreshed.sessionDead) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      useAuthStore.getState().logout();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join(', ') : (body.message || `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  me: () => api<any>('/auth/me'),
  register: (data: { companyName: string; email: string; password: string; fullName: string }) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface DashboardSummary {
  widgets: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    pendingApprovals: number;
    openPositions: number;
    activeProjects: number;
  };
  attendanceTrend: { month: string; present: number; absent: number; onLeave: number }[];
  headcountTrend: { month: string; count: number }[];
  departmentMix: { name: string; value: number }[];
  recruitmentPipeline: { applied: number; interview: number; offer: number; hired: number };
  
  // New Phase 3 Fields
  pendingLeaveRequests?: any[];
  leaveStatistics?: { name: string; value: number }[];
  monthlyPayrollCost?: { month: string; cost: number }[];
  attritionRate?: { month: string; rate: number }[];
  genderDistribution?: { name: string; value: number }[];
  recentActivities?: { id: string; title: string; time: string; type: string }[];
  notifications?: { id: string; title: string; type: string; actionUrl?: string }[];
  milestones?: {
    newJoiners: any[];
    anniversaries: any[];
  };
}

export const dashboardApi = {
  summary: () => api<DashboardSummary>('/dashboard/summary'),
};

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  status: string;
  contactInfo?: {
    currentAddress?: string;
    currentCountry?: string;
    currentDistrict?: string;
    currentTaluka?: string;
    currentPost?: string;
    currentPhoneNo?: string;
    currentPersonalEmail?: string;
    currentState?: string;
    currentCity?: string;
    currentVillage?: string;
    currentPostCode?: string;
    currentMobileNo?: string;
    isPermanentSameAsCurrent?: boolean;
    permanentAddress?: string;
    permanentCountry?: string;
    permanentDistrict?: string;
    permanentTaluka?: string;
    permanentPost?: string;
    permanentPhoneNo?: string;
    permanentState?: string;
    permanentCity?: string;
    permanentVillage?: string;
    permanentPostCode?: string;
    permanentMobileNo?: string;
  };
  bankAccount?: string;
  bankIfsc?: string;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;
  roleId?: string | null;
  education?: any;
  experience?: any;
  department?: { name: string; id?: string } | null;
  designation?: { title: string; id?: string } | null;
  manager?: Employee | null;
  joiningDate?: string | null;
  uan?: string | null;
  esic?: string | null;
  pfNumber?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  workingDaysPerWeek?: number;
  ctc?: number;
  salaryStructures?: { basic: number; hra: number; specialAllowance: number; effectiveFrom: string }[];
  
  paymentInfo?: any;
  adminInfo?: any;
  personalInfo?: any;
  familyMembers?: any[];
  emergencyContacts?: any[];
}

export interface LoginStatus {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  hasLogin: boolean;
  isActive: boolean;
  loginEmail: string | null;
  roleName: string | null;
  lastLoginAt: string | null;
  accountCreatedAt: string | null;
}

export const employeesApi = {
  list: (params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.search) qs.set('search', params.search);
    return api<{ items: Employee[]; total: number; page: number; totalPages: number }>(
      `/employees?${qs.toString()}`,
    );
  },
  get: (id: string) => api<Employee>(`/employees/${id}`),
  create: (data: Partial<Employee> & { employeeCode: string; firstName: string; lastName: string; email: string }) =>
    api<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Employee>) => 
    api<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateMyCompliance: (data: { uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }) =>
    api<Employee>('/employees/me/compliance', { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) =>
    api<void>(`/employees/${id}`, { method: 'DELETE' }),
  sendCredentials: (employeeIds: string[]) =>
    api<any>('/employees/send-credentials', { method: 'POST', body: JSON.stringify({ employeeIds }) }),
  bulkCompliance: (items: { employeeId: string; uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }[]) =>
    api<any>('/employees/bulk-compliance', { method: 'POST', body: JSON.stringify({ items }) }),
  importManagers: (items: { employeeCode: string; managerCode?: string; companyEmail?: string }[]) =>
    api<any>('/employees/import-managers', { method: 'POST', body: JSON.stringify({ items }) }),
  loginStatus: () => api<LoginStatus[]>('/employees/login-status'),
  createLogin: (employeeId: string, data?: { password?: string }) =>
    api<{ success: boolean; generatedPassword: string; email: string }>(
      `/employees/${employeeId}/create-login`,
      { method: 'POST', body: JSON.stringify(data || {}) },
    ),
  toggleLogin: (employeeId: string, active: boolean) =>
    api<{ success: boolean; isActive: boolean }>(
      `/employees/${employeeId}/toggle-login`,
      { method: 'PATCH', body: JSON.stringify({ active }) },
    ),
  resetPassword: (employeeId: string, sendEmail?: boolean) =>
    api<{ success: boolean; newPassword: string; email: string }>(
      `/employees/${employeeId}/reset-password`,
      { method: 'POST', body: JSON.stringify({ sendEmail: !!sendEmail }) },
    ),
};

export const attendanceApi = {
  checkIn: (data: { employeeId: string; method: string; lat?: number; lng?: number }) =>
    api<any>('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (logId: string) =>
    api<any>(`/attendance/check-out/${logId}`, { method: 'POST' }),
  manualPunch: (data: { employeeId: string; date: string; time: string; type: 'IN' | 'OUT'; reason: string }) =>
    api<any>('/attendance/manual', { method: 'POST', body: JSON.stringify(data) }),
  list: (employeeId: string, from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return api<any[]>(`/attendance/employee/${employeeId}?${qs.toString()}`);
  },
  listToday: (date?: string) => {
    const qs = new URLSearchParams();
    if (date) qs.set('date', date);
    return api<any[]>(`/attendance/today?${qs.toString()}`);
  },
  listMonthly: (year?: number, month?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    if (month) qs.set('month', String(month));
    return api<any[]>(`/attendance/monthly?${qs.toString()}`);
  },
  listPendingRegularizations: () =>
    api<any[]>('/attendance/regularize/pending'),
  regularize: (logId: string, data: { employeeId: string; requestedCheckIn: string; requestedCheckOut: string; reason: string }) =>
    api<any>(`/attendance/regularize/${logId}`, { method: 'POST', body: JSON.stringify(data) }),
  approveRegularization: (requestId: string) =>
    api<any>(`/attendance/regularize/${requestId}/approve`, { method: 'POST' }),
  rejectRegularization: (requestId: string) =>
    api<any>(`/attendance/regularize/${requestId}/reject`, { method: 'POST' }),
};

export const leaveApi = {
  listTypes: () => api<any[]>('/leave/types'),
  createType: (data: { name: string; paid: boolean; code?: string; accrualRate?: number; annualAllocation?: number; maxConsecutiveDays?: number; halfDayAllowed?: boolean; carryForward?: boolean; carryForwardLimit?: number; encashment?: boolean; negativeBalanceAllowed?: boolean; attachmentRequired?: boolean; applicableAfterDays?: number; approvalRequired?: boolean; gender?: string }) =>
    api<any>('/leave/types', { method: 'POST', body: JSON.stringify(data) }),
  updateType: (id: string, data: Record<string, any>) =>
    api<any>(`/leave/types/${id}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteType: (id: string) =>
    api<any>(`/leave/types/${id}`, { method: 'DELETE' }),
  apply: (data: { employeeId: string; leaveTypeId: string; startDate: string; endDate: string; isHalfDay?: boolean; reason?: string }) =>
    api<any>('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string) => api<any>(`/leave/${id}/approve`, { method: 'POST' }),
  reject: (id: string) => api<any>(`/leave/${id}/reject`, { method: 'POST' }),
  cancel: (id: string) => api<any>(`/leave/${id}/cancel`, { method: 'POST' }),
  listCancellationRequests: () => api<any[]>('/leave/cancellations/pending'),
  approveCancellation: (id: string) => api<any>(`/leave/cancellations/${id}/approve`, { method: 'POST' }),
  rejectCancellation: (id: string) => api<any>(`/leave/cancellations/${id}/reject`, { method: 'POST' }),
  listForEmployee: (employeeId: string) => api<any[]>(`/leave/employee/${employeeId}`),
   balances: (employeeId: string, year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any[]>(`/leave/balances/${employeeId}?${qs.toString()}`);
  },
  listHolidays: () => api<any[]>('/leave/holidays'),
  createHoliday: (data: { name: string; date: string }) =>
    api<any>('/leave/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: string) =>
    api<any>(`/leave/holidays/${id}`, { method: 'DELETE' }),

  balancesOverview: (params: { year?: number; departmentId?: string; leaveTypeId?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params.year) qs.set('year', String(params.year));
    if (params.departmentId) qs.set('departmentId', params.departmentId);
    if (params.leaveTypeId) qs.set('leaveTypeId', params.leaveTypeId);
    if (params.search) qs.set('search', params.search);
    return api<any[]>(`/leave/balances-overview?${qs.toString()}`);
  },
  listAll: (params: { departmentId?: string; status?: string; year?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.departmentId) qs.set('departmentId', params.departmentId);
    if (params.status) qs.set('status', params.status);
    if (params.year) qs.set('year', String(params.year));
    return api<any[]>(`/leave/all?${qs.toString()}`);
  },

  // Phase 4: Enterprise features
  analytics: () => api<any>('/leave/analytics'),
  getPolicies: () => api<any>('/leave/policies'),
  setPolicies: (data: any) => api<any>('/leave/policies', { method: 'POST', body: JSON.stringify(data) }),
  bulkApprove: (ids: string[]) => api<any>('/leave/bulk-approve', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkReject: (ids: string[]) => api<any>('/leave/bulk-reject', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Balance allocation & transactions
  adjustBalance: (data: { employeeId: string; leaveTypeId: string; year: number; amount: number; reason?: string }) =>
    api<any>('/leave/balances/adjust', { method: 'POST', body: JSON.stringify(data) }),
  bulkAllocate: (data: { employeeIds: string[]; leaveTypeId: string; year: number; amount: number; reason?: string }) =>
    api<any>('/leave/balances/bulk-allocate', { method: 'POST', body: JSON.stringify(data) }),
  transactions: (employeeId: string, year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any[]>(`/leave/balances/${employeeId}/transactions?${qs.toString()}`);
  },

  // Leave Year
  listLeaveYears: () => api<any[]>('/leave/years'),
  createLeaveYear: (data: { name: string; startDate: string; endDate: string }) =>
    api<any>('/leave/years', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveYear: (id: string, data: { isActive?: boolean; carryForwardProcessed?: boolean }) =>
    api<any>(`/leave/years/${id}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteLeaveYear: (id: string) =>
    api<any>(`/leave/years/${id}`, { method: 'DELETE' }),

  // Carry Forward
  processCarryForward: (fromYearId: string) =>
    api<any>('/leave/carry-forward', { method: 'POST', body: JSON.stringify({ fromYearId }) }),
};

export const payrollApi = {
  setSalaryStructure: (employeeId: string, data: any) =>
    api<any>(`/payroll/salary-structure/${employeeId}`, { method: 'POST', body: JSON.stringify(data) }),
  getPayslips: (employeeId: string) => api<any[]>(`/payroll/payslips/${employeeId}`),
  getSalaryStructure: (employeeId: string) => api<any>(`/payroll/structure/${employeeId}`),
  getSalaryRevisions: (employeeId: string) =>
    api<any[]>(`/employee-services/salary-revisions/employee/${employeeId}`),
  getAllSalaryRevisions: () =>
    api<any[]>('/employee-services/salary-revisions'),
};

export const recruitmentApi = {
  listJobs: () => api<any[]>('/recruitment/jobs'),
  createJob: (data: { title: string; description?: string }) =>
    api<any>('/recruitment/jobs', { method: 'POST', body: JSON.stringify(data) }),
  addCandidate: (jobId: string, data: { name: string; email?: string; resumeUrl?: string }) =>
    api<any>(`/recruitment/jobs/${jobId}/candidates`, { method: 'POST', body: JSON.stringify(data) }),
  moveStage: (candidateId: string, stage: string) =>
    api<any>(`/recruitment/candidates/${candidateId}/stage`, { method: 'POST', body: JSON.stringify({ stage }) }),
  deleteCandidate: (candidateId: string) =>
    api<any>(`/recruitment/candidates/${candidateId}`, { method: 'DELETE' }),
  scheduleInterview: (candidateId: string, data: { scheduledAt: string; interviewer?: string }) =>
    api<any>(`/recruitment/candidates/${candidateId}/interviews`, { method: 'POST', body: JSON.stringify(data) }),
  listInterviews: () => api<any[]>('/recruitment/interviews'),
  submitFeedback: (interviewId: string, data: { feedback: string; rating: number }) =>
    api<any>(`/recruitment/interviews/${interviewId}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
  createOffer: (candidateId: string, ctc: number) =>
    api<any>(`/recruitment/candidates/${candidateId}/offer`, { method: 'POST', body: JSON.stringify({ ctc }) }),
  evaluateCandidate: (candidateId: string) =>
    api<any>(`/recruitment/candidates/${candidateId}/evaluate`, { method: 'POST' }),
  acceptOffer: (offerId: string) =>
    api<any>(`/recruitment/offers/${offerId}/accept`, { method: 'POST' }),
};

export const performanceApi = {
  listGoals: (employeeId: string) => api<any[]>(`/performance/goals/${employeeId}`),
  createGoal: (employeeId: string, data: { title: string; description?: string; dueDate?: string }) =>
    api<any>(`/performance/goals/${employeeId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateProgress: (goalId: string, progress: number) =>
    api<any>(`/performance/goals/${goalId}/progress`, { method: 'POST', body: JSON.stringify({ progress }) }),
  approveGoal: (goalId: string) => api<any>(`/performance/goals/${goalId}/approve`, { method: 'POST' }),
  rejectGoal: (goalId: string) => api<any>(`/performance/goals/${goalId}/reject`, { method: 'POST' }),
  submitReview: (employeeId: string, data: { cycle: string; type: string; score?: number; comments?: string }) =>
    api<any>(`/performance/reviews/${employeeId}`, { method: 'POST', body: JSON.stringify(data) }),
  listReviews: (employeeId: string) => api<any[]>(`/performance/reviews/${employeeId}`),
  getAggregatedScore: (employeeId: string, cycle?: string) => 
    api<any>(`/performance/reviews/${employeeId}/aggregate${cycle ? `?cycle=${cycle}` : ''}`),
};

export const documentsApi = {
  upload: (data: { employeeId: string; type: string; fileUrl: string }) =>
    api<any>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  listForEmployee: (employeeId: string) => api<any[]>(`/documents/employee/${employeeId}`),
  listAll: () => api<any[]>('/documents/all'),
};

export const assetsApi = {
  list: () => api<any[]>('/assets'),
  create: (data: { type: string; identifier?: string }) =>
    api<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  assign: (id: string, employeeId: string) =>
    api<any>(`/assets/${id}/assign`, { method: 'POST', body: JSON.stringify({ employeeId }) }),
  returnAsset: (id: string, assignmentId: string) =>
    api<any>(`/assets/${id}/return`, { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  remove: (id: string) =>
    api<any>(`/assets/${id}`, { method: 'DELETE' }),
};

export const expensesApi = {
  submit: (data: { employeeId: string; category: string; amount: number; receiptUrl?: string }) =>
    api<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  listForEmployee: (employeeId: string) => api<any[]>(`/expenses/employee/${employeeId}`),
  listForCompany: () => api<any[]>('/expenses/company'),
  approve: (id: string) => api<any>(`/expenses/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'approved' }) }),
  reject: (id: string) => api<any>(`/expenses/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'rejected' }) }),
  updateStatus: (id: string, status: string) =>
    api<any>(`/expenses/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  listLoans: (employeeId: string) => api<any[]>(`/employee-services/loans/mine?employeeId=${employeeId}`),
  applyLoan: (data: any) => api<any>('/employee-services/loans', { method: 'POST', body: JSON.stringify(data) }),
  listCompanyLoans: () => api<any[]>('/employee-services/loans'),
  approveLoan: (id: string) => api<any>(`/employee-services/loans/${id}/approve`, { method: 'POST' }),
  rejectLoan: (id: string) => api<any>(`/employee-services/loans/${id}/reject`, { method: 'POST' }),
  closeLoan: (id: string) => api<any>(`/employee-services/loans/${id}/close`, { method: 'POST' }),
};

export const travelApi = {
  request: (data: { employeeId: string; fromDate: string; toDate: string; purpose?: string; advance?: number }) =>
    api<any>('/travel', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    api<any>(`/travel/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  listForEmployee: (employeeId: string) => api<any[]>(`/travel/employee/${employeeId}`),
  listForCompany: () => api<any[]>('/travel/company'),
};

export const shiftsApi = {
  list: () => api<any[]>('/shifts'),
  create: (data: { name: string; startTime: string; endTime: string; type: string; shiftTypeId?: string }) =>
    api<any>('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  assign: (data: { shiftId: string; employeeId: string; effectiveFrom: string }) =>
    api<any>('/shifts/assign', { method: 'POST', body: JSON.stringify(data) }),
  listAssignments: () => api<any[]>('/shifts/assignments'),
  listHolidays: () => api<any[]>('/shifts/holidays'),
  requestChange: (data: { employeeId: string; shiftId: string; requestedShiftId: string; reason: string; effectiveFrom: string }) =>
    api<any>('/shifts/request-change', { method: 'POST', body: JSON.stringify(data) }),
  listChangeRequests: () => api<any[]>('/shifts/change-requests'),
  approveChangeRequest: (id: string) => api<any>(`/shifts/change-requests/${id}/approve`, { method: 'POST' }),
  rejectChangeRequest: (id: string) => api<any>(`/shifts/change-requests/${id}/reject`, { method: 'POST' }),
  remove: (id: string) =>
    api<any>(`/shifts/${id}`, { method: 'DELETE' }),
  removeAssignment: (id: string) =>
    api<any>(`/shifts/assignments/${id}`, { method: 'DELETE' }),
};

export const shiftTypesApi = {
  list: () => api<any[]>('/shift-types'),
  create: (data: { name: string; defaultStartTime: string; defaultEndTime: string; isFlexible?: boolean; graceMinutes?: number; coreHoursStart?: string; coreHoursEnd?: string; overtimeThresholdMinutes?: number }) =>
    api<any>('/shift-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    api<any>(`/shift-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) =>
    api<any>(`/shift-types/${id}`, { method: 'DELETE' }),
};

export const timesheetsApi = {
  submit: (data: { employeeId: string; date: string; hours: number; projectId?: string }) =>
    api<any>('/timesheets', { method: 'POST', body: JSON.stringify(data) }),
  listForEmployee: (employeeId: string) => api<any[]>(`/timesheets/employee/${employeeId}`),
  approve: (id: string) => api<any>(`/timesheets/${id}/approve`, { method: 'POST' }),
  reject: (id: string) => api<any>(`/timesheets/${id}/reject`, { method: 'POST' }),
};

export const projectsApi = {
  list: () => api<any[]>('/projects'),
  create: (name: string) =>
    api<any>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  addTask: (projectId: string, title: string) =>
    api<any>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateTaskStatus: (taskId: string, status: string) =>
    api<any>(`/projects/tasks/${taskId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
};

export const announcementsApi = {
  list: () => api<any[]>('/announcements'),
  create: (data: { title: string; body: string; category?: string; author?: string; isPinned?: boolean }) =>
    api<any>('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; body?: string; category?: string; isPinned?: boolean; isActive?: boolean }) =>
    api<any>(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<any>(`/announcements/${id}`, { method: 'DELETE' }),
};

export const trainingApi = {
  listCourses: () => api<any[]>('/training/courses'),
  createCourse: (data: { title: string; description?: string }) =>
    api<any>('/training/courses', { method: 'POST', body: JSON.stringify(data) }),
  enroll: (id: string, employeeId: string) =>
    api<any>(`/training/courses/${id}/enroll`, { method: 'POST', body: JSON.stringify({ employeeId }) }),
  updateProgress: (enrollmentId: string, progress: number) =>
    api<any>(`/training/enrollments/${enrollmentId}/progress`, { method: 'POST', body: JSON.stringify({ progress }) }),
};

export const organizationApi = {
  listDepartments: () => api<any[]>('/organization/departments'),
  createDepartment: (name: string) =>
    api<any>('/organization/departments', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteDepartment: (id: string) =>
    api<any>(`/organization/departments/${id}`, { method: 'DELETE' }),
  listBranches: () => api<any[]>('/organization/branches'),
  createBranch: (data: { name: string; address?: string }) =>
    api<any>('/organization/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: { name?: string; address?: string }) =>
    api<any>(`/organization/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBranch: (id: string) =>
    api<any>(`/organization/branches/${id}`, { method: 'DELETE' }),
  listDesignations: () => api<any[]>('/organization/designations'),
  createDesignation: (data: { title: string; grade?: string }) =>
    api<any>('/organization/designations', { method: 'POST', body: JSON.stringify(data) }),
};

export const reportsApi = {
  headcount: () => api<any[]>('/reports/headcount'),
  attrition: (year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any>(`/reports/attrition?${qs.toString()}`);
  },
  payrollCost: (year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any>(`/reports/payroll-cost?${qs.toString()}`);
  },
  payrollCostMonthly: (year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any>(`/reports/payroll-cost-monthly?${qs.toString()}`);
  },
  leaveSummary: (year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any[]>(`/reports/leave-summary?${qs.toString()}`);
  },
};

export const taxApi = {
  getMasterConfig: () => integrationsApi.getConfig('tax-master'),
  saveMasterConfig: (data: any) => integrationsApi.saveConfig('tax-master', data),
  getDeclarations: (employeeId: string) =>
    api<any[]>(`/employee-services/tax-declarations/mine?employeeId=${employeeId}`),
  submitDeclaration: (data: any) =>
    api<any>('/employee-services/tax-declarations', { method: 'POST', body: JSON.stringify(data) }),
  // Derived from real payroll data (payslips + salary structure)
  getForm16: async (employeeId: string) => {
    const [payslips, salaryStructure] = await Promise.all([
      payrollApi.getPayslips(employeeId).catch(() => []),
      payrollApi.getSalaryStructure(employeeId).catch(() => null),
    ]);
    const byYear: Record<string, any[]> = {};
    payslips.forEach((p: any) => {
      const y = p.payrollCycle?.year || new Date(p.generatedAt).getFullYear();
      const key = `FY ${y - 1}-${String(y).slice(2)}`;
      (byYear[key] ||= []).push(p);
    });
    return Object.entries(byYear).map(([financialYear, rows]) => {
      const totalTds = rows.reduce((s, p: any) => s + (p.breakdown?.tdsMonthly || 0), 0);
      const gross = rows.reduce((s, p: any) => s + (p.grossPay || 0), 0);
      const pt = rows.reduce((s, p: any) => s + (p.breakdown?.ptDeduction || 0), 0);
      const ti = Math.max(0, gross - 50000 - pt);
      let taxOnIncome = 0;
      let rem = ti;
      if (rem > 1500000) { taxOnIncome += (rem - 1500000) * 0.30; rem = 1500000; }
      if (rem > 1200000) { taxOnIncome += (rem - 1200000) * 0.20; rem = 1200000; }
      if (rem > 900000) { taxOnIncome += (rem - 900000) * 0.15; rem = 900000; }
      if (rem > 500000) { taxOnIncome += (rem - 500000) * 0.10; rem = 500000; }
      if (rem > 250000) { taxOnIncome += (rem - 250000) * 0.05; rem = 250000; }
      const totalTaxPayable = Math.round(taxOnIncome + taxOnIncome * 0.04);
      const quarters = [1, 2, 3, 4]
        .map((q) => ({
          quarter: `Q${q}`,
          amount: rows
            .filter((p: any) => Math.ceil(((p.payrollCycle?.month || 1) + 1) / 3) === q)
            .reduce((s, p: any) => s + (p.breakdown?.tdsMonthly || 0), 0),
          status: 'deposited',
        }))
        .filter((q) => q.amount > 0);
      return {
        financialYear,
        status: rows.some((r: any) => r.payrollCycle?.status === 'processed') ? 'issued' : 'processing',
        partA: { totalTaxDeducted: totalTds, totalTaxDeposited: totalTds, quarters },
        partB: {
          grossSalary: Math.round(gross),
          standardDeduction: 50000,
          professionalTax: Math.round(pt),
          taxableIncome: ti,
          totalTaxPayable,
          tdsDeducted: totalTds,
          ...(salaryStructure ? { basic: salaryStructure.basic, hra: salaryStructure.hra } : {}),
        },
      };
    });
  },
  getITStatement: async (employeeId: string, year: string) => {
    const [form16s, declarations] = await Promise.all([
      taxApi.getForm16(employeeId),
      taxApi.getDeclarations(employeeId).catch(() => []),
    ]);
    const form16 = form16s.find((f: any) => f.financialYear === year) || form16s[0];
    if (!form16) return null;
    const grossIncome = form16.partB.grossSalary;
    const standardDeduction = 50000;
    const declared = declarations
      .filter((d: any) => d.status === 'approved')
      .reduce((s: number, d: any) => s + (d.approvedAmount || d.declaredAmount || 0), 0);
    const taxableIncome = Math.max(0, grossIncome - standardDeduction - declared);
    // Old regime slabs for FY 2025-26
    const slab = (ti: number) => {
      let tax = 0;
      if (ti > 1500000) { tax += (ti - 1500000) * 0.30; ti = 1500000; }
      if (ti > 1200000) { tax += (ti - 1200000) * 0.20; ti = 1200000; }
      if (ti > 900000) { tax += (ti - 900000) * 0.15; ti = 900000; }
      if (ti > 500000) { tax += (ti - 500000) * 0.10; ti = 500000; }
      if (ti > 250000) { tax += (ti - 250000) * 0.05; ti = 250000; }
      return tax;
    };
    const taxOnIncome = slab(taxableIncome);
    const cess = taxOnIncome * 0.04;
    const totalTaxLiability = Math.round(taxOnIncome + cess);
    const tdsDeducted = form16.partA.totalTaxDeducted;
    return {
      financialYear: `${year} (AY ${year.replace('FY ', '')})`,
      regime: 'old',
      grossIncome,
      standardDeduction,
      totalDeductions: declared,
      taxableIncome,
      taxOnIncome: Math.round(taxOnIncome),
      rebate87A: 0,
      surcharge: 0,
      cess: Math.round(cess),
      totalTaxLiability,
      tdsDeducted,
      selfAssessmentTax: 0,
      refundDue: tdsDeducted - totalTaxLiability,
      income: [
        { label: 'Salary (as per Form 16)', amount: grossIncome },
        { label: 'Less: Standard Deduction', amount: -standardDeduction, sub: true },
        { label: 'Net Salary Income', amount: grossIncome - standardDeduction },
      ],
      deductions: declarations.map((d: any) => ({
        section: d.section,
        description: d.description || 'Declared investment',
        amount: d.approvedAmount || d.declaredAmount || 0,
      })),
      taxSlabs: [
        { slab: '₹0 – ₹2,50,000', rate: 'Nil', tax: 0 },
        { slab: '₹2,50,001 – ₹5,00,000', rate: '5%', tax: Math.max(0, Math.round((Math.min(taxableIncome, 500000) - 250000) * 0.05)) },
        { slab: '₹5,00,001 – ₹10,00,000', rate: '20%', tax: Math.max(0, Math.round((Math.min(taxableIncome, 1000000) - 500000) * 0.20)) },
        { slab: 'Above ₹10,00,000', rate: '30%', tax: Math.max(0, Math.round((taxableIncome - 1000000) * 0.30)) },
      ],
    };
  },
};

export const employeeServicesApi = {
  // Comp Off
  listCompOff: (employeeId: string) => api<any[]>(`/employee-services/comp-off/mine?employeeId=${employeeId}`),
  listCompOffAll: () => api<any[]>('/employee-services/comp-off'),
  createCompOff: (data: { employeeId: string; date: string; reason?: string }) =>
    api<any>('/employee-services/comp-off', { method: 'POST', body: JSON.stringify(data) }),
  approveCompOff: (id: string) => api<any>(`/employee-services/comp-off/${id}/approve`, { method: 'POST' }),
  rejectCompOff: (id: string) => api<any>(`/employee-services/comp-off/${id}/reject`, { method: 'POST' }),
  // Flexible Holidays
  listFlexibleHolidays: (employeeId: string) => api<any[]>(`/employee-services/flexible-holiday/mine?employeeId=${employeeId}`),
  listFlexibleHolidaysAll: () => api<any[]>('/employee-services/flexible-holiday'),
  createFlexibleHoliday: (data: { employeeId: string; date: string; reason?: string }) =>
    api<any>('/employee-services/flexible-holiday', { method: 'POST', body: JSON.stringify(data) }),
  approveFlexibleHoliday: (id: string) => api<any>(`/employee-services/flexible-holiday/${id}/approve`, { method: 'POST' }),
  rejectFlexibleHoliday: (id: string) => api<any>(`/employee-services/flexible-holiday/${id}/reject`, { method: 'POST' }),
  // Overtime
  listOvertime: (employeeId: string) => api<any[]>(`/employee-services/overtime/mine?employeeId=${employeeId}`),
  listOvertimeAll: () => api<any[]>('/employee-services/overtime'),
  createOvertime: (data: { employeeId: string; date: string; hours: number; reason?: string }) =>
    api<any>('/employee-services/overtime', { method: 'POST', body: JSON.stringify(data) }),
  approveOvertime: (id: string) => api<any>(`/employee-services/overtime/${id}/approve`, { method: 'POST' }),
  rejectOvertime: (id: string) => api<any>(`/employee-services/overtime/${id}/reject`, { method: 'POST' }),
  // Optional Holidays
  listOptionalHolidays: (employeeId: string) => api<any[]>(`/employee-services/optional-holiday/mine?employeeId=${employeeId}`),
  listOptionalHolidaysAll: () => api<any[]>('/employee-services/optional-holiday'),
  createOptionalHoliday: (data: { employeeId: string; date: string; holidayName?: string; reason?: string }) =>
    api<any>('/employee-services/optional-holiday', { method: 'POST', body: JSON.stringify(data) }),
  approveOptionalHoliday: (id: string) => api<any>(`/employee-services/optional-holiday/${id}/approve`, { method: 'POST' }),
  rejectOptionalHoliday: (id: string) => api<any>(`/employee-services/optional-holiday/${id}/reject`, { method: 'POST' }),
  // Loans / Advances
  listLoansAll: () => api<any[]>('/employee-services/loans'),
  approveLoan: (id: string) => api<any>(`/employee-services/loans/${id}/approve`, { method: 'POST' }),
  rejectLoan: (id: string) => api<any>(`/employee-services/loans/${id}/reject`, { method: 'POST' }),
  closeLoan: (id: string) => api<any>(`/employee-services/loans/${id}/close`, { method: 'POST' }),
  // Salary Revisions
  listSalaryRevisionsAll: () => api<any[]>('/employee-services/salary-revisions'),
  createSalaryRevision: (data: any) =>
    api<any>('/employee-services/salary-revisions', { method: 'POST', body: JSON.stringify(data) }),
  // Tax Declarations
  listTaxDeclarationsAll: () => api<any[]>('/employee-services/tax-declarations'),
  approveTaxDeclaration: (id: string, approvedAmount?: number) =>
    api<any>(`/employee-services/tax-declarations/${id}/approve`, { method: 'POST', body: JSON.stringify({ approvedAmount }) }),
  rejectTaxDeclaration: (id: string) =>
    api<any>(`/employee-services/tax-declarations/${id}/reject`, { method: 'POST' }),
};

export const settingsApi = {
  getProfile: () => api<any>('/settings/company'),
  updateProfile: (data: any) =>
    api<any>('/settings/company', { method: 'PATCH', body: JSON.stringify(data) }),
  listRoles: () => api<any[]>('/settings/roles'),
  createRole: (data: { name: string; permissions: { module: string; action: string }[] }) =>
    api<any>('/settings/roles', { method: 'POST', body: JSON.stringify(data) }),
};

export const configApi = {
  list: () => api<any[]>('/settings/config'),
  upsert: (key: string, value: unknown) =>
    api<any>(`/settings/config/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
};

export const billingApi = {
  getSubscription: () => api<any>('/billing/subscription'),
  listInvoices: () => api<any[]>('/billing/invoices'),
  upgradePlan: (planName: string) =>
    api<any>('/billing/upgrade', { method: 'POST', body: JSON.stringify({ planName }) }),
};

export const integrationsApi = {
  list: () => api<any[]>('/integrations'),
  connect: (data: { provider: string; config?: any }) =>
    api<any>('/integrations', { method: 'POST', body: JSON.stringify(data) }),
  disconnect: (id: string) =>
    api<any>(`/integrations/${id}/disconnect`, { method: 'POST' }),
  getConfig: (provider: string) => api<any>(`/integrations/config/${provider}`),
  saveConfig: (provider: string, data: any) =>
    api<any>(`/integrations/config/${provider}`, { method: 'POST', body: JSON.stringify(data) }),
};

export const superAdminApi = {
  listTenants: () => api<any[]>('/super-admin/tenants'),
  health: () => api<any>('/super-admin/health'),
  auditLogs: (companyId?: string) => {
    const qs = new URLSearchParams();
    if (companyId) qs.set('companyId', companyId);
    return api<any[]>(`/super-admin/audit-logs?${qs.toString()}`);
  },
};

export const fnfApi = {
  initiate: (data: { employeeId: string; lastWorkingDay: string; noticePeriodDays?: number }) =>
    api<any>('/fnf/initiate', { method: 'POST', body: JSON.stringify(data) }),
  list: () => api<any[]>('/fnf/list'),
  get: (employeeId: string) => api<any>(`/fnf/${employeeId}`),
  approve: (id: string) => api<any>(`/fnf/${id}/approve`, { method: 'POST' }),
  updateOverrides: (id: string, data: any) =>
    api<any>(`/fnf/${id}/overrides`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const exitApi = {
  initiate: (data: { employeeId: string; resignationDate: string; lastWorkingDay: string; reason?: string }) =>
    api<any>('/exit/initiate', { method: 'POST', body: JSON.stringify(data) }),
  list: () => api<any[]>('/exit/list'),
  get: (employeeId: string) => api<any>(`/exit/${employeeId}`),
  completeChecklist: (id: string) => api<any>(`/exit/checklist/${id}/complete`, { method: 'POST' }),
  uncompleteChecklist: (id: string) => api<any>(`/exit/checklist/${id}/uncomplete`, { method: 'POST' }),
  saveInterview: (id: string, note: string) =>
    api<any>(`/exit/${id}/interview`, { method: 'POST', body: JSON.stringify({ note }) }),
  advance: (id: string, status: string) =>
    api<any>(`/exit/${id}/advance`, { method: 'POST', body: JSON.stringify({ status }) }),
};

// Enhanced attendance API
export const attendanceApiExt = {
  setGeofence: (data: { lat: number; lng: number; radius: number }) =>
    api<any>('/attendance/geofence', { method: 'POST', body: JSON.stringify(data) }),
  getGeofence: () => api<any>('/attendance/geofence'),
  getMonthlySummary: (employeeId: string, year?: number, month?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    if (month) qs.set('month', String(month));
    return api<any>(`/attendance/summary/${employeeId}?${qs.toString()}`);
  },
  regularize: (logId: string, note: string) =>
    api<any>(`/attendance/regularize/${logId}`, { method: 'POST', body: JSON.stringify({ note }) }),
  approveRegularization: (logId: string, status: string) =>
    api<any>(`/attendance/regularize/${logId}/approve`, { method: 'POST', body: JSON.stringify({ status }) }),
};

// Enhanced payroll API
export const payrollApiExt = {
  listCycles: () => api<any[]>('/payroll/cycles'),
  lockCycle: (id: string) => api<any>(`/payroll/cycles/${id}/lock`, { method: 'POST' }),
  getPayslipDetail: (id: string) => api<any>(`/payroll/payslip/${id}`),
  taxPreview: (data: any) => api<any>('/payroll/tax-preview', { method: 'POST', body: JSON.stringify(data) }),
  runPayroll: (data: { month: number; year: number; regime?: string }) =>
    api<any>('/payroll/run', { method: 'POST', body: JSON.stringify(data) }),
  
  getAttendanceSummary: (month: number, year: number) => api<any[]>(`/payroll/attendance-summary?month=${month}&year=${year}`),
  getPayouts: (month: number, year: number) => api<any[]>(`/payroll/payouts?month=${month}&year=${year}`),
  addPayout: (data: any) => api<any>('/payroll/payouts', { method: 'POST', body: JSON.stringify(data) }),
  deletePayout: (id: string) => api<any>(`/payroll/payouts/${id}`, { method: 'DELETE' }),
  getCyclePayslips: (cycleId: string) => api<any[]>(`/payroll/cycles/${cycleId}/payslips`),
  sendPayslips: (cycleId: string) => api<any>(`/payroll/cycles/${cycleId}/send-payslips`, { method: 'POST' }),
};

export const helpdeskApi = {
  list: () => api<any[]>('/helpdesk'),
  mine: () => api<any[]>('/helpdesk/mine'),
  create: (data: { subject: string; description: string; priority: string; category: string; ratings?: any }) =>
    api<any>('/helpdesk', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    api<any>(`/helpdesk/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const performanceSetupApi = {
  list: (kind: string) => api<any[]>(`/performance-setup/${kind}`),
  create: (kind: string, data: any) =>
    api<any>(`/performance-setup/${kind}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (kind: string, id: string, data: any) =>
    api<any>(`/performance-setup/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (kind: string, id: string) =>
    api<any>(`/performance-setup/${kind}/${id}`, { method: 'DELETE' }),
};

export const complianceSetupApi = {
  list: (kind: string) => api<any[]>(`/compliance-setup/${kind}`),
  create: (kind: string, data: any) =>
    api<any>(`/compliance-setup/${kind}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (kind: string, id: string, data: any) =>
    api<any>(`/compliance-setup/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (kind: string, id: string) =>
    api<any>(`/compliance-setup/${kind}/${id}`, { method: 'DELETE' }),
};

export const taxSetupApi = {
  list: (kind: string) => api<any[]>(`/tax-setup/${kind}`),
  create: (kind: string, data: any) =>
    api<any>(`/tax-setup/${kind}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (kind: string, id: string, data: any) =>
    api<any>(`/tax-setup/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (kind: string, id: string) =>
    api<any>(`/tax-setup/${kind}/${id}`, { method: 'DELETE' }),
};

export const attendancePolicyApi = {
  list: () => api<any[]>('/attendance-policy'),
  upsert: (key: string, value: string) =>
    api<any>('/attendance-policy', { method: 'POST', body: JSON.stringify({ key, value }) }),
  remove: (key: string) => api<any>(`/attendance-policy/${key}`, { method: 'DELETE' }),
};

export const orgMastersApi = {
  list: (kind: 'masters' | 'import' | 'forms') => api<any[]>(`/org-masters/${kind}`),
  create: (kind: 'masters' | 'import' | 'forms', data: any) =>
    api<any>(`/org-masters/${kind}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (kind: 'masters' | 'import' | 'forms', id: string, data: any) =>
    api<any>(`/org-masters/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (kind: 'masters' | 'import' | 'forms', id: string) =>
    api<any>(`/org-masters/${kind}/${id}`, { method: 'DELETE' }),
};


