import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, Filter, Search } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { attendanceApi } from '../../../api/client';
import { getServerNow, getServerDate } from '../../../utils/serverTime';
import { useAuthStore } from '../../../store/useAuthStore';
import { Spinner } from '../../../components/ui/Spinner';
import { fmtTime12 } from '../../../utils/formatDate';
import AbsentTodayPanel from '../../../components/attendance/AbsentTodayPanel';

function useIsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.name?.toLowerCase() || '';
  return !!user?.isSuperAdmin || !!user?.role?.isSystem || ['admin','hr','human resource','manager'].some(r => role.includes(r));
}

const STATUS_OPTIONS = ['all', 'present', 'late'];

function fmtTime(iso?: string | null) {
  return fmtTime12(iso);
}

function fmtDuration(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return '--';
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return '--';
  const mins = Math.round((b - a) / 60000);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function AdminDailyReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance-daily-report-admin'],
    queryFn: async () => { const r = await attendanceApi.listToday(); return Array.isArray(r) ? r : []; },
    refetchInterval: 30000,
  });

  const filtered = (logs || []).filter((log: any) => {
    const name = ((log.employee?.firstName || '') + ' ' + (log.employee?.lastName || '')).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) && (statusFilter === 'all' || log.status === statusFilter);
  });

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (log: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold text-xs flex items-center justify-center shrink-0">
          {log.employee?.firstName?.[0] || 'E'}{log.employee?.lastName?.[0] || ''}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)] truncate">{log.employee?.firstName} {log.employee?.lastName}</div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{log.employee?.employeeCode}</div>
        </div>
      </div>
    )},
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs font-bold">{row.date ? new Date(row.date).toLocaleDateString() : '--'}</span> },
    { key: 'in', header: 'Check In', render: (row: any) => <span className="font-mono text-xs text-emerald-500">{fmtTime(row.checkIn)}</span> },
    { key: 'out', header: 'Check Out', render: (row: any) => <span className="font-mono text-xs text-rose-500">{fmtTime(row.checkOut)}</span> },
    { key: 'total', header: 'Hours', render: (row: any) => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{fmtDuration(row.checkIn, row.checkOut)}</span> },
    { key: 'method', header: 'Method', render: (log: any) => <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 capitalize">{log.method || 'WEB'}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        row.status === 'present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
        row.status === 'late' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
        row.status === 'absent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
        row.status === 'half_day_leave' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
        'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>{row.status === 'half_day_leave' ? 'Present / Half Day' : row.status?.replace('_', ' ')}</span>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Daily Attendance Report</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Team daily punch records and net hours.</p>
          </div>
        </div>
      </div>

      <AbsentTodayPanel />

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Today's Records</h3>
          <div className="flex items-center gap-3">
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
                    {STATUS_OPTIONS.map(opt => (
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
        {isLoading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : (
          <DataTable columns={columns} data={filtered} loading={false} keyField="id" />
        )}
      </div>
    </div>
  );
}

function EmployeeDailyReport() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['attendance-daily-report', myEmpId, from, to],
    queryFn: () => attendanceApi.list(myEmpId, from || undefined, to || undefined),
    enabled: !!myEmpId,
  });

  const setThisMonth = () => {
    const now = getServerNow();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const fmtLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFrom(fmtLocal(first));
    setTo(getServerDate());
  };

  const rows = (Array.isArray(logs) ? logs : [])
    .filter((l: any) => statusFilter === 'all' || l.status === statusFilter)
    .map((l: any) => ({
    id: l.id,
    date: new Date(l.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    in: fmtTime(l.checkIn),
    out: fmtTime(l.checkOut),
    total: fmtDuration(l.checkIn, l.checkOut),
    status: l.status === 'absent' ? 'Absent'
      : l.status === 'half_day' ? 'Half Day'
      : l.status === 'late' ? 'Late'
      : l.status === 'on_leave' ? 'On Leave'
      : 'Present',
    actualStatus: l.status,
  }));

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs font-bold">{row.date}</span> },
    { key: 'in', header: 'First In', render: (row: any) => <span className="font-mono text-xs text-emerald-500">{row.in}</span> },
    { key: 'out', header: 'Last Out', render: (row: any) => <span className="font-mono text-xs text-rose-500">{row.out}</span> },
    { key: 'total', header: 'Total Hours', render: (row: any) => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{row.total}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        row.actualStatus === 'absent' ? 'bg-rose-500/10 text-rose-500' :
        row.actualStatus === 'late' ? 'bg-amber-500/10 text-amber-500' :
        row.actualStatus === 'on_leave' ? 'bg-indigo-500/10 text-indigo-500' :
        row.actualStatus === 'half_day' ? 'bg-blue-500/10 text-blue-500' :
        'bg-emerald-500/10 text-emerald-500'}`}>
        {row.status}
      </span>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Daily Timesheet Report</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Live view of your daily punches and net hours.</p>
          </div>
        </div>
        <div className="relative z-10 flex gap-2">
           <div className="relative">
             <button onClick={() => setFilterOpen(o => !o)} className="px-4 py-2 border border-[var(--border)] bg-[var(--surface-alt)] rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[var(--surface-hover)]">
               <Filter size={16} /> Filter
             </button>
             {filterOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                 <div className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-1">
                   {STATUS_OPTIONS.map(opt => (
                     <button key={opt} onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                       className={`w-full text-left px-4 py-2 text-xs font-semibold capitalize transition-colors ${statusFilter === opt ? 'text-indigo-500 bg-indigo-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}>
                       {opt === 'all' ? 'All' : opt.replace('_', ' ')}
                     </button>
                   ))}
                 </div>
               </>
             )}
           </div>
           <button onClick={setThisMonth} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-600 shadow-sm">
             <Calendar size={16} /> This Month
           </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : (
          <DataTable columns={columns} data={rows} loading={false} keyField="id" />
        )}
      </div>
    </div>
  );
}

export default function DailyReportPage() {
  return useIsAdmin() ? <AdminDailyReport /> : <EmployeeDailyReport />;
}
