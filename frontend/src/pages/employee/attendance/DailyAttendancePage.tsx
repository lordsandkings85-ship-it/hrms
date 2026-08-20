import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { attendanceApi, employeesApi } from '../../../api/client';
import { Clock, Fingerprint, Calendar as CalendarIcon, LogIn, LogOut, PlusCircle, Search, Filter, Loader2 } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastProvider';
import { Modal } from '../../../components/ui/Modal';
import { getServerDate } from '../../../utils/serverTime';
import { fmtDate } from '../../../utils/formatDate';

function useIsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.name?.toLowerCase() || '';
  return !!user?.isSuperAdmin || !!user?.role?.isSystem || ['admin','hr','human resource','manager'].some(r => role.includes(r));
}

function AdminDailyAttendance() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [date, setDate] = useState(getServerDate);
  const [time, setTime] = useState('');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [reason, setReason] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => { const r = await attendanceApi.listToday(); return Array.isArray(r) ? r : []; },
    refetchInterval: 30000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 200 }),
  });
  const employees = employeesData?.items || [];

  const markMutation = useMutation({
    mutationFn: (payload: { employeeId: string; date: string; time: string; type: 'IN' | 'OUT'; reason: string }) =>
      attendanceApi.manualPunch(payload),
    onSuccess: () => {
      toastSuccess('Attendance marked');
      setModalOpen(false); setSelectedEmpId(''); setTime(''); setReason('');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed'),
  });

  const filteredLogs = (logs || []).filter((log: any) => {
    const name = (log.employee?.firstName + ' ' + log.employee?.lastName).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) && (statusFilter === 'all' || log.status === statusFilter);
  });

  const columns: Column<any>[] = [
    {
      key: 'employee', header: 'Employee',
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
      key: 'method', header: 'Method',
      render: (log: any) => (
        <div className="text-xs">
          <span className="capitalize block font-semibold text-[var(--text-primary)]">{log.method}</span>
          {log.isWithinGeofence === true && <span className="text-emerald-500 block mt-0.5 font-bold">In-zone</span>}
          {log.isWithinGeofence === false && <span className="text-amber-500 block mt-0.5 font-bold">Out-zone</span>}
        </div>
      )
    },
    {
      key: 'status', header: 'Status',
      render: (log: any) => {
        const map: Record<string, string> = {
          present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          absent: 'bg-red-500/10 text-red-500 border-red-500/20',
          half_day: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          on_leave: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        };
        return <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${map[log.status] || ''}`}>{log.status?.replace('_', ' ')}</span>;
      }
    },
    {
      key: 'time', header: 'Check In/Out',
      render: (log: any) => (
        <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
          <div><span className="text-[var(--text-primary)]">In:</span> {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}</div>
          <div><span className="text-[var(--text-primary)]">Out:</span> {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}</div>
        </div>
      )
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">Apply Attendance</h1>
            <p className="text-sm text-slate-500 font-medium">Mark and manage employee attendance records.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Today's Records</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
              <PlusCircle size={14} /> Mark Attendance
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors w-64" />
            </div>
            <div className="relative">
              <button onClick={() => setFilterOpen(o => !o)} className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 transition-colors bg-[var(--surface-alt)]">
                <Filter size={16} />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-1">
                    {['all', 'present', 'late', 'absent', 'half_day', 'on_leave'].map(opt => (
                      <button key={opt} onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold capitalize transition-colors ${statusFilter === opt ? 'text-indigo-500 bg-indigo-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}>
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
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; padding: 0 16px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 800; border-bottom: 1px solid var(--border); text-align: left; }
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
            <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50">
              <option value="">Select employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50">
              <option value="IN">IN</option><option value="OUT">OUT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Reason</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for manual mark..."
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">Cancel</button>
            <button onClick={() => markMutation.mutate({ employeeId: selectedEmpId, date, time, type, reason })}
              disabled={!selectedEmpId || !time || markMutation.isPending}
              className="px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5">
              {markMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Marking...</> : 'Mark Attendance'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmployeeDailyAttendance() {
  const { user } = useAuthStore();
  const empId = user?.employee?.id;
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => getServerDate());

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance', empId, selectedDate],
    queryFn: () => attendanceApi.list(empId!, selectedDate, selectedDate),
    enabled: !!empId && !!selectedDate,
  });

  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn({ employeeId: empId!, method: 'WEB' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance', empId] }); queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); },
    onError: (err: any) => toastError(err.message || 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (logId: string) => attendanceApi.checkOut(logId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance', empId] }); queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); },
    onError: (err: any) => toastError(err.message || 'Check-out failed'),
  });

  const activeLog = logs?.find((l: any) => !l.checkOut);

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-bold text-slate-800 dark:text-slate-200">{fmtDate(row.date)}</span> },
    { key: 'checkIn', header: 'Check In', render: (row: any) => (
      <div className="flex items-center gap-2"><LogIn size={14} className="text-emerald-500" /><span className="font-mono text-sm">{row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : '--'}</span></div>
    ) },
    { key: 'checkOut', header: 'Check Out', render: (row: any) => (
      <div className="flex items-center gap-2"><LogOut size={14} className="text-rose-500" /><span className="font-mono text-sm">{row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : '--'}</span></div>
    ) },
    { key: 'method', header: 'Method', render: (row: any) => <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">{row.method || 'WEB'}</span> },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status || 'present'} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-5 w-full">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner shrink-0">
            <Clock size={28} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">Daily Attendance</h1>
            <p className="text-sm text-slate-500 font-medium">Record and track your daily work hours.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending || !!activeLog}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm shadow-indigo-600/20 transition-all">
              <Fingerprint size={16} /> {checkInMutation.isPending ? 'Logging...' : 'Web Check-In'}
            </button>
            <button onClick={() => activeLog && checkOutMutation.mutate(activeLog.id)} disabled={checkOutMutation.isPending || !activeLog}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 dark:border-rose-500/20 rounded-xl font-bold transition-all">
              <LogOut size={16} /> {checkOutMutation.isPending ? 'Logging...' : 'Web Check-Out'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <CalendarIcon size={14} className="text-slate-400" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium bg-transparent border-none focus:ring-0 p-0 w-32 text-slate-700 dark:text-slate-300" />
          </div>
        </div>
        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; padding: 0 16px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 800; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          <DataTable columns={columns} data={logs || []} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}

export default function DailyAttendancePage() {
  return useIsAdmin() ? <AdminDailyAttendance /> : <EmployeeDailyAttendance />;
}
