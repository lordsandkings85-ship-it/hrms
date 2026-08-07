import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isStaffUser } from '../utils/role';
import { FullPageSpinner } from '../components/ui/Spinner';

const MyPayrollPage = lazy(() => import('../pages/employee/salary/MyPayrollPage'));
const SalaryRevisionHistoryPage = lazy(() => import('../pages/employee/salary/SalaryRevisionHistoryPage'));
const PayrollAdminPage = lazy(() => import('../pages/admin/payroll/PayrollAdminPage'));

export default function PayrollRouter() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  const El = isStaffUser(user)
    ? pathname.endsWith('/history')
      ? SalaryRevisionHistoryPage
      : MyPayrollPage
    : PayrollAdminPage;

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <El />
    </Suspense>
  );
}
