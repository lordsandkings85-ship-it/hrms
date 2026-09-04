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

  // Genuine approvers (explicit leave/attendance approve permission) -> HrDashboard.
  // Determined server-side and surfaced via /auth/me as canApproveApproval —
  // NOT by role-name matching, so e.g. an "Office Manager" without approval
  // rights sees the employee dashboard, not the HR one.
  if (user.canApproveApproval) {
    return <HrDashboard />;
  }

  // Otherwise, default to the Employee Dashboard
  return <EmployeeDashboard />;
}

