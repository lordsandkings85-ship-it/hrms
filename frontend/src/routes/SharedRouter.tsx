import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isStaffUser } from '../utils/role';
import { FullPageSpinner } from '../components/ui/Spinner';

const MyAssetsPage = lazy(() => import('../pages/employee/assets/MyAssetsPage'));
const MyShiftsPage = lazy(() => import('../pages/employee/attendance/MyShiftsPage'));
const MyTravelPage = lazy(() => import('../pages/employee/claims/MyTravelPage'));
const MyExpensesPage = lazy(() => import('../pages/employee/claims/MyExpensesPage'));
const ExitPage = lazy(() => import('../pages/employee/profile/ExitPage'));

const AssetsAdminPage = lazy(() => import('../pages/admin/assets/AssetsAdminPage'));
const ShiftsAdminPage = lazy(() => import('../pages/admin/shifts/ShiftsAdminPage'));
const TravelAdminPage = lazy(() => import('../pages/admin/travel/TravelAdminPage'));
const ExpensesAdminPage = lazy(() => import('../pages/admin/expenses/ExpensesAdminPage'));
const ExitAdminPage = lazy(() => import('../pages/admin/exit/ExitAdminPage'));

const STAFF_PAGES: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  assets: MyAssetsPage,
  shifts: MyShiftsPage,
  travel: MyTravelPage,
  expenses: MyExpensesPage,
  exit: ExitPage,
};

const ADMIN_PAGES: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  assets: AssetsAdminPage,
  shifts: ShiftsAdminPage,
  travel: TravelAdminPage,
  expenses: ExpensesAdminPage,
  exit: ExitAdminPage,
};

export default function SharedRouter() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const module = pathname.split('/')[1] || '';
  const pages = isStaffUser(user) ? STAFF_PAGES : ADMIN_PAGES;
  const El = pages[module];
  if (!El) return null;
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <El />
    </Suspense>
  );
}
