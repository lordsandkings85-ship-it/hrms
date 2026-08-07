import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isStaffUser } from '../utils/role';
import { FullPageSpinner } from '../components/ui/Spinner';

const MyResponsibilitiesPage = lazy(() => import('../pages/employee/performance/MyResponsibilitiesPage'));
const PerformanceSetupPage = lazy(() => import('../pages/admin/performance/PerformanceSetupPage'));
const ManagerEvaluationPage = lazy(() => import('../pages/hr/performance/ManagerEvaluationPage'));
const ApproveTargetsPage = lazy(() => import('../pages/hr/performance/ApproveTargetsPage'));
const ViewScorecardPage = lazy(() => import('../pages/hr/performance/ViewScorecardPage'));
const ViewPeriodicScorecardPage = lazy(() => import('../pages/hr/performance/ViewPeriodicScorecardPage'));
const PerformanceFormsPage = lazy(() => import('../pages/hr/performance/PerformanceFormsPage'));

const HR_SUB_PAGES: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  evaluation: ManagerEvaluationPage,
  'approve-targets': ApproveTargetsPage,
  scorecard: ViewScorecardPage,
  'periodic-scorecard': ViewPeriodicScorecardPage,
  forms: PerformanceFormsPage,
};

export default function PerformanceRouter() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  if (isStaffUser(user)) {
    return (
      <Suspense fallback={<FullPageSpinner />}>
        <MyResponsibilitiesPage />
      </Suspense>
    );
  }

  const sub = pathname.split('/')[2] || '';
  const El = HR_SUB_PAGES[sub] || PerformanceSetupPage;
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <El />
    </Suspense>
  );
}
