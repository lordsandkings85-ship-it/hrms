import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isStaffUser } from '../utils/role';
import { FullPageSpinner } from '../components/ui/Spinner';

const MyLeavePage = lazy(() => import('../pages/employee/leave/MyLeavePage'));
const MyCompOffPage = lazy(() => import('../pages/employee/leave/MyCompOffPage'));
const MyFlexibleHolidayPage = lazy(() => import('../pages/employee/leave/MyFlexibleHolidayPage'));
const LeaveAdminPage = lazy(() => import('../pages/admin/leave/LeaveAdminPage'));

export default function LeaveRouter() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  if (isStaffUser(user)) {
    const sub = pathname.split('/')[2] || '';
    const El = sub === 'compoff' || sub === 'compoff-history'
      ? MyCompOffPage
      : sub === 'flexible'
        ? MyFlexibleHolidayPage
        : MyLeavePage;
    return (
      <Suspense fallback={<FullPageSpinner />}>
        <El />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LeaveAdminPage />
    </Suspense>
  );
}
