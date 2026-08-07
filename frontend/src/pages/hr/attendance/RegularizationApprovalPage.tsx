import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Search, Filter, Check, X, Clock, MapPin, RefreshCw } from 'lucide-react';
import { attendanceApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';

export default function RegularizationApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['regularization-pending'],
    queryFn: () => attendanceApi.listPendingRegularizations(),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => attendanceApi.approveRegularization(requestId),
    onSuccess: () => {
      toastSuccess('Regularization request approved');
      queryClient.invalidateQueries({ queryKey: ['regularization-pending'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => attendanceApi.rejectRegularization(requestId),
    onSuccess: () => {
      toastSuccess('Regularization request rejected');
      queryClient.invalidateQueries({ queryKey: ['regularization-pending'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to reject request'),
  });

  const filtered = (requests || []).filter((r: any) => {
    const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      absent: 'bg-red-500/10 text-red-500 border-red-500/20',
      half_day: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      on_leave: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    };
    return map[status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';
  };

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
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and act on pending attendance correction requests.</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-bold">
            {filtered.length} Pending
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-500" />
            Pending Correction Requests
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
            <button aria-label="Filter" className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-blue-500 hover:border-blue-500/30 transition-colors bg-[var(--surface-alt)]">
              <Filter size={16} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--text-muted)]">
            <ShieldAlert size={36} className="opacity-30" />
            <p className="text-sm font-medium">No pending regularization requests</p>
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
                    <th>Current Log</th>
                    <th>Requested Times</th>
                    <th>Reason</th>
                    <th>Geofence</th>
                    <th>Actions</th>
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${statusBadge(req.attendanceLog?.status)}`}>
                          {req.attendanceLog?.status?.replace('_', ' ') || '—'}
                        </span>
                      </td>

                      {/* Current Log Times */}
                      <td>
                        <div className="text-[11px] font-medium text-[var(--text-muted)] space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-emerald-500" />
                            <span className="text-[var(--text-primary)]">In:</span>
                            {req.attendanceLog?.checkIn ? new Date(req.attendanceLog.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Missed'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-red-400" />
                            <span className="text-[var(--text-primary)]">Out:</span>
                            {req.attendanceLog?.checkOut ? new Date(req.attendanceLog.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </div>
                        </div>
                      </td>

                      {/* Requested Times */}
                      <td>
                        <div className="text-[11px] font-medium text-amber-500 space-y-0.5">
                          <div>In: {req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          <div>Out: {req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </div>
                      </td>

                      {/* Reason */}
                      <td>
                        <p className="text-xs text-[var(--text-muted)] max-w-[160px] truncate" title={req.reason}>{req.reason}</p>
                      </td>

                      {/* Geofence */}
                      <td>
                        {req.attendanceLog?.isWithinGeofence === true && (
                          <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-bold">
                            <MapPin size={12} /> In-Zone
                          </div>
                        )}
                        {req.attendanceLog?.isWithinGeofence === false && (
                          <div className="flex items-center gap-1.5 text-amber-500 text-[11px] font-bold">
                            <MapPin size={12} /> Out-Zone
                          </div>
                        )}
                        {req.attendanceLog?.isWithinGeofence === null && (
                          <span className="text-[11px] text-[var(--text-muted)]">N/A</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(req.id)}
                            disabled={rejectMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
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
