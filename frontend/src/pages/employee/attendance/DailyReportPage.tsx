import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, Filter } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { attendanceApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { Spinner } from '../../../components/ui/Spinner';

function fmtTime(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDuration(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return '-';
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return '-';
  const mins = Math.round((b - a) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function DailyReportPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['attendance-daily-report', myEmpId],
    queryFn: () => attendanceApi.list(myEmpId),
    enabled: !!myEmpId,
  });

  const rows = (Array.isArray(logs) ? logs : []).map((l: any) => ({
    id: l.id,
    date: new Date(l.date).toISOString().slice(0, 10),
    in: fmtTime(l.checkIn),
    out: fmtTime(l.checkOut),
    total: fmtDuration(l.checkIn, l.checkOut),
    status: l.status === 'absent' ? 'Absent' : l.status === 'half_day' ? 'Half Day' : 'Present',
    actualStatus: l.status,
  }));

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs font-bold">{row.date}</span> },
    { key: 'in', header: 'First In', render: (row: any) => <span className="font-mono text-xs text-emerald-500">{row.in}</span> },
    { key: 'out', header: 'Last Out', render: (row: any) => <span className="font-mono text-xs text-rose-500">{row.out}</span> },
    { key: 'total', header: 'Total Hours', render: (row: any) => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{row.total}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.actualStatus === 'absent' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
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
           <button className="px-4 py-2 border border-[var(--border)] bg-[var(--surface-alt)] rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[var(--surface-hover)]">
             <Filter size={16} /> Filter
           </button>
           <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-600 shadow-sm">
             <Calendar size={16} /> This Month
           </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : (
          <div className="premium-datatable">
             <DataTable columns={columns} data={rows} loading={false} keyField="id" />
          </div>
        )}
      </div>
    </div>
  );
}
