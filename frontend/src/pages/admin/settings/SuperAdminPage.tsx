import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, HardDrive, Cpu, Terminal, Building, Loader2, Database, CalendarDays, ListChecks, Search, Users } from 'lucide-react';
import { superAdminApi } from '../../../api/client';
import { fmtDate, fmtDateTime, fmtTime12 } from '../../../utils/formatDate';
import { DataTable, Column } from '../../../components/ui/DataTable';

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  present: { label: 'P', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' },
  late: { label: 'L', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
  half_day: { label: 'HD', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
  half_day_leave: { label: 'HD', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
  on_leave: { label: 'OL', cls: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/25' },
  absent: { label: 'A', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/25' },
};

function statusLabel(status?: string) {
  return STATUS_META[status ?? ''] || { label: (status ?? '').replace('_', ' ').slice(0, 2).toUpperCase() || '·', cls: 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]' };
}

function fmtDuration(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return '--';
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return '--';
  const mins = Math.round((b - a) / 60000);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function AttendancePanel({ tenants }: { tenants: any[] }) {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState('');
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(() => toLocalDateStr(new Date()));
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!tenantId && tenants.length > 0) setTenantId(tenants[0].id);
  }, [tenants, tenantId]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);

  const { data: dailyLogs, isLoading: dailyLoading } = useQuery({
    queryKey: ['superadmin-attendance-daily', tenantId, date],
    queryFn: () => superAdminApi.attendanceDaily(tenantId, date),
    enabled: mode === 'daily' && !!tenantId,
  });

  const { data: monthLogs, isLoading: monthLoading } = useQuery({
    queryKey: ['superadmin-attendance-monthly', tenantId, year, month],
    queryFn: () => superAdminApi.attendanceMonthly(tenantId, year, month),
    enabled: mode === 'monthly' && !!tenantId,
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayIndices = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const dailyColumns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (log: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold text-xs flex items-center justify-center shrink-0">
          {log.employee?.firstName?.[0] || 'E'}{log.employee?.lastName?.[0] || ''}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)] truncate">{log.employee?.firstName} {log.employee?.lastName}</div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{log.employee?.employeeCode} · {log.employee?.department?.name || 'No dept'}</div>
        </div>
      </div>
    )},
    { key: 'method', header: 'Method', render: (log: any) => (
      <div className="text-xs">
        <span className="capitalize block font-semibold text-[var(--text-primary)]">{log.method}</span>
        {log.isWithinGeofence === true && <span className="text-emerald-500 block mt-0.5 font-bold">In-zone</span>}
        {log.isWithinGeofence === false && <span className="text-amber-500 block mt-0.5 font-bold">Out-zone</span>}
      </div>
    )},
    { key: 'time', header: 'Check In/Out', render: (log: any) => (
      <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
        <div><span className="text-[var(--text-primary)]">In:</span> {log.checkIn ? fmtTime12(log.checkIn) : '—'}</div>
        <div><span className="text-[var(--text-primary)]">Out:</span> {log.checkOut ? fmtTime12(log.checkOut) : 'Pending'}</div>
      </div>
    )},
    { key: 'hours', header: 'Hours', render: (log: any) => (
      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{fmtDuration(log.checkIn, log.checkOut)}</span>
    )},
    { key: 'status', header: 'Status', render: (log: any) => {
      const map: Record<string, string> = {
        present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        absent: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        half_day: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        half_day_leave: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        on_leave: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      };
      return <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${map[log.status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]'}`}>
        {log.status === 'half_day_leave' ? 'Present / Half Day' : String(log.status ?? '').replace('_', ' ')}
      </span>;
    }},
  ];

  const monthlyRows = useMemo(() => {
    const logs = Array.isArray(monthLogs) ? monthLogs : [];
    const byEmployee = new Map<string, { name: string; code?: string; dept?: string; dayMap: Map<number, any>; present: number; late: number; half: number; leave: number; absent: number; worked: number }>();
    for (const log of logs) {
      if (!log.employeeId) continue;
      const d = new Date(log.date).getDate();
      let row = byEmployee.get(log.employeeId);
      if (!row) {
        row = {
          name: `${log.employee?.firstName ?? ''} ${log.employee?.lastName ?? ''}`.trim() || 'Unknown',
          code: log.employee?.employeeCode,
          dept: log.employee?.department?.name || '--',
          dayMap: new Map(),
          present: 0, late: 0, half: 0, leave: 0, absent: 0, worked: 0,
        };
        byEmployee.set(log.employeeId, row);
      }
      const existing = row.dayMap.get(d);
      if (!existing) row.dayMap.set(d, log);
      else if ((log.status === 'late' || log.status === 'half_day') && existing.status === 'present') row.dayMap.set(d, log);
    }
    for (const row of byEmployee.values()) {
      for (const log of Array.from(row.dayMap.values())) {
        row.worked++;
        if (log.status === 'present') row.present++;
        else if (log.status === 'late') row.late++;
        else if (log.status === 'half_day' || log.status === 'half_day_leave') row.half++;
        else if (log.status === 'on_leave') row.leave++;
        else if (log.status === 'absent') row.absent++;
      }
    }
    return Array.from(byEmployee.values())
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || (r.code || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [monthLogs, search]);

  const renderCell = (dayLog?: any, dow?: number) => {
    if (dow === 0 || dow === 6) {
      return <div className="w-7 h-7 mx-auto flex items-center justify-center text-[10px] font-bold text-slate-400/60 dark:text-slate-600 rounded">{dayLog ? statusLabel(dayLog.status).label : 'W'}</div>;
    }
    if (!dayLog) return <div className="w-7 h-7 mx-auto flex items-center justify-center text-gray-300 dark:text-slate-700 rounded">·</div>;
    const meta = statusLabel(dayLog.status);
    return <div className={`w-7 h-7 mx-auto flex items-center justify-center text-[10px] font-bold rounded-md border ${meta.cls}`} title={`${dayLog.checkIn ? fmtTime12(dayLog.checkIn) : '--'} → ${dayLog.checkOut ? fmtTime12(dayLog.checkOut) : '--'} (${dayLog.status})`}>{meta.label}</div>;
  };

  const legend: { key: string; label: string; cls: string }[] = [
    { key: 'present', label: 'Present', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' },
    { key: 'late', label: 'Late', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
    { key: 'half', label: 'Half Day', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
    { key: 'leave', label: 'On Leave', cls: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/25' },
    { key: 'absent', label: 'Absent', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/25' },
    { key: 'weekend', label: 'Weekend / No data', cls: 'bg-[var(--surface-alt)] text-[var(--text-muted)]' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="text-indigo-500" size={20} /> Tenant Attendance
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Day-wise attendance for any tenant workspace (read-only).</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMode('daily')}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2 ${mode === 'daily' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500'}`}>
              <ListChecks size={16} /> Daily
            </button>
            <button onClick={() => setMode('monthly')}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2 ${mode === 'monthly' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500'}`}>
              <CalendarDays size={16} /> Monthly Grid
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}
            className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors">
            {!tenantId && <option value="">Select tenant…</option>}
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t._count?.employees ? ` (${t._count.employees} emp)` : ''}</option>
            ))}
          </select>

          {mode === 'daily' ? (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors" />
          ) : (
            <div className="flex items-center gap-2">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors">
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors">
                {[...Array(5)].map((_, i) => (
                  <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search employee…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors" />
          </div>
        </div>

        {!tenantId ? (
          <div className="text-center py-12 text-sm font-semibold text-[var(--text-muted)]">Select a tenant workspace to load attendance.</div>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {selectedTenant ? `${selectedTenant.name}` : ''} — {mode === 'daily'
                ? `Attendance for ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}`
                : `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year} — ${daysInMonth} days`}
            </span>
          </div>
        )}

        {tenantId && (
          <div className="premium-datatable">
            <style>{`
              .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
              .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
              .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
              .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
              .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
              .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
              .premium-datatable .grid-table { min-width: 100%; }
              .premium-datatable .grid-table th, .premium-datatable .grid-table td { text-align: center; }
              .premium-datatable .grid-table th:first-child, .premium-datatable .grid-table td:first-child { text-align: left; }
              .premium-datatable .grid-table td.first-cell { padding: 12px 16px; }
            `}</style>

            {mode === 'daily' ? (
              dailyLoading ? (
                <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable columns={dailyColumns} data={Array.isArray(dailyLogs) ? dailyLogs : []} loading={false} keyField="id" />
                </div>
              )
            ) : monthLoading ? (
              <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
            ) : monthlyRows.length === 0 ? (
              <div className="text-center py-12 text-sm font-semibold text-[var(--text-muted)]">No attendance records for this period.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  {legend.map((l) => (
                    <span key={l.key} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <span className={`w-4 h-4 rounded border ${l.cls}`} /> {l.label}
                    </span>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="grid-table">
                    <thead>
                      <tr>
                        <th className="min-w-[220px]">Employee</th>
                        {dayIndices.map((d) => {
                          const dow = new Date(year, month - 1, d).getDay();
                          return <th key={d} className={dow === 0 || dow === 6 ? 'text-slate-400' : ''}>{d}</th>;
                        })}
                        <th>P</th><th>L</th><th>HD</th><th>OL</th><th>A</th><th>Wd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map((row) => (
                        <tr key={`${row.name}-${row.code}`}>
                          <td className="first-cell">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{row.name}</div>
                            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{row.code} · {row.dept}</div>
                          </td>
                          {dayIndices.map((d) => renderCell(row.dayMap.get(d), new Date(year, month - 1, d).getDay()))}
                          <td><span className="text-[10px] font-bold text-emerald-500">{row.present}</span></td>
                          <td><span className="text-[10px] font-bold text-amber-500">{row.late}</span></td>
                          <td><span className="text-[10px] font-bold text-blue-500">{row.half}</span></td>
                          <td><span className="text-[10px] font-bold text-indigo-500">{row.leave}</span></td>
                          <td><span className="text-[10px] font-bold text-rose-500">{row.absent}</span></td>
                          <td><span className="text-[10px] font-bold text-[var(--text-primary)]">{row.worked}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const { sub } = useParams<{ sub?: string }>();
  const activeTab = sub === 'attendance' ? 'attendance' : 'overview';

  const { data: tenants, isLoading: isLoadingTenants } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: () => superAdminApi.listTenants(),
  });

  const { data: health, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['superadmin-health'],
    queryFn: () => superAdminApi.health(),
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['superadmin-audit-logs'],
    queryFn: () => superAdminApi.auditLogs(),
  });

  const tenantColumns: Column<any>[] = [
    { key: 'name', header: 'Tenant Workspace', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.name}</span> },
    { key: 'id', header: 'Tenant ID', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)] font-bold">{row.id}</span> },
    { key: 'createdAt', header: 'Provisioned', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)]">{fmtDate(row.createdAt)}</span> },
  ];

  const logColumns: Column<any>[] = [
    { key: 'action', header: 'Event', render: (row) => <span className="font-mono text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">[{row.action}]</span> },
    { key: 'details', header: 'Details', render: (row) => (
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)]">{row.entity} updated (ID: {row.entityId || 'N/A'})</div>
        <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 uppercase">User ID: {row.userId || 'System'}</div>
      </div>
    )},
    { key: 'tenant', header: 'Tenant ID', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)] font-bold">{row.companyId}</span> },
    { key: 'timestamp', header: 'Timestamp', render: (row) => <span className="font-mono text-[10px] text-[var(--text-muted)]">{fmtDateTime(row.createdAt)}</span> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Super Admin Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Global tenant workspace management and master telemetry metrics.</p>
          </div>
        </div>
        <div className="relative z-10 flex gap-2">
          <button onClick={() => navigate('/super-admin')}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${activeTab === 'overview' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500'}`}>
            Overview
          </button>
          <button onClick={() => navigate('/super-admin/attendance')}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500'}`}>
            <CalendarDays size={16} /> Attendance
          </button>
        </div>
      </div>

      {activeTab === 'attendance' ? (
        <AttendancePanel tenants={Array.isArray(tenants) ? tenants : []} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl">
                <Cpu size={24} />
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">Core Telemetry</div>
                <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1 flex items-center gap-2">
                  {isLoadingHealth ? <Loader2 size={16} className="animate-spin" /> : (health?.uptime ? `Uptime: ${Math.round(health.uptime / 60)}m` : 'Healthy (NestJS)')}
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-500 rounded-xl">
                <HardDrive size={24} />
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">Active Workspaces</div>
                <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1 flex items-center gap-2">
                  {isLoadingTenants ? <Loader2 size={16} className="animate-spin" /> : `${tenants?.length || 0} Tenants`}
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">Database Engine</div>
                <div className="text-sm font-bold font-mono text-[var(--text-primary)] mt-1 truncate">
                  hrms_saas@postgresql
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
                 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   <Building className="text-indigo-500" size={20} /> Provisioned Tenants
                 </h3>
                 <div className="premium-datatable">
                   <style>{`
                      .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                      .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                      .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                      .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                      .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                      .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
                   `}</style>
                   <DataTable columns={tenantColumns} data={Array.isArray(tenants) ? tenants : []} loading={isLoadingTenants} keyField="id" />
                 </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
                 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   <Terminal className="text-indigo-500" size={20} /> Global Audit Firehose
                 </h3>
                 <div className="premium-datatable">
                   <DataTable columns={logColumns} data={Array.isArray(logs) ? logs : []} loading={isLoadingLogs} keyField="id" />
                 </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}