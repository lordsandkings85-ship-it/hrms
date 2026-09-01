import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Search, Filter, Check, X, Clock } from 'lucide-react';
import { attendanceApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';
import { fmtTime12 } from '../../../utils/formatDate';

const REQUEST_STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected'];

function fmtTime(iso?: string | null) {
  return fmtTime12(iso);
}

export default function CorrectionRequestApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
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
      toastSuccess('Correction request approved');
      queryClient.invalidateQueries({ queryKey: ['regularization-pending'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-dash'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => attendanceApi.rejectRegularization(requestId),
    onSuccess: () => {
      toastSuccess('Correction request rejected');
      queryClient.invalidateQueries({ queryKey: ['regularization-pending'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-dash'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to reject request'),
  });

  const filteredRequests = (requests || []).filter((req: any) => {
    const name = (req.employee?.firstName + ' ' + req.employee?.lastName).toLowerCase();
    const matchName = name.includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchName && matchStatus;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return map[status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';
  };

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (req: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
            {req.employee?.firstName?.[0] || 'E'}{req.employee?.lastName?.[0] || ''}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{req.employee?.firstName} {req.employee?.lastName}</div>
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{req.employee?.employeeCode}</div>
          </div>
        </div>
      )
    },
    {
      key: 'logDate',
      header: 'Log Date',
      render: (req: any) => (
        <div className="text-xs font-semibold text-[var(--text-primary)]">
          {req.attendanceLog?.date ? new Date(req.attendanceLog.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
        </div>
      )
    },
    {
      key: 'currentTimes',
      header: 'Current In/Out',
      render: (req: any) => (
        <div className="text-[11px] font-medium text-[var(--text-muted)] space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Clock size={10} className="text-emerald-500" />
            <span className="text-[var(--text-primary)]">In:</span> {fmtTime(req.attendanceLog?.checkIn)}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={10} className="text-red-400" />
            <span className="text-[var(--text-primary)]">Out:</span> {fmtTime(req.attendanceLog?.checkOut)}
          </div>
        </div>
      )
    },
    {
      key: 'requestedTimes',
      header: 'Requested In/Out',
      render: (req: any) => (
        <div className="text-[11px] font-medium text-amber-500 space-y-0.5">
          <div>In: {fmtTime(req.requestedCheckIn)}</div>
          <div>Out: {fmtTime(req.requestedCheckOut)}</div>
        </div>
      )
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (req: any) => (
        <p className="text-xs text-[var(--text-muted)] max-w-[160px] truncate" title={req.reason}>{req.reason || '—'}</p>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (req: any) => (
        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${statusBadge(req.status)}`}>
          {req.status?.replace('_', ' ') || '—'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => approveMutation.mutate(row.id)}
            disabled={approveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Check size={12} /> Approve
          </button>
          <button
            onClick={() => { if (window.confirm('Reject this correction request?')) rejectMutation.mutate(row.id); }}
            disabled={rejectMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <X size={12} /> Reject
          </button>
        </div>
      ),
    }
  ].filter(Boolean) as Column<any>[];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
             <RefreshCw size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Correction Request Approval</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and take action on attendance records.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
               Active Records
             </h3>
          </div>
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
                    {REQUEST_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold capitalize transition-colors ${statusFilter === opt ? 'text-blue-500 bg-blue-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}
                      >
                        {opt === 'all' ? 'All' : opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          <DataTable columns={columns} data={filteredRequests} loading={isLoading} keyField="id" emptyTitle="All caught up — no pending corrections" emptyMessage="New correction requests will appear here." />
        </div>
      </div>
    </div>
  );
}
