import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, XCircle, Send, Info } from 'lucide-react';
import { permissionRequestApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../../components/ui/ToastProvider';
import { getServerYear, getServerMonth } from '../../../utils/serverTime';
import { fmtDateShort, fmtTime12 } from '../../../utils/formatDate';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelled: 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]',
};

const MONTHLY_QUOTA_MINUTES = 180;

const minutesBetween = (from: string, to: string) => {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const diff = th * 60 + tm - (fh * 60 + fm);
  return diff > 0 ? diff : 0;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function PermissionRequestPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const myEmpId = user?.employee?.id || '';
  const year = getServerYear();
  const month = getServerMonth();
  const serverNow = new Date(year, month - 1, new Date().getDate(), new Date().getHours(), new Date().getMinutes());

  const [form, setForm] = useState({
    date: `${year}-${pad(month)}-${pad(serverNow.getDate())}`,
    fromTime: '10:30',
    toTime: '11:00',
    reason: '',
  });

  const { data: myRequests, isLoading } = useQuery({
    queryKey: ['permission-requests-my'],
    queryFn: () => permissionRequestApi.listMine(),
    enabled: !!myEmpId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-monthly-summary'] });
  };

  const nowYearMonth = `${year}-${pad(month)}`;
  const monthUsage = useMemo(
    () =>
      (myRequests || [])
        .filter((r: any) => (r.status === 'pending' || r.status === 'approved') && (r.date || '').startsWith(nowYearMonth))
        .reduce((s: number, r: any) => s + (r.minutes || 0), 0),
    [myRequests, nowYearMonth],
  );
  const quotaLeft = Math.max(0, MONTHLY_QUOTA_MINUTES - monthUsage);

  const createMutation = useMutation({
    mutationFn: () =>
      permissionRequestApi.create({
        employeeId: myEmpId,
        date: form.date,
        fromTime: form.fromTime,
        toTime: form.toTime,
        reason: form.reason.trim(),
      }),
    onSuccess: () => {
      toastSuccess('Permission request submitted for approval');
      setForm((f) => ({ ...f, reason: '' }));
      invalidate();
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to submit permission request');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => permissionRequestApi.cancel(id),
    onSuccess: () => {
      toastSuccess('Permission request cancelled');
      invalidate();
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to cancel request');
    },
  });

  const duration = minutesBetween(form.fromTime, form.toTime);
  const withinRange = duration >= 30 && duration <= 180 && duration % 15 === 0;
  const canSubmit = !!form.reason.trim() && withinRange && quotaLeft >= duration && duration > 0;

  const statusBadge = (status: string) =>
    STATUS_BADGE[status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';

  const sorted = [...(myRequests || [])].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <CalendarClock size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Permission Request</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Request 30 minutes to 3 hours of time away within your shift.</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="px-4 py-2 border bg-indigo-500/10 border-indigo-500/20 text-indigo-500 rounded-xl text-xs font-bold">
            {Math.floor(quotaLeft / 60)}h {quotaLeft % 60}m left this month
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">New Request</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">From</label>
                <input
                  type="time"
                  value={form.fromTime}
                  onChange={(e) => setForm((f) => ({ ...f, fromTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">To</label>
                <input
                  type="time"
                  value={form.toTime}
                  onChange={(e) => setForm((f) => ({ ...f, toTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Info size={14} className={withinRange && duration > 0 ? 'text-emerald-500' : 'text-amber-500'} />
              <span className="text-[var(--text-muted)]">
                {duration > 0
                  ? `Duration: ${duration} min — must be between 30 min and 3h in 15-min increments.`
                  : 'Pick a from/to window to see the duration.'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
                placeholder="e.g. Personal errand, visitor appointment..."
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]"
              />
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Send size={16} />
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
            {!withinRange && duration > 0 && (
              <p className="text-xs text-red-500">Request window must be between 30 minutes and 3 hours in 15-minute steps.</p>
            )}
            {withinRange && duration > quotaLeft && (
              <p className="text-xs text-red-500">Exceeds your remaining monthly allowance ({Math.floor(quotaLeft / 60)}h {quotaLeft % 60}m).</p>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">My Requests</h2>
            <button
              onClick={invalidate}
              className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-sm text-[var(--text-muted)] py-8 text-center">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] py-8 text-center">No permission requests yet.</div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {sorted.map((r: any) => (
                <div key={r.id} className="border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        {fmtDateShort(r.date)} · {fmtTime12(r.fromTime)} – {fmtTime12(r.toTime)}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{r.minutes} min · {r.reason}</div>
                      {r.status === 'rejected' && r.rejectReason && (
                        <div className="text-xs text-red-400 mt-1.5">Rejected: {r.rejectReason}</div>
                      )}
                      {r.status === 'approved' && r.approverName && (
                        <div className="text-xs text-emerald-500 mt-1.5">Approved by {r.approverName}</div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold capitalize ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.status === 'pending' && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => cancelMutation.mutate(r.id)}
                        disabled={cancelMutation.isPending}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/5 px-3 py-1.5 rounded-lg"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}