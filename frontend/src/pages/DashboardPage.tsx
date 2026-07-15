import { useAuthStore } from '../store/useAuthStore';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  // If the user has a system role, show the Admin Dashboard
  if (user.role?.isSystem) {
    return <AdminDashboard />;
  }

  // Otherwise, default to the Employee Dashboard
  return <EmployeeDashboard />;
}
