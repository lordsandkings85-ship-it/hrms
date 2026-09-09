import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Search, Filter, Check, X, Clock, RefreshCw, User } from 'lucide-react';
import { attendanceApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { fmtTime12, fmtDateFull } from '../../../utils/formatDate';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const LOG_STATUS_OPTIONS = ['all', 'full_day', 'regularization'];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function RegularizationApprovalPage() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const clearActionError = (id: string) =>
    setActionErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['regularization', tab],
    queryFn: () =>
      tab === 'pending' ? attendanceApi.listPendingRegularizations() : attendanceApi.listRegularizations(tab === 'all' ? 'all' : tab),
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['regularization'] });
    queryClient.invalidateQueries({ queryKey: ['regularization-pending'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-summary-dash'] });
  };

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => attendanceApi.approveRegularization(requestId),
    onSuccess: (_data, requestId) => {
      toastSuccess('Regularization request approved');
      clearActionError(requestId);
      invalidate();
    },
    onError: (err: any, requestId) => {
      toastError(err.message || 'Failed to approve request');
      setActionErrors((prev) => ({ ...prev, [requestId]: err.message || 'Failed to approve request' }));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => attendanceApi.rejectRegularization(requestId),
    onSuccess: (_data, requestId) => {
      toastSuccess('Regularization request rejected');
      clearActionError(requestId);
      invalidate();
    },
    onError: (err: any, requestId) => {
      toastError(err.message || 'Failed to reject request');
      setActionErrors((prev) => ({ ...prev, [requestId]: err.message || 'Failed to reject request' }));
    },
  });

  const filtered = (requests || []).filter((r: any) => {
    const fullName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    const matchName = fullName.includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || (r.type || 'regularization') === statusFilter;
    return matchName && matchStatus;
  });

  const statusBadge = (status: string) =>
    STATUS_BADGE[status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';

  const typeBadge = (type: string) =>
    type === 'full_day'
      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
      : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-bl-full -z-0 blur-2xl" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Regularization Approval</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review, act on, and track attendance regularization requests.</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className={`px-4 py-2 border ${tab === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)]'} rounded-xl text-xs font-bold`}>
            {filtered.length} {tab === 'pending' ? 'Pending' : tab}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              tab === t.key
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-500" />
            {tab === 'pending' ? 'Pending Correction Requests' : `${tab[0].toUpperCase()}${tab.slice(1)} Correction Requests`}
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors w-64"
              />
            </div>
            <div className="relative">
              <button aria-label="Filter" onClick={() => setFilterOpen(o => !o)} className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-blue-500 hover:border-blue-500/30 transition-colors bg-[var(--surface-alt)]">
                <Filter size={16} />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-1">
                    {LOG_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold capitalize transition-colors ${statusFilter === opt ? 'text-blue-500 bg-blue-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}
                      >
                        {opt === 'all' ? 'All' : opt.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--text-muted)]">
            <ShieldAlert size={36} className="opacity-30" />
            <p className="text-sm font-medium">No {tab} regularization requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <style>{`
              .reg-table table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
              .reg-table th { padding: 10px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
              .reg-table td { padding: 14px 14px; background: var(--surface-alt); transition: background 0.2s; }
              .reg-table tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
              .reg-table tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
              .reg-table tr td { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
              .reg-table tbody tr:hover td { background: var(--surface-hover, var(--surface)); }
            `}</style>
            <div className="reg-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Requested</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Resolved By</th>
                    <th>{tab === 'pending' ? 'Actions' : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req: any) => (
                    <tr key={req.id}>
                      {/* Employee */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                            {req.employee?.firstName?.[0]}{req.employee?.lastName?.[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[var(--text-primary)]">
                              {req.employee?.firstName} {req.employee?.lastName}
                            </div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider">
                              {req.employee?.department?.name || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {req.attendanceLog?.date ? new Date(req.attendanceLog.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {req.createdAt ? `Requested ${fmtDateFull(req.createdAt)}` : ''}
                        </span>
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${typeBadge(req.type)}`}>
                          {req.type === 'full_day' ? 'Full-Day' : 'Time Change'}
                        </span>
                      </td>

                      {/* Requested Times */}
                      <td>
                        {req.type === 'full_day' ? (
                          <div className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1.5">
                            <Check size={11} /> Preserve original punches
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium text-amber-500 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Clock size={10} className="text-emerald-500" />
                              <span className="text-[var(--text-muted)]">In:</span>
                              {req.requestedCheckIn ? fmtTime12(req.requestedCheckIn) : '—'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={10} className="text-red-400" />
                              <span className="text-[var(--text-muted)]">Out:</span>
                              {req.requestedCheckOut ? fmtTime12(req.requestedCheckOut) : '—'}
                            </div>
                            {req.resolutionNote && (
                              <div className="text-[10px] text-[var(--text-muted)] pt-1">{req.resolutionNote}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td>
                        <p className="text-xs text-[var(--text-muted)] max-w-[160px] truncate" title={req.reason}>{req.reason}</p>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${statusBadge(req.status)}`}>
                          {req.status === 'approved' && <Check size={11} />}
                          {req.status === 'rejected' && <X size={11} />}
                          {req.status || 'pending'}
                        </span>
                      </td>

                      {/* Resolved By */}
                      <td>
                        {req.approverName ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                            <User size={11} className="text-[var(--text-muted)]" />
                            {req.approverName}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>

                      {/* Actions (pending only) */}
                      <td>
                        {req.status === 'pending' ? (
                          <div>
                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate(req.id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : null}
                          {actionErrors[req.id] && (
                            <div className="mt-2 max-w-[240px] rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-500 flex items-start gap-1.5">
                              <X size={11} className="mt-px shrink-0" />
                              <span>{actionErrors[req.id]}</span>
                            </div>
                          )}
                        </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
