import { useAuthStore } from '../../store/useAuthStore';
import AdminDashboard from '../admin/dashboard/AdminDashboard';
import HrDashboard from '../hr/dashboard/HrDashboard';
import EmployeeDashboard from './dashboard/EmployeeDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  const roleName = user.role?.name?.toLowerCase() || '';

  // Super Admin / System Admin -> AdminDashboard
  if (user.isSuperAdmin || user.role?.isSystem || roleName === 'super admin' || roleName === 'system admin' || roleName === 'admin') {
    return <AdminDashboard />;
  }

  // HR Manager / Line Manager -> HrDashboard
  if (roleName.includes('hr') || roleName.includes('human resource') || roleName.includes('manager')) {
    return <HrDashboard />;
  }

  // Otherwise, default to the Employee Dashboard
  return <EmployeeDashboard />;
}

