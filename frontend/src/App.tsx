import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import { useAuthStore } from './store/useAuthStore';
import { authApi } from './api/client';
import { FullPageSpinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// ── Lazy route imports (code splitting per page) ─────────────────
const LoginPage           = lazy(() => import('./pages/LoginPage'));
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const EmployeesPage       = lazy(() => import('./pages/EmployeesPage'));
const EmployeeDetailPage  = lazy(() => import('./pages/EmployeeDetailPage'));
const AttendancePage      = lazy(() => import('./pages/AttendancePage'));
const LeavePage           = lazy(() => import('./pages/LeavePage'));
const PayrollPage         = lazy(() => import('./pages/PayrollPage'));
const RecruitmentPage     = lazy(() => import('./pages/RecruitmentPage'));
const PerformancePage     = lazy(() => import('./pages/PerformancePage'));
const DocumentsPage       = lazy(() => import('./pages/DocumentsPage'));
const AssetsPage          = lazy(() => import('./pages/AssetsPage'));
const ExpensesPage        = lazy(() => import('./pages/ExpensesPage'));
const TravelPage          = lazy(() => import('./pages/TravelPage'));
const ShiftsPage          = lazy(() => import('./pages/ShiftsPage'));
const TimesheetsPage      = lazy(() => import('./pages/TimesheetsPage'));
const ProjectsPage        = lazy(() => import('./pages/ProjectsPage'));
const AnnouncementsPage   = lazy(() => import('./pages/AnnouncementsPage'));
const TrainingPage        = lazy(() => import('./pages/TrainingPage'));
const OrganizationPage    = lazy(() => import('./pages/OrganizationPage'));
const ReportsPage         = lazy(() => import('./pages/ReportsPage'));
const SettingsPage        = lazy(() => import('./pages/SettingsPage'));
const BillingPage         = lazy(() => import('./pages/BillingPage'));
const IntegrationsPage    = lazy(() => import('./pages/IntegrationsPage'));
const SuperAdminPage      = lazy(() => import('./pages/SuperAdminPage'));
const FnfPage             = lazy(() => import('./pages/FnfPage'));
const ExitPage            = lazy(() => import('./pages/ExitPage'));
const TaxCalculatorPage   = lazy(() => import('./pages/TaxCalculatorPage'));
const HelpdeskPage        = lazy(() => import('./pages/HelpdeskPage'));

function isAuthed() {
  return !!localStorage.getItem('accessToken');
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, setUser, isLoading, setLoading, logout } = useAuthStore();

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
          { path: 'dashboard',      El: DashboardPage },
          { path: 'employees',      El: EmployeesPage },
          { path: 'employees/:id',  El: EmployeeDetailPage },
          { path: 'attendance',     El: AttendancePage },
          { path: 'leave',          El: LeavePage },
          { path: 'payroll',        El: PayrollPage },
          { path: 'recruitment',    El: RecruitmentPage },
          { path: 'performance',    El: PerformancePage },
          { path: 'documents',      El: DocumentsPage },
          { path: 'assets',         El: AssetsPage },
          { path: 'expenses',       El: ExpensesPage },
          { path: 'travel',         El: TravelPage },
          { path: 'shifts',         El: ShiftsPage },
          { path: 'timesheets',     El: TimesheetsPage },
          { path: 'projects',       El: ProjectsPage },
          { path: 'announcements',  El: AnnouncementsPage },
          { path: 'training',       El: TrainingPage },
          { path: 'organization',   El: OrganizationPage },
          { path: 'reports',        El: ReportsPage },
          { path: 'settings',       El: SettingsPage },
          { path: 'billing',        El: BillingPage },
          { path: 'integrations',   El: IntegrationsPage },
          { path: 'super-admin',    El: SuperAdminPage },
          { path: 'fnf',            El: FnfPage },
          { path: 'exit',           El: ExitPage },
          { path: 'tax-calculator', El: TaxCalculatorPage },
          { path: 'helpdesk',       El: HelpdeskPage },
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
      </Route>
    </Routes>
  );
}
