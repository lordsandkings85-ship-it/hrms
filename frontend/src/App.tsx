import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import PayrollPage from './pages/PayrollPage';
import RecruitmentPage from './pages/RecruitmentPage';
import PerformancePage from './pages/PerformancePage';
import DocumentsPage from './pages/DocumentsPage';
import AssetsPage from './pages/AssetsPage';
import ExpensesPage from './pages/ExpensesPage';
import TravelPage from './pages/TravelPage';
import ShiftsPage from './pages/ShiftsPage';
import TimesheetsPage from './pages/TimesheetsPage';
import ProjectsPage from './pages/ProjectsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TrainingPage from './pages/TrainingPage';
import OrganizationPage from './pages/OrganizationPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import BillingPage from './pages/BillingPage';
import IntegrationsPage from './pages/IntegrationsPage';
import SuperAdminPage from './pages/SuperAdminPage';
import FnfPage from './pages/FnfPage';
import ExitPage from './pages/ExitPage';
import TaxCalculatorPage from './pages/TaxCalculatorPage';

import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { authApi } from './api/client';
import { FullPageSpinner } from './components/ui/Spinner';

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
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<DashboardPage />} />
        <Route path="employees"      element={<EmployeesPage />} />
        <Route path="employees/:id"  element={<EmployeeDetailPage />} />
        <Route path="attendance"     element={<AttendancePage />} />
        <Route path="leave"          element={<LeavePage />} />
        <Route path="payroll"        element={<PayrollPage />} />
        <Route path="recruitment"    element={<RecruitmentPage />} />
        <Route path="performance"    element={<PerformancePage />} />
        <Route path="documents"      element={<DocumentsPage />} />
        <Route path="assets"         element={<AssetsPage />} />
        <Route path="expenses"       element={<ExpensesPage />} />
        <Route path="travel"         element={<TravelPage />} />
        <Route path="shifts"         element={<ShiftsPage />} />
        <Route path="timesheets"     element={<TimesheetsPage />} />
        <Route path="projects"       element={<ProjectsPage />} />
        <Route path="announcements"  element={<AnnouncementsPage />} />
        <Route path="training"       element={<TrainingPage />} />
        <Route path="organization"   element={<OrganizationPage />} />
        <Route path="reports"        element={<ReportsPage />} />
        <Route path="settings"       element={<SettingsPage />} />
        <Route path="billing"        element={<BillingPage />} />
        <Route path="integrations"   element={<IntegrationsPage />} />
        <Route path="super-admin"    element={<SuperAdminPage />} />
        <Route path="fnf"            element={<FnfPage />} />
        <Route path="exit"           element={<ExitPage />} />
        <Route path="tax-calculator" element={<TaxCalculatorPage />} />
      </Route>
    </Routes>
  );
}
