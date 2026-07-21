
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('accessToken');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
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
  lastName: string;
  email: string;
  status: string;
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
}

export const employeesApi = {
  list: (params: { page?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
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
};

export const attendanceApi = {
  checkIn: (data: { employeeId: string; method: string; lat?: number; lng?: number }) =>
    api<any>('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (logId: string) =>
    api<any>(`/attendance/check-out/${logId}`, { method: 'POST' }),
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
};

export const leaveApi = {
  listTypes: () => api<any[]>('/leave/types'),
  createType: (data: { name: string; paid: boolean }) =>
    api<any>('/leave/types', { method: 'POST', body: JSON.stringify(data) }),
  apply: (data: { employeeId: string; leaveTypeId: string; startDate: string; endDate: string; isHalfDay?: boolean; reason?: string }) =>
    api<any>('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string) => api<any>(`/leave/${id}/approve`, { method: 'POST' }),
  reject: (id: string) => api<any>(`/leave/${id}/reject`, { method: 'POST' }),
  listForEmployee: (employeeId: string) => api<any[]>(`/leave/employee/${employeeId}`),
  listPending: () => api<any[]>('/leave/pending'),
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
};

export const payrollApi = {
  setSalaryStructure: (employeeId: string, data: any) =>
    api<any>(`/payroll/salary-structure/${employeeId}`, { method: 'POST', body: JSON.stringify(data) }),
  getSalaryStructure: (employeeId: string) =>
    api<any>(`/payroll/salary-structure/${employeeId}`),
  runPayroll: (data: { month: number; year: number }) =>
    api<any>('/payroll/run', { method: 'POST', body: JSON.stringify(data) }),
  getPayslips: (employeeId: string) =>
    api<any[]>(`/payroll/payslips/${employeeId}`),
};

export const recruitmentApi = {
  listJobs: () => api<any[]>('/recruitment/jobs'),
  createJob: (data: { title: string; description?: string }) =>
    api<any>('/recruitment/jobs', { method: 'POST', body: JSON.stringify(data) }),
  addCandidate: (jobId: string, data: { name: string; email: string; resumeUrl?: string }) =>
    api<any>(`/recruitment/jobs/${jobId}/candidates`, { method: 'POST', body: JSON.stringify(data) }),
  moveStage: (candidateId: string, stage: string) =>
    api<any>(`/recruitment/candidates/${candidateId}/stage`, { method: 'POST', body: JSON.stringify({ stage }) }),
  scheduleInterview: (candidateId: string, data: { scheduledAt: string; interviewer?: string }) =>
    api<any>(`/recruitment/candidates/${candidateId}/interviews`, { method: 'POST', body: JSON.stringify(data) }),
  submitFeedback: (interviewId: string, data: { feedback: string; rating: number }) =>
    api<any>(`/recruitment/interviews/${interviewId}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
  createOffer: (candidateId: string, ctc: number) =>
    api<any>(`/recruitment/candidates/${candidateId}/offer`, { method: 'POST', body: JSON.stringify({ ctc }) }),
};

export const performanceApi = {
  listGoals: (employeeId: string) => api<any[]>(`/performance/goals/${employeeId}`),
  createGoal: (employeeId: string, data: { title: string; description?: string; dueDate?: string }) =>
    api<any>(`/performance/goals/${employeeId}`, { method: 'POST', body: JSON.stringify(data) }),
  updateProgress: (goalId: string, progress: number) =>
    api<any>(`/performance/goals/${goalId}/progress`, { method: 'POST', body: JSON.stringify({ progress }) }),
  submitReview: (employeeId: string, data: { cycle: string; type: string; score?: number; comments?: string }) =>
    api<any>(`/performance/reviews/${employeeId}`, { method: 'POST', body: JSON.stringify(data) }),
  listReviews: (employeeId: string) => api<any[]>(`/performance/reviews/${employeeId}`),
};

export const documentsApi = {
  upload: (data: { employeeId: string; type: string; fileUrl: string }) =>
    api<any>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  listForEmployee: (employeeId: string) => api<any[]>(`/documents/employee/${employeeId}`),
};

export const assetsApi = {
  list: () => api<any[]>('/assets'),
  create: (data: { type: string; identifier?: string }) =>
    api<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  assign: (id: string, employeeId: string) =>
    api<any>(`/assets/${id}/assign`, { method: 'POST', body: JSON.stringify({ employeeId }) }),
  returnAsset: (id: string, assignmentId: string) =>
    api<any>(`/assets/${id}/return`, { method: 'POST', body: JSON.stringify({ assignmentId }) }),
};

export const expensesApi = {
  submit: (data: { employeeId: string; category: string; amount: number; receiptUrl?: string }) =>
    api<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  listForEmployee: (employeeId: string) => api<any[]>(`/expenses/employee/${employeeId}`),
  updateStatus: (id: string, status: string) =>
    api<any>(`/expenses/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
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
  create: (data: { name: string; startTime: string; endTime: string; type: string }) =>
    api<any>('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  assign: (data: { shiftId: string; employeeId: string; effectiveFrom: string }) =>
    api<any>('/shifts/assign', { method: 'POST', body: JSON.stringify(data) }),
  listHolidays: () => api<any[]>('/shifts/holidays'),
  addHoliday: (data: { name: string; date: string }) =>
    api<any>('/shifts/holidays', { method: 'POST', body: JSON.stringify(data) }),
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
  create: (data: { title: string; body: string }) =>
    api<any>('/announcements', { method: 'POST', body: JSON.stringify(data) }),
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
  leaveSummary: (year?: number) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', String(year));
    return api<any[]>(`/reports/leave-summary?${qs.toString()}`);
  },
};

export const settingsApi = {
  getProfile: () => api<any>('/settings/company'),
  updateProfile: (data: any) =>
    api<any>('/settings/company', { method: 'PATCH', body: JSON.stringify(data) }),
  listRoles: () => api<any[]>('/settings/roles'),
  createRole: (data: { name: string; permissions: { module: string; action: string }[] }) =>
    api<any>('/settings/roles', { method: 'POST', body: JSON.stringify(data) }),
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
};

export const helpdeskApi = {
  list: () => api<any[]>('/helpdesk'),
  create: (data: { subject: string; description: string; priority: string; category: string }) =>
    api<any>('/helpdesk', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    api<any>(`/helpdesk/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
