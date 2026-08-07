import { lazy, Suspense } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { isStaffUser } from '../utils/role';
import { FullPageSpinner } from '../components/ui/Spinner';

const JobOpeningsPage = lazy(() => import('../pages/employee/profile/JobOpeningsPage'));
const RecruitmentAdminPage = lazy(() => import('../pages/admin/recruitment/RecruitmentAdminPage'));

export default function RecruitmentRouter() {
  const user = useAuthStore((s) => s.user);
  const El = isStaffUser(user) ? JobOpeningsPage : RecruitmentAdminPage;
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <El />
    </Suspense>
  );
}
