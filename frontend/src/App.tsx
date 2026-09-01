import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './app/layouts/Layout';
import { useAuthStore } from './store/useAuthStore';
import { authApi } from './api/client';
import { FullPageSpinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { isAdminRole, isSuperAdminRole } from './navigation/permissions';

// ── Lazy route imports (code splitting per page) ─────────────────
const LoginPage           = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage       = lazy(() => import('./pages/employee/DashboardPage'));
const MyProfilePage       = lazy(() => import('./pages/employee/profile/MyProfilePage'));

const DocumentsPage       = lazy(() => import('./pages/employee/documents/MyDocumentsPage'));
const TimesheetsPage      = lazy(() => import('./pages/employee/attendance/TimesheetsPage'));
const AnnouncementsPage   = lazy(() => import('./pages/employee/announcements/AnnouncementsPage'));
const TrainingPage        = lazy(() => import('./pages/employee/performance/TrainingPage'));

// ── Tax Pages ─────────────────────────────────────────────────────
const TaxMasterPage          = lazy(() => import('./pages/hr/tax/TaxMasterPage'));
const TaxDeclarationsPage    = lazy(() => import('./pages/hr/tax/TaxDeclarationsPage'));
const TaxDeclarationsApprovalPage = lazy(() => import('./pages/hr/tax/TaxDeclarationsApprovalPage'));
const TaxCalculatorPage      = lazy(() => import('./pages/hr/tax/TaxCalculatorPage'));

// ── Attendance Pages ──────────────────────────────────────────────
const DailyAttendancePage    = lazy(() => import('./pages/employee/attendance/DailyAttendancePage'));
const ManualPunchPage        = lazy(() => import('./pages/employee/attendance/ManualPunchPage'));
const CustomAttendancePage   = lazy(() => import('./pages/employee/attendance/CustomAttendancePage'));
const OvertimePage           = lazy(() => import('./pages/employee/attendance/OvertimePage'));
const GeofencePage           = lazy(() => import('./pages/employee/attendance/GeofencePage'));
const DailyReportPage        = lazy(() => import('./pages/employee/attendance/DailyReportPage'));
const SummaryPage            = lazy(() => import('./pages/employee/attendance/SummaryPage'));
const EmployeeCorrectionPage = lazy(() => import('./pages/employee/attendance/EmployeeCorrectionPage'));
const MyAttendancePage       = lazy(() => import('./pages/employee/attendance/MyAttendancePage'));
const MyViewAttendancePage   = lazy(() => import('./pages/employee/attendance/MyViewAttendancePage'));

// ── Employee Lifecycle Pages ──────────────────────────────────────
const EmployeePromotionPage  = lazy(() => import('./pages/hr/employees/EmployeePromotionPage'));
const EmployeeResignationPage= lazy(() => import('./pages/hr/employees/EmployeeResignationPage'));
const EmployeeOffboardingPage= lazy(() => import('./pages/hr/employees/EmployeeOffboardingPage'));

// ── Admin Pages ───────────────────────────────────────────────────
const EmployeesPage       = lazy(() => import('./pages/admin/employees/EmployeesPage'));
const EmployeeDetailPage  = lazy(() => import('./pages/admin/employees/EmployeeDetailPage'));
const EmployeeAssetsPage    = lazy(() => import('./pages/admin/employees/EmployeeAssetsPage'));
const EmployeeLoansPage     = lazy(() => import('./pages/admin/employees/EmployeeLoansPage'));
const EmployeePayslipPage   = lazy(() => import('./pages/admin/employees/EmployeePayslipPage'));
const EmployeeSalaryPage    = lazy(() => import('./pages/admin/employees/EmployeeSalaryPage'));
const EmployeeSalaryStructurePage = lazy(() => import('./pages/admin/employees/EmployeeSalaryStructurePage'));
const EmployeeTransferPage  = lazy(() => import('./pages/admin/employees/EmployeeTransferPage'));
const FinalSettlementPage   = lazy(() => import('./pages/admin/employees/FinalSettlementPage'));
const BulkCompliancePage    = lazy(() => import('./pages/admin/employees/BulkCompliancePage'));
const ImportManagersPage    = lazy(() => import('./pages/admin/employees/ImportManagersPage'));
const ResignationAdminPage  = lazy(() => import('./pages/admin/employees/ResignationPage'));
const SendCredentialsPage   = lazy(() => import('./pages/admin/employees/SendCredentialsPage'));
const ShiftAssignPage       = lazy(() => import('./pages/admin/employees/ShiftAssignPage'));
const OrganizationPage    = lazy(() => import('./pages/admin/company/OrganizationPage'));
const ReportsPage         = lazy(() => import('./pages/admin/reports/ReportsPage'));
const SettingsPage        = lazy(() => import('./pages/admin/settings/SettingsPage'));
const BillingPage         = lazy(() => import('./pages/admin/billing/BillingPage'));
const IntegrationsPage    = lazy(() => import('./pages/admin/integrations/IntegrationsPage'));
const SuperAdminPage      = lazy(() => import('./pages/admin/settings/SuperAdminPage'));

// ── Employee Salary / Leave / Claims ─────────────────────────────
const FnfPage                    = lazy(() => import('./pages/employee/salary/FnfPage'));
const Form16Page                 = lazy(() => import('./pages/employee/salary/Form16Page'));
const InvestmentDeclarationPage  = lazy(() => import('./pages/employee/salary/InvestmentDeclarationPage'));
const ITStatementPage            = lazy(() => import('./pages/employee/salary/ITStatementPage'));

// ── Claims / Assets ───────────────────────────────────────────────
const LoansAdvancesPage          = lazy(() => import('./pages/employee/claims/LoansAdvancesPage'));

// ── Employee Self-Service ──────────────────────────────────────────
const MySeparationPage           = lazy(() => import('./pages/employee/profile/MySeparationPage'));
const MyHelpdeskPage             = lazy(() => import('./pages/employee/helpdesk/MyHelpdeskPage'));
const FeedbackPage               = lazy(() => import('./pages/employee/helpdesk/FeedbackPage'));
const ProjectsPage               = lazy(() => import('./pages/employee/performance/ProjectsPage'));
const EmployeeDirectoryPage      = lazy(() => import('./pages/employee/profile/EmployeeDirectoryPage'));
const MyAnnouncementsPage        = lazy(() => import('./pages/employee/announcements/MyAnnouncementsPage'));
const MyDocumentsPage            = lazy(() => import('./pages/employee/documents/MyDocumentsPage'));

// ── HR ────────────────────────────────────────────────────────────
const CompliancePage             = lazy(() => import('./pages/hr/compliance/CompliancePage'));
const HrProjectsPage             = lazy(() => import('./pages/hr/tasks/ProjectsPage'));

// ── HR Approval Pages ─────────────────────────────────────────────
const LeaveApprovalPage           = lazy(() => import('./pages/hr/approvals/LeaveApprovalPage'));
const CancelLeaveApprovalPage     = lazy(() => import('./pages/hr/approvals/CancelLeaveApprovalPage'));
const ColCoffApprovalPage         = lazy(() => import('./pages/hr/approvals/ColCoffApprovalPage'));
const TravelClaimApprovalPage     = lazy(() => import('./pages/hr/approvals/TravelClaimApprovalPage'));
const AdvanceClaimApprovalPage    = lazy(() => import('./pages/hr/approvals/AdvanceClaimApprovalPage'));
const LoanAdvanceApprovalPage     = lazy(() => import('./pages/hr/approvals/LoanAdvanceApprovalPage'));
const ShiftChangeApprovalPage     = lazy(() => import('./pages/hr/approvals/ShiftChangeApprovalPage'));
const OptionalHolidayApprovalPage = lazy(() => import('./pages/hr/approvals/OptionalHolidayApprovalPage'));
const OvertimeApprovalPage        = lazy(() => import('./pages/hr/approvals/OvertimeApprovalPage'));

// ── HR Attendance Pages ───────────────────────────────────────────
const CorrectionRequestApprovalPage = lazy(() => import('./pages/hr/attendance/CorrectionRequestApprovalPage'));
const MarkAttendanceApprovalPage    = lazy(() => import('./pages/hr/attendance/MarkAttendanceApprovalPage'));
const RegularizationApprovalPage    = lazy(() => import('./pages/hr/attendance/RegularizationApprovalPage'));
const GeoAttendanceApprovalPage     = lazy(() => import('./pages/hr/attendance/GeoAttendanceApprovalPage'));
const TeamDailyAttendanceReportPage = lazy(() => import('./pages/hr/attendance/TeamDailyAttendanceReportPage'));

// ── HR Performance Pages ──────────────────────────────────────────

// ── HR Recruitment Pages ──────────────────────────────────────────

// ── Helpdesk ──────────────────────────────────────────────────────
const HelpdeskPage = lazy(() => import('./pages/common/HelpdeskPage'));

// ── Role Routers ───────────────────────────────────────────────────
const PayrollRouter = lazy(() => import('./routes/PayrollRouter'));
const LeaveRouter = lazy(() => import('./routes/LeaveRouter'));
const RecruitmentRouter = lazy(() => import('./routes/RecruitmentRouter'));
const PerformanceRouter = lazy(() => import('./routes/PerformanceRouter'));
const SharedRouter = lazy(() => import('./routes/SharedRouter'));
const TaxSetupPage = lazy(() => import('./pages/admin/tax/TaxSetupPage'));
const AttendancePolicyPage = lazy(() => import('./pages/admin/settings/AttendancePolicyPage'));
const SettingsSetupPage = lazy(() => import('./pages/admin/settings/SettingsSetupPage'));
const OrgMastersPage = lazy(() => import('./pages/admin/company/OrgMastersPage'));
const ComplianceSetupPage = lazy(() => import('./pages/admin/compliance/ComplianceSetupPage'));
const MorePage              = lazy(() => import('./pages/common/MorePage'));
const AboutUpdatesPage      = lazy(() => import('./pages/common/AboutUpdatesPage'));
const NotFoundPage = lazy(() => import('./pages/common/NotFoundPage'));

function isAuthed() {
  return !!localStorage.getItem('accessToken');
}

/** True when the path resolves to an Admin/HR-only page (blocked for employee role) */
function isAdminOnlyPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  const starts = (prefix: string) => p === prefix || p.startsWith(prefix + '/');

  // Employee self-service overrides
  if (starts('/employees/me') || starts('/employees/directory')) return false;

  // Any other /employees route is Admin/HR only
  if (p === '/employees' || starts('/employees/')) return true;

  if (p === '/tax-calculator') return true;

  return [
    '/organization', '/settings', '/billing', '/integrations', '/super-admin',
    '/compliance', '/reports', '/approvals',
    '/tax-calculator/master', '/tax-calculator/declarations', '/tax-calculator/pending',
    '/tax-calculator/slabs', '/tax-calculator/sec-category', '/tax-calculator/income-slab-cat',
    '/attendance/policy', '/attendance/correction', '/attendance/mark',
    '/attendance/regularization', '/attendance/geo',
  ].some(starts);
}

