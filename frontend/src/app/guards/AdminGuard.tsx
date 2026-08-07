import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { isAdminRole, isSuperAdminRole } from '../../navigation/permissions';

/**
 * AdminGuard — Restricts access to Admin/HR-level users only.
 * Redirects employees to /dashboard if they try to access admin routes.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const roleName = user?.role?.name;
  const hasAccess = isSuperAdminRole(user?.isSuperAdmin, user?.role?.isSystem) || isAdminRole(roleName);
  
  if (!hasAccess) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
