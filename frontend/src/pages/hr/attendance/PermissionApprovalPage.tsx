import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Search, Check, X, CalendarClock, User } from 'lucide-react';
import { permissionRequestApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { fmtTime12, fmtDateFull } from '../../../utils/formatDate';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelled: 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]',
};

export default function PermissionApprovalPage() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['permission-requests', tab],
    queryFn: () =>
      tab === 'pending'
        ? permissionRequestApi.listPending()
        : permissionRequestApi.list({ status: tab }),
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
    queryClient.invalidateQueries({ queryKey: ['permission-requests-my'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => permissionRequestApi.approve(id),
    onSuccess: () => {
      toastSuccess('Permission request approved');
      invalidate();
    },
    onError: (err: any) => toastError(err.message || 'Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => permissionRequestApi.reject(id, reason),
    onSuccess: () => {
      toastSuccess('Permission request rejected');
      setRejecting(null);
      setRejectReason('');
      invalidate();
    },
    onError: (err: any) => toastError(err.message || 'Failed to reject request'),
  });

  const filtered = (requests || []).filter((r: any) => {
    const fullName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const statusBadge = (status: string) =>
    STATUS_BADGE[status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Permission Approval</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
              Review and act on 3-Hour Permission requests from employees.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className={`px-4 py-2 border ${tab === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)]'} rounded-xl text-xs font-bold`}>
            {filtered.length} {tab === 'pending' ? 'Pending' : tab}
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  tab === t.key
                    ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">No {tab} permission requests.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((r: any) => {
              const fullName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() || 'Unknown';
              return (
                <div key={r.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {fullName}
                        <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                          {r.employee?.employeeCode || ''}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                        <CalendarClock size={13} />
                        {fmtDateFull(r.date)} · {fmtTime12(r.fromTime)} – {fmtTime12(r.toTime)} · {r.minutes} min
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{r.reason}</div>
                      {(r.status === 'approved' || r.status === 'rejected') && r.approverName && (
                        <div className="text-xs mt-0.5">
                          {r.status === 'approved' ? (
                            <span className="text-emerald-500">Approved by {r.approverName}</span>
                          ) : (
                            <span className="text-red-400">Rejected: {r.rejectReason || 'No reason given'}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold capitalize ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejecting(r);
                            setRejectReason('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Reject Permission Request</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {`${rejecting.employee?.firstName || ''} ${rejecting.employee?.lastName || ''}`.trim() || 'Employee'} ·{' '}
              {fmtDateFull(rejecting.date)} · {rejecting.minutes} min
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (required)..."
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setRejecting(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejecting.id, reason: rejectReason.trim() })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}