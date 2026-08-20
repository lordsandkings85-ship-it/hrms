import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { attendanceApiExt, attendanceApi } from '../../../api/client';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock as ClockIcon, AlertCircle, Search, Users } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { getServerYear, getServerMonth } from '../../../utils/serverTime';

function useIsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.name?.toLowerCase() || '';
  return !!user?.isSuperAdmin || !!user?.role?.isSystem || ['admin','hr','human resource','manager'].some(r => role.includes(r));
}

function fmtDuration(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return '--';
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return '--';
  const mins = Math.round((b - a) / 60000);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function AdminSummary() {
  const [year, setYear] = useState(getServerYear());
  const [month, setMonth] = useState(getServerMonth());
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['attendance-team-report'],
    queryFn: async () => { const r = await attendanceApi.listToday(); return Array.isArray(r) ? r : []; },
    refetchInterval: 30000,
  });

  const filtered = (logs || []).filter((log: any) => {
    const name = ((log.employee?.firstName || '') + ' ' + (log.employee?.lastName || '')).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const summaryStats = {
    present: filtered.filter((l: any) => l.status === 'present' || l.status === 'late').length,
    absent: filtered.filter((l: any) => l.status === 'absent').length,
    late: filtered.filter((l: any) => l.status === 'late').length,
    onLeave: filtered.filter((l: any) => l.status === 'on_leave').length,
    total: filtered.length,
  };

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
    { key: 'checkIn', header: 'Check In', render: (row: any) => (
      <span className="font-mono text-xs text-emerald-500">
        {row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
      </span>
    )},
    { key: 'checkOut', header: 'Check Out', render: (row: any) => (
      <span className="font-mono text-xs text-rose-500">
        {row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
      </span>
    )},
    { key: 'hours', header: 'Hours', render: (row: any) => (
      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{fmtDuration(row.checkIn, row.checkOut)}</span>
    )},
    { key: 'method', header: 'Method', render: (row: any) => (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 capitalize">{row.method || 'WEB'}</span>
    )},
    { key: 'status', header: 'Status', render: (row: any) => {
      const map: Record<string, string> = {
        present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        absent: 'bg-red-500/10 text-red-500 border-red-500/20',
        half_day: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        on_leave: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      };
      return <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${map[row.status] || ''}`}>{row.status?.replace('_', ' ')}</span>;
    }},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Monthly Attendance Report</h1>
            <p className="text-sm text-slate-500">Team attendance summary and overview.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {Array.from({length: 12}).map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {[...Array(5)].map((_, i) => (
              <option key={i} value={getServerYear() - i}>{getServerYear() - i}</option>
            ))}
          </select>
        </div>
      </div>

      {logsLoading ? (
        <div className="flex justify-center p-12"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Present</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.present}</h2>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <XCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Absent</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.absent}</h2>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <ClockIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Late</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.late}</h2>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">On Leave</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summaryStats.onLeave}</h2>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Employee Details</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
              </div>
            </div>
            <DataTable columns={columns} data={filtered} loading={logsLoading} keyField="id" />
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeSummary() {
  const { user } = useAuthStore();
  const empId = user?.employee?.id;

  const [year, setYear] = useState(getServerYear());
  const [month, setMonth] = useState(getServerMonth());

  const { data: summary, isLoading } = useQuery({
    queryKey: ['attendance-summary', empId, year, month],
    queryFn: () => attendanceApiExt.getMonthlySummary(empId!, year, month),
    enabled: !!empId,
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Monthly Attendance Report</h1>
            <p className="text-sm text-slate-500">View your comprehensive attendance analytics.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {Array.from({length: 12}).map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {[...Array(5)].map((_, i) => (
              <option key={i} value={getServerYear() - i}>{getServerYear() - i}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Spinner size="lg" /></div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Present</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summary.present}</h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Absent</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summary.absent}</h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <ClockIcon size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Late</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summary.late}</h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">On Leave</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{summary.onLeave}</h2>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-12 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          No summary data found for this period.
        </div>
      )}
    </div>
  );
}

export default function SummaryPage() {
  return useIsAdmin() ? <AdminSummary /> : <EmployeeSummary />;
}
