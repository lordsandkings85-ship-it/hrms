import { useAuthStore } from '../../store/useAuthStore';
import AnnouncementsPage from '../employee/announcements/AnnouncementsPage'; // HR admin publish announcements page
import MyAnnouncementsPage from '../employee/announcements/MyAnnouncementsPage'; // Employee view

export default function AnnouncementsWrapper() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem || user?.role?.name?.toLowerCase().includes('hr') || user?.role?.name?.toLowerCase().includes('admin');
  return isAdmin ? <AnnouncementsPage /> : <MyAnnouncementsPage />;
}
