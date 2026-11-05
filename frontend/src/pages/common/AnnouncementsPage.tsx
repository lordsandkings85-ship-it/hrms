import { useAuthStore } from '../../store/useAuthStore';
import AnnouncementsPage from '../employee/announcements/AnnouncementsPage'; // HR admin publish announcements page
import MyAnnouncementsPage from '../employee/announcements/MyAnnouncementsPage'; // Employee view

export default function AnnouncementsWrapper() {
  const { user } = useAuthStore();
  const roleName = user?.role?.name?.toLowerCase() || '';
  const isAdmin =
    !!user?.isSuperAdmin ||
    !!user?.role?.isSystem ||
    roleName.includes('hr') ||
    roleName.includes('admin') ||
    roleName.includes('human resource');

  return isAdmin ? <AnnouncementsPage /> : <MyAnnouncementsPage />;
}
