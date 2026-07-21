import { useAuthStore } from '../store/useAuthStore';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import HrDashboard from '../components/dashboard/HrDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  const roleName = user.role?.name?.toLowerCase() || '';

  // HR & Admin Dashboard
  if (user.role?.isSystem || roleName.includes('admin') || roleName === 'hr' || roleName === 'human resources' || roleName === 'hr admin') {
    return <HrDashboard />;
  }

  // Otherwise, default to the Employee Dashboard
  return <EmployeeDashboard />;
}
