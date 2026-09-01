import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { attendanceApi, employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastProvider';
import { getServerDate } from '../../../utils/serverTime';
import { fmtTime12 } from '../../../utils/formatDate';

const STATUS_OPTIONS = ['all', 'present', 'late', 'absent', 'half_day', 'on_leave'];

export default function MarkAttendanceApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(getServerDate());
  const [time, setTime] = useState('');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await attendanceApi.listToday();
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 30000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 100 }),
  });
  const employees = employeesData?.items || [];

  const markMutation = useMutation({
    mutationFn: (payload: { employeeId: string; date: string; time: string; type: 'IN' | 'OUT'; reason: string }) =>
      attendanceApi.manualPunch(payload),
    onSuccess: () => {
      toastSuccess('Attendance marked');
      setModalOpen(false);
      setEmployeeId('');
      setTime('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to mark attendance'),
  });

  const filteredLogs = (logs || []).filter((log: any) => {
    const name = (log.employee?.firstName + ' ' + log.employee?.lastName).toLowerCase();
    const matchName = name.includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchName && matchStatus;
  });

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (log: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
            {log.employee?.firstName?.[0] || 'E'}{log.employee?.lastName?.[0] || ''}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{log.employee?.firstName} {log.employee?.lastName}</div>
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{log.employee?.employeeCode}</div>
          </div>
        </div>
      )
    },
    {
      key: 'method',
      header: 'Method',
      render: (log: any) => (
        <div className="text-xs">
          <span className="capitalize block font-semibold text-[var(--text-primary)]">{log.method}</span>
          {log.isWithinGeofence === true && <span className="text-emerald-500 block mt-0.5 font-bold">✅ In-zone</span>}
          {log.isWithinGeofence === false && <span className="text-amber-500 block mt-0.5 font-bold">⚠️ Out-zone</span>}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (log: any) => {
        const map: Record<string, string> = {
          present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          absent: 'bg-red-500/10 text-red-500 border-red-500/20',
          half_day: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          on_leave: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        };
        const statusClass = map[log.status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';
        return <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${statusClass}`}>{log.status?.replace('_', ' ')}</span>;
      }
    },
    {
      key: 'time',
      header: 'Check In/Out',
      render: (log: any) => (
        <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
          <div><span className="text-[var(--text-primary)]">In:</span> {log.checkIn ? fmtTime12(log.checkIn) : '—'}</div>
          <div><span className="text-[var(--text-primary)]">Out:</span> {log.checkOut ? fmtTime12(log.checkOut) : 'Pending'}</div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        row.method === 'MANUAL' ? (
          <span className="inline-flex items-center px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider">
            Manual mark
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Check In</span>
        )
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
             <PlusCircle size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Mark Attendance Approval</h1>
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
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              <PlusCircle size={14} /> Mark Attendance
            </button>
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
                    {STATUS_OPTIONS.map(opt => (
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
        
        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          <DataTable columns={columns} data={filteredLogs} loading={isLoading} keyField="id" />
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Mark Attendance">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
            >
              <option value="">Select employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for manual mark..."
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => markMutation.mutate({ employeeId, date, time, type, reason })}
              disabled={!employeeId || !time || markMutation.isPending}
              className="px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markMutation.isPending ? 'Marking...' : 'Mark Attendance'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
