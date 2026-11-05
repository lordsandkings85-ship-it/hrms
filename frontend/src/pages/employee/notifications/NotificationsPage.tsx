import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { notificationApi, type Notification } from '../../../api/client';
import { getNotificationTargetUrl } from '../../../utils/notificationRouter';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const {
    data: notifications = [],
    isLoading,
  } = useQuery<Notification[]>({
    queryKey: ['notifications', 'mine', userId],
    queryFn: () => notificationApi.getMine({ limit: 200 }),
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'mine', userId] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: invalidate,
  });
  const markUnreadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markUnread(id),
    onSuccess: invalidate,
  });
  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: invalidate,
  });

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    const targetUrl = getNotificationTargetUrl(notif, user);
    navigate(targetUrl);
  };

  const priorityColor = (p: string) =>
    p === 'urgent' ? 'var(--danger)' : p === 'high' || p === 'warning' ? 'var(--warning, #f59e0b)' : 'var(--action-primary)';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger, #ef4444)', border: '1px solid var(--danger-border, #fecaca)' }}>
                {notifications.filter((n) => !n.isRead).length} unopened
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Your personalized notifications — scoped to your role and audience.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border"
            style={{ color: 'var(--action-primary)', borderColor: 'var(--border)' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>You're all caught up</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className="group flex items-start gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--surface-hover)]"
              style={{ borderColor: 'var(--border)', background: n.isRead ? undefined : 'var(--surface-hover)' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 transition-transform group-hover:scale-125"
                style={{ background: !n.isRead ? 'var(--action-primary)' : 'transparent', border: '1px solid var(--border)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)', fontWeight: n.isRead ? 400 : 600 }}>
                  <span>{n.title}</span>
                  <ChevronRight size={13} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {n.message && (
                  <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.message}</div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ color: priorityColor(n.priority), background: 'var(--surface-hover)' }}
                  >
                    {n.priority}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {n.isRead ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markUnreadMutation.mutate(n.id);
                    }}
                    className="text-[11px] hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Mark unread
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(n.id);
                    }}
                    className="text-[11px] hover:underline"
                    style={{ color: 'var(--action-primary)' }}
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(n.id);
                  }}
                  className="text-[11px] hover:underline"
                  style={{ color: 'var(--danger)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
