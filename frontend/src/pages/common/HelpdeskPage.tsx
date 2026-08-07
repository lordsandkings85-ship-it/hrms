// Wrapper: routes /helpdesk and /helpdesk/:sub based on role
import { useAuthStore } from '../../store/useAuthStore';
import MyHelpdeskPage from '../employee/helpdesk/MyHelpdeskPage';
import HelpdeskPage from '../employee/HelpdeskPage'; // existing HR helpdesk

export default function HelpdeskPageWrapper() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem || user?.role?.name?.toLowerCase().includes('hr') || user?.role?.name?.toLowerCase().includes('admin');
  return isAdmin ? <HelpdeskPage /> : <MyHelpdeskPage />;
}
