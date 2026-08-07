import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, FileClock, BadgeIndianRupee, Send, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { payrollApiExt } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { useToast } from '../../../../components/ui/ToastProvider';
import { MONTHS, currentMonthYear, fmtINR, SectionCard, MonthYearControls } from './shared';

export function AttendanceProcessSection() {
  const { month: m, year: y } = currentMonthYear();
  const [month, setMonth] = useState(m);
  const [year, setYear] = useState(y);
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-attendance-summary', month, year],
    queryFn: () => payrollApiExt.getAttendanceSummary(month, year),
  });
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employeeName || r.name || r.employeeId}</span> },
    { key: 'present', header: 'Present Days', render: (r: any) => <span className="font-semibold text-emerald-500">{r.presentDays ?? r.present ?? 0}</span> },
    { key: 'absent', header: 'Absent Days', render: (r: any) => <span className="font-semibold text-rose-500">{r.absentDays ?? r.absent ?? 0}</span> },
    { key: 'lop', header: 'LOP Days', render: (r: any) => <span className="font-semibold">{r.lopDays ?? r.lop ?? 0}</span> },
    { key: 'working', header: 'Working Days', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.workingDays ?? 0}</span> },
  ];
  return (
    <SectionCard title="Attendance Process" icon={CalendarClock} right={<MonthYearControls month={month} year={year} onMonth={setMonth} onYear={setYear} />}>
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="employeeId" emptyTitle="No attendance data" emptyMessage="Attendance summary will appear once the month is processed." />
    </SectionCard>
  );
}

export function RunPayrollSection() {
  const { month: m, year: y } = currentMonthYear();
  const [month, setMonth] = useState(m);
  const [year, setYear] = useState(y);
  const [regime, setRegime] = useState('old');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const runMutation = useMutation({
    mutationFn: () => payrollApiExt.runPayroll({ month, year, regime }),
    onSuccess: (res: any) => {
      success(res?.message || `Payroll run completed for ${MONTHS[month - 1]} ${year}`);
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
    },
    onError: (e: any) => error(e.message || 'Failed to run payroll'),
  });
  return (
    <SectionCard
      title="Run Payroll"
      icon={FileClock}
      right={
        <div className="flex flex-wrap gap-3">
          <MonthYearControls month={month} year={year} onMonth={setMonth} onYear={setYear} />
          <select value={regime} onChange={(e) => setRegime(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm">
            <option value="old">Old Regime</option>
            <option value="new">New Regime</option>
          </select>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50"
          >
            {runMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileClock size={14} />} Run Payroll
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Target Period</p>
          <p className="text-lg font-black text-[var(--text-primary)] mt-1">{MONTHS[month - 1]} {year}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Tax Regime</p>
          <p className="text-lg font-black text-[var(--text-primary)] mt-1 capitalize">{regime} regime</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Components</p>
          <p className="text-lg font-black text-[var(--text-primary)] mt-1">PF · ESI · PT · TDS · LOP</p>
        </div>
      </div>
    </SectionCard>
  );
}

function CycleStatusBadge({ status }: { status?: string }) {
  const color = status === 'processed' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'
    : status === 'locked' ? 'text-amber-500 border-amber-500/20 bg-amber-500/10'
    : 'text-indigo-500 border-indigo-500/20 bg-indigo-500/10';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${color}`}>
      {status || 'draft'}
    </span>
  );
}

export function ProcessedSection() {
  const { data: cycles, isLoading } = useQuery({ queryKey: ['payroll-cycles'], queryFn: payrollApiExt.listCycles });
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const lockMutation = useMutation({
    mutationFn: (id: string) => payrollApiExt.lockCycle(id),
    onSuccess: () => { success('Payroll cycle locked'); queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] }); },
    onError: (e: any) => error(e.message || 'Failed to lock cycle'),
  });
  const columns: Column<any>[] = [
    { key: 'label', header: 'Period', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{MONTHS[(r.month || 1) - 1]} {r.year}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <CycleStatusBadge status={r.status} /> },
    { key: 'count', header: 'Employees', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.payslipCount ?? r.count ?? 0}</span> },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(r.netPayTotal ?? r.netPay)}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button
          onClick={() => lockMutation.mutate(r.id)}
          disabled={lockMutation.isPending || r.status === 'locked' || r.status === 'processed'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 disabled:opacity-40"
        >
          <Lock size={12} /> {r.status === 'locked' ? 'Locked' : 'Lock'}
        </button>
      ),
    },
  ];
  return (
    <SectionCard title="View Processed Salary" icon={BadgeIndianRupee}>
      <DataTable columns={columns} data={cycles ?? []} loading={isLoading} keyField="id" emptyTitle="No payroll cycles" emptyMessage="Run payroll to generate a cycle." />
    </SectionCard>
  );
}

export function SendPayslipsSection() {
  const { data: cycles, isLoading } = useQuery({ queryKey: ['payroll-cycles'], queryFn: payrollApiExt.listCycles });
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const sendMutation = useMutation({
    mutationFn: (id: string) => payrollApiExt.sendPayslips(id),
    onSuccess: () => { success('Payslips sent'); queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] }); },
    onError: (e: any) => error(e.message || 'Failed to send payslips'),
  });
  const columns: Column<any>[] = [
    { key: 'label', header: 'Period', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{MONTHS[(r.month || 1) - 1]} {r.year}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <CycleStatusBadge status={r.status} /> },
    { key: 'count', header: 'Payslips', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.payslipCount ?? r.count ?? 0}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button
          onClick={() => sendMutation.mutate(r.id)}
          disabled={sendMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 disabled:opacity-50"
        >
          {sendMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Payslips
        </button>
      ),
    },
  ];
  return (
    <SectionCard title="Send Payslips" icon={Send}>
      <DataTable columns={columns} data={cycles ?? []} loading={isLoading} keyField="id" emptyTitle="No payroll cycles" emptyMessage="Run payroll before sending payslips." />
    </SectionCard>
  );
}