/** Role-based route access: system/admin full, employee restricted to self-service */
function canAccessPath(user: { isSuperAdmin?: boolean; role?: { name?: string; isSystem?: boolean } } | null, pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (isSuperAdminRole(user?.isSuperAdmin, user?.role?.isSystem)) return true;
  if (isAdminRole(user?.role?.name)) {
    if (p === '/super-admin' || p.startsWith('/super-admin/')) return false;
    return true;
  }
  return !isAdminOnlyPath(p);
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, setUser, isLoading, setLoading, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthed() && !user) {
      setLoading(true);
      authApi.me()
        .then(setUser)
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else if (!isAuthed()) {
      setLoading(false);
    }
  }, [user, setUser, setLoading, logout]);

  if (!isAuthed()) return <Navigate to="/login" replace />;
  if (isLoading) return <FullPageSpinner />;

  if (user && !canAccessPath(user, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={<FullPageSpinner />}>
          <LoginPage />
        </Suspense>
      } />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        {[
          // ── Core ──────────────────────────────────────────────────────
          { path: 'dashboard',           El: DashboardPage },

          // ── Employees (Admin) ─────────────────────────────────────────
          { path: 'employees',                   El: EmployeesPage },
          { path: 'employees/:id',               El: EmployeeDetailPage },
          { path: 'employees/assets',            El: EmployeeAssetsPage },
          { path: 'employees/loans',             El: EmployeeLoansPage },
          { path: 'employees/payslips',          El: EmployeePayslipPage },
          { path: 'employees/salary-structure',  El: EmployeeSalaryPage },
          { path: 'employees/:id/salary-structure',  El: EmployeeSalaryStructurePage },
          { path: 'employees/transfer',          El: EmployeeTransferPage },
          { path: 'employees/final-settlement',  El: FinalSettlementPage },
          { path: 'employees/compliance',        El: BulkCompliancePage },
          { path: 'employees/import-managers',   El: ImportManagersPage },
          { path: 'employees/separation',        El: ResignationAdminPage },
          { path: 'employees/send-credentials',  El: SendCredentialsPage },
          { path: 'employees/shift-assign',      El: ShiftAssignPage },
          { path: 'employees/resignation',       El: EmployeeResignationPage },
          { path: 'employees/offboarding',       El: EmployeeOffboardingPage },
          { path: 'employees/promotion',         El: EmployeePromotionPage },
          { path: 'employees/directory',         El: EmployeeDirectoryPage },
          { path: 'employees/me',                El: MyProfilePage },

          // ── Attendance ────────────────────────────────────────────────
          { path: 'attendance/correction',            El: CorrectionRequestApprovalPage },
          { path: 'attendance/mark',                  El: MarkAttendanceApprovalPage },
          { path: 'attendance/regularization',        El: RegularizationApprovalPage },
          { path: 'attendance/geo',                   El: GeoAttendanceApprovalPage },
          { path: 'attendance/correction-request',    El: EmployeeCorrectionPage },
          { path: 'attendance/daily',                 El: DailyAttendancePage },
          { path: 'attendance/manual',                El: ManualPunchPage },
          { path: 'attendance/custom',                El: CustomAttendancePage },
          { path: 'attendance/custom-view',           El: MyViewAttendancePage },
          { path: 'attendance/policy',                El: AttendancePolicyPage },
          { path: 'attendance/overtime',              El: OvertimePage },
          { path: 'attendance/geofence',              El: GeofencePage },
          { path: 'attendance/daily-report',          El: DailyReportPage },
          { path: 'attendance/summary',               El: SummaryPage },
          { path: 'attendance/view',                  El: MyViewAttendancePage },
          { path: 'attendance/my',                    El: MyAttendancePage },

          // ── Leave ─────────────────────────────────────────────────────
          { path: 'leave',                   El: LeaveRouter },
          { path: 'leave/:sub',              El: LeaveRouter },

          // ── Payroll & Salary ──────────────────────────────────────────
          { path: 'payroll',                 El: PayrollRouter },
          { path: 'payroll/history',         El: PayrollRouter },
          { path: 'payroll/:sub',            El: PayrollRouter },

          // ── Tax ───────────────────────────────────────────────────────
          { path: 'tax-calculator',              El: TaxCalculatorPage },
          { path: 'tax-calculator/form16',       El: Form16Page },
          { path: 'tax-calculator/investment',   El: InvestmentDeclarationPage },
          { path: 'tax-calculator/it-statement', El: ITStatementPage },
          { path: 'tax-calculator/master',       El: TaxMasterPage },
          { path: 'tax-calculator/declarations', El: TaxDeclarationsPage },
          { path: 'tax-calculator/pending',      El: TaxDeclarationsApprovalPage },
          { path: 'tax-calculator/slabs',        El: TaxSetupPage },
          { path: 'tax-calculator/sec-category', El: TaxSetupPage },
          { path: 'tax-calculator/income-slab-cat', El: TaxSetupPage },

          // ── Claims / Assets / Travel ──────────────────────────────────
          { path: 'assets',                  El: SharedRouter },
          { path: 'assets/:sub',             El: SharedRouter },
          { path: 'expenses',                El: SharedRouter },
          { path: 'expenses/advance',        El: SharedRouter },
          { path: 'expenses/loans',          El: LoansAdvancesPage },
          { path: 'expenses/:sub',           El: SharedRouter },
          { path: 'travel',                  El: SharedRouter },
          { path: 'travel/:sub',             El: SharedRouter },

          // ── Shifts & Timesheets ───────────────────────────────────────
          { path: 'shifts',                  El: SharedRouter },
          { path: 'shifts/:sub',             El: SharedRouter },
          { path: 'timesheets',              El: TimesheetsPage },

          // ── Reports ───────────────────────────────────────────────────
          { path: 'reports',                 El: ReportsPage },
          { path: 'reports/:sub',            El: ReportsPage },
          { path: 'reports/attendance',      El: TeamDailyAttendanceReportPage },

          // ── Recruitment ───────────────────────────────────────────────
          { path: 'recruitment',          El: RecruitmentRouter },
          { path: 'recruitment/:sub',     El: RecruitmentRouter },

          // ── Performance (role-aware) ──────────────────────────────────
          { path: 'performance',                   El: PerformanceRouter },
          { path: 'performance/:sub',              El: PerformanceRouter },

          // ── Projects / Tasks ──────────────────────────────────────────
          { path: 'projects',                El: HrProjectsPage },
          { path: 'projects/:sub',           El: ProjectsPage },

          // ── Announcements & Training ──────────────────────────────────
          { path: 'announcements',           El: AnnouncementsPage },
          { path: 'announcements/company',   El: MyAnnouncementsPage },
          { path: 'announcements/:sub',      El: AnnouncementsPage },
          { path: 'training',                El: TrainingPage },

          // ── Organization / Company Setup ──────────────────────────────
          { path: 'organization',            El: OrganizationPage },
          { path: 'organization/masters',    El: OrgMastersPage },
          { path: 'organization/import',     El: OrgMastersPage },
          { path: 'organization/forms',      El: OrgMastersPage },
          { path: 'organization/:sub',       El: OrganizationPage },

          // ── Settings & System ─────────────────────────────────────────
          { path: 'settings',                El: SettingsPage },
          { path: 'settings/employee-id',    El: SettingsSetupPage },
          { path: 'settings/credentials',    El: SettingsSetupPage },
          { path: 'settings/:sub',           El: SettingsPage },
          { path: 'billing',                 El: BillingPage },
          { path: 'integrations',            El: IntegrationsPage },
          { path: 'super-admin',             El: SuperAdminPage },
          { path: 'super-admin/:sub',        El: SuperAdminPage },

          // ── Compliance ────────────────────────────────────────────────
          { path: 'compliance',              El: CompliancePage },
          { path: 'compliance/pt',           El: ComplianceSetupPage },
          { path: 'compliance/pf',           El: ComplianceSetupPage },
          { path: 'compliance/esic',         El: ComplianceSetupPage },
          { path: 'compliance/lwf',          El: ComplianceSetupPage },
          { path: 'compliance/forms',        El: ComplianceSetupPage },
          { path: 'compliance/:sub',         El: CompliancePage },

          // ── Exit / Separation / FnF ───────────────────────────────────
          { path: 'fnf',                     El: FnfPage },
          { path: 'exit',                    El: SharedRouter },
          { path: 'exit/:sub',               El: SharedRouter },
          { path: 'exit/clearance',          El: MySeparationPage },
          { path: 'exit/interview',          El: MySeparationPage },

          // ── Helpdesk ──────────────────────────────────────────────────
          { path: 'helpdesk',                El: HelpdeskPage },
          { path: 'helpdesk/my-tickets',     El: MyHelpdeskPage },
          { path: 'helpdesk/feedback',       El: FeedbackPage },
          { path: 'helpdesk/:sub',           El: HelpdeskPage },

          // ── Approvals ─────────────────────────────────────────────────
          { path: 'approvals/leave',            El: LeaveApprovalPage },
          { path: 'approvals/cancel-leave',     El: CancelLeaveApprovalPage },
          { path: 'approvals/compoff',          El: ColCoffApprovalPage },
          { path: 'approvals/travel',           El: TravelClaimApprovalPage },
          { path: 'approvals/advance',          El: AdvanceClaimApprovalPage },
          { path: 'approvals/loan',             El: LoanAdvanceApprovalPage },
          { path: 'approvals/shift',            El: ShiftChangeApprovalPage },
          { path: 'approvals/optional-holiday', El: OptionalHolidayApprovalPage },
          { path: 'approvals/overtime',         El: OvertimeApprovalPage },

          // ── Documents ─────────────────────────────────────────────────
          { path: 'documents',               El: DocumentsPage },
          { path: 'documents/payroll',       El: MyDocumentsPage },
          { path: 'documents/newsletter',    El: MyDocumentsPage },
          { path: 'documents/hr-links',      El: MyDocumentsPage },
          { path: 'documents/salary-links',  El: MyDocumentsPage },
          { path: 'documents/:sub',          El: DocumentsPage },

          // ── Misc ──────────────────────────────────────────────────────
          { path: 'more',                    El: MorePage },
          { path: 'about',                   El: AboutUpdatesPage },
          { path: 'about/update',            El: AboutUpdatesPage },

        ].map(({ path, El }) => (
          <Route
            key={path}
            path={path}
            element={
              <ErrorBoundary>
                <Suspense fallback={<FullPageSpinner />}>
                  <El />
                </Suspense>
              </ErrorBoundary>
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
