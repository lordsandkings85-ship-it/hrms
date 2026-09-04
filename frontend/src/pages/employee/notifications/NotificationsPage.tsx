import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { notificationApi, type Notification } from '../../../api/client';

export default function NotificationsPage() {
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

  const priorityColor = (p: string) =>
    p === 'urgent' ? 'var(--danger)' : p === 'high' || p === 'warning' ? 'var(--warning, #f59e0b)' : 'var(--action-primary)';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
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
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
              style={{ borderColor: 'var(--border)', background: n.isRead ? undefined : 'var(--surface-hover)' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                style={{ background: !n.isRead ? 'var(--action-primary)' : 'transparent', border: '1px solid var(--border)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontWeight: n.isRead ? 400 : 600 }}>
                  {n.title}
                </div>
                {n.message && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.message}</div>
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
              <div className="flex items-center gap-2 shrink-0">
                {n.isRead ? (
                  <button
                    onClick={() => markUnreadMutation.mutate(n.id)}
                    className="text-[11px] hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Mark unread
                  </button>
                ) : (
                  <button
                    onClick={() => markReadMutation.mutate(n.id)}
                    className="text-[11px] hover:underline"
                    style={{ color: 'var(--action-primary)' }}
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(n.id)}
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
