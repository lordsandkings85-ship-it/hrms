import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, FileClock, BadgeIndianRupee, Send, Loader2, Lock, Calculator, FileText, Download } from 'lucide-react';
import JSZip from 'jszip';
import { payrollApi, payrollApiExt } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { Modal } from '../../../../components/ui/Modal';
import { useToast } from '../../../../components/ui/ToastProvider';
import { MONTHS, currentMonthYear, fmtINR, SectionCard, MonthYearControls, EmployeeSelect, useEmployeeList } from './shared';
import { fmtDate } from '../../../../utils/formatDate';
import { generatePayslipPDF } from '../../../../utils/payslipPDF';
import { useAuthStore } from '../../../../store/useAuthStore';

export function AttendanceProcessSection() {
  const { month: m, year: y } = currentMonthYear();
  const [month, setMonth] = useState(m);
  const [year, setYear] = useState(y);
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-attendance-summary', month, year],
    queryFn: () => payrollApiExt.getAttendanceSummary(month, year),
  });
  const columns: Column<any>[] = [
    { key: 'employeeCode', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employeeCode || r.id}</span> },
    { key: 'present', header: 'Present Days', render: (r: any) => <span className="font-semibold text-emerald-500">{r.present ?? 0}</span> },
    { key: 'absent', header: 'Absent Days', render: (r: any) => <span className="font-semibold text-rose-500">{r.absent ?? 0}</span> },
    { key: 'lop', header: 'LOP Days', render: (r: any) => <span className="font-semibold">{r.lop ?? 0}</span> },
    { key: 'totalDays', header: 'Working Days', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.totalDays ?? 0}</span> },
  ];
  return (
    <SectionCard title="Attendance Process" icon={CalendarClock} right={<MonthYearControls month={month} year={year} onMonth={setMonth} onYear={setYear} />}>
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="employeeId" emptyTitle="No attendance data" emptyMessage="Attendance summary will appear once the month is processed." />
    </SectionCard>
  );
}

function PreviewStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{label}</p>
      <p className={`text-base font-black mt-0.5 ${accent ?? 'text-[var(--text-primary)]'}`}>{value}</p>
    </div>
  );
}

export function RunPayrollSection() {
  const { month: m, year: y } = currentMonthYear();
  const [month, setMonth] = useState(m);
  const [year, setYear] = useState(y);
  const [regime, setRegime] = useState('old');
  const employees = useEmployeeList();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const runMutation = useMutation({
    mutationFn: (ids?: string[]) => payrollApiExt.runPayroll({ month, year, regime, employeeIds: ids && ids.length ? ids : undefined }),
    onSuccess: (res: any, ids?: string[]) => {
      success(ids && ids.length ? `Payroll run completed for ${ids.length} employee(s)` : (res?.message || `Payroll run completed for ${MONTHS[month - 1]} ${year}`));
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
    },
    onError: (e: any) => error(e.message || 'Failed to run payroll'),
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEmployeeId, setPreviewEmployeeId] = useState('');
  const [previewForm, setPreviewForm] = useState({ basic: 0, hra: 0, da: 0, conveyance: 0, medical: 0, specialAllowance: 0, section80C: 0, section80D: 0 });
  const { data: previewStructure } = useQuery({
    queryKey: ['preview-salary-structure', previewEmployeeId],
    queryFn: () => payrollApi.getSalaryStructure(previewEmployeeId),
    enabled: previewOpen && !!previewEmployeeId,
  });
  useEffect(() => {
    const s = previewStructure as any;
    if (!s) return;
    setPreviewForm((prev) => ({
      basic: s.basic ?? 0, hra: s.hra ?? 0, da: s.da ?? 0, conveyance: s.conveyance ?? 0,
      medical: s.medical ?? 0, specialAllowance: s.specialAllowance ?? 0,
      section80C: prev.section80C, section80D: prev.section80D,
    }));
  }, [previewStructure]);
  const previewMutation = useMutation({
    mutationFn: () => payrollApiExt.taxPreview({ ...previewForm, regime }),
    onError: (e: any) => error(e.message || 'Failed to compute tax preview'),
  });
  const previewFields = [
    { key: 'basic', label: 'Basic Pay' },
    { key: 'hra', label: 'HRA' },
    { key: 'da', label: 'DA' },
    { key: 'conveyance', label: 'Conveyance' },
    { key: 'medical', label: 'Medical' },
    { key: 'specialAllowance', label: 'Special Allowance' },
  ] as const;
  const tax = previewMutation.data as any;

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
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--text-muted)] rounded-xl hover:text-indigo-500 hover:border-indigo-500/30 text-xs font-bold uppercase tracking-wider"
          >
            <Calculator size={14} /> Preview Tax
          </button>
          <button
            onClick={() => runMutation.mutate(selectedIds.length ? selectedIds : undefined)}
            disabled={runMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50"
          >
            {runMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileClock size={14} />} Run Payroll{selectedIds.length ? ` (${selectedIds.length})` : ''}
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

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={employees.length > 0 && selectedIds.length === employees.length}
              onChange={(e) => setSelectedIds(e.target.checked ? employees.map((x: any) => x.id) : [])}
              className="w-4 h-4 rounded border border-[var(--border)] accent-indigo-500 cursor-pointer"
            />
            <span className="font-bold text-[var(--text-primary)]">Select all ({employees.length})</span>
          </label>
          <button
            onClick={() => setSelectedIds(selectedIds.length ? [] : employees.map((x: any) => x.id))}
            className="text-xs font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-700"
          >
            {selectedIds.length ? 'Clear all' : 'All'}
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[var(--border)]">
          <table className="data-table w-full">
            <thead className="sticky top-0 bg-[var(--surface-alt)] z-10">
              <tr>
                <th className="w-10"><span className="sr-only">Select</span></th>
                <th className="text-left">Employee</th>
                <th className="text-left hidden sm:table-cell">Department</th>
                <th className="text-left hidden md:table-cell">Designation</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e: any) => {
                const checked = selectedIds.includes(e.id);
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedIds((ids) => (checked ? ids.filter((i) => i !== e.id) : [...ids, e.id]))}
                    className={`transition-colors cursor-pointer hover:bg-surface-hover ${checked ? 'bg-indigo-500/5' : ''}`}
                  >
                    <td className="text-center" onClick={(ev) => ev.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedIds((ids) => (checked ? ids.filter((i) => i !== e.id) : [...ids, e.id]))}
                        className="w-4 h-4 rounded border border-[var(--border)] accent-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td>
                      <div className="font-bold text-[var(--text-primary)]">{e.firstName} {e.lastName}</div>
                      <div className="text-xs text-[var(--text-muted)]">{e.employeeCode || e.employeeId || '—'}</div>
                    </td>
                    <td className="hidden sm:table-cell text-xs text-[var(--text-muted)]">{e.department?.name || '—'}</td>
                    <td className="hidden md:table-cell text-xs text-[var(--text-muted)]">{e.designation?.title || '—'}</td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-[var(--text-muted)]">No active employees available to run payroll for.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          {selectedIds.length > 0
            ? `Run Payroll will process only the ${selectedIds.length} selected employee(s).`
            : "Select one or more employees above. Leave empty to run payroll for all active employees."}
        </p>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`Tax Preview — ${MONTHS[month - 1]} ${year}`} size="lg">
        <div className="space-y-4">
          <EmployeeSelect value={previewEmployeeId} onChange={setPreviewEmployeeId} label="Select employee to pre-fill salary…" />
          <div className="grid grid-cols-2 gap-3">
            {previewFields.map((f) => (
              <label key={f.key} className="block">
                <span className="text-xs font-bold text-[var(--text-primary)]">{f.label}</span>
                <input
                  type="number"
                  min={0}
                  value={previewForm[f.key] || ''}
                  onChange={(e) => setPreviewForm({ ...previewForm, [f.key]: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono text-right focus:outline-none focus:border-indigo-500"
                />
              </label>
            ))}
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-primary)]">Section 80C (annual)</span>
              <input
                type="number"
                min={0}
                value={previewForm.section80C || ''}
                onChange={(e) => setPreviewForm({ ...previewForm, section80C: Number(e.target.value) })}
                className="mt-1 w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono text-right focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-primary)]">Section 80D (annual)</span>
              <input
                type="number"
                min={0}
                value={previewForm.section80D || ''}
                onChange={(e) => setPreviewForm({ ...previewForm, section80D: Number(e.target.value) })}
                className="mt-1 w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono text-right focus:outline-none focus:border-indigo-500"
              />
            </label>
          </div>
          <button
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {previewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />} Compute Preview
          </button>
          {tax && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-3">Tax Summary — {regime} regime</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <PreviewStat label="Gross Annual" value={fmtINR(tax.grossAnnual)} />
                <PreviewStat label="Taxable Income" value={fmtINR(tax.taxableIncome)} />
                <PreviewStat label="Standard Deduction" value={fmtINR(tax.standardDeduction)} />
                <PreviewStat label="HRA Exemption" value={fmtINR(tax.hraExemption)} />
                <PreviewStat label="Total Deductions" value={fmtINR(tax.totalDeductions)} />
                <PreviewStat label="Total Annual Tax" value={fmtINR(tax.totalAnnualTax)} accent="text-rose-500" />
                <PreviewStat label="TDS / Month" value={fmtINR(tax.tdsPerMonth)} accent="text-emerald-500" />
                <PreviewStat label="Effective Rate" value={tax.effectiveRate || '—'} />
              </div>
              {(tax.taxSlabs ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Tax Slabs</p>
                  {(tax.taxSlabs ?? []).map((s: any) => (
                    <div key={s.slab} className="flex items-center justify-between py-1 border-b border-[var(--border)] last:border-0 text-xs">
                      <span className="text-[var(--text-muted)]">{s.slab}</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">{fmtINR(s.tax)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
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
  const [viewCycle, setViewCycle] = useState<any>(null);
  const { data: cyclePayslips, isLoading: loadingPayslips } = useQuery({
    queryKey: ['cycle-payslips', viewCycle?.id],
    queryFn: () => payrollApiExt.getCyclePayslips(viewCycle.id),
    enabled: !!viewCycle,
  });
  const payslipColumns: Column<any>[] = [
    {
      key: 'employee', header: 'Employee', render: (r: any) => (
        <div>
          <div className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName}</div>
          <div className="text-xs text-[var(--text-muted)]">{r.employee?.employeeCode}</div>
        </div>
      ),
    },
    { key: 'gross', header: 'Gross Pay', render: (r: any) => <span className="font-mono font-semibold">{fmtINR(r.grossPay)}</span> },
    { key: 'deductions', header: 'Deductions', render: (r: any) => <span className="font-mono text-rose-500">− {fmtINR(r.totalDeductions)}</span> },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(r.netPay)}</span> },
    { key: 'tds', header: 'TDS', render: (r: any) => <span className="font-mono text-[var(--text-muted)]">{fmtINR(r.breakdown?.tdsMonthly)}</span> },
    { key: 'generated', header: 'Generated', render: (r: any) => <span className="text-xs text-[var(--text-muted)]">{fmtDate(r.generatedAt)}</span> },
  ];
  const columns: Column<any>[] = [
    { key: 'label', header: 'Period', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{MONTHS[(r.month || 1) - 1]} {r.year}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <CycleStatusBadge status={r.status} /> },
    { key: 'count', header: 'Employees', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.payslipCount ?? r.count ?? 0}</span> },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(r.netPayTotal ?? r.netPay)}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewCycle(r)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30"
          >
            <FileText size={12} /> View Payslips
          </button>
          <button
            onClick={() => lockMutation.mutate(r.id)}
            disabled={lockMutation.isPending || r.status === 'locked' || r.status === 'processed'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 disabled:opacity-40"
          >
            <Lock size={12} /> {r.status === 'locked' ? 'Locked' : 'Lock'}
          </button>
        </div>
      ),
    },
  ];
  return (
    <SectionCard title="View Processed Salary" icon={BadgeIndianRupee}>
      <DataTable columns={columns} data={cycles ?? []} loading={isLoading} keyField="id" emptyTitle="No payroll cycles" emptyMessage="Run payroll to generate a cycle." />
      <Modal
        open={!!viewCycle}
        onClose={() => setViewCycle(null)}
        title={viewCycle ? `Payslips — ${MONTHS[(viewCycle.month || 1) - 1]} ${viewCycle.year} — ${viewCycle.status || ''}` : ''}
        size="xl"
      >
        <DataTable
          columns={payslipColumns}
          data={cyclePayslips ?? []}
          loading={loadingPayslips}
          keyField="id"
          showToolbar={false}
          selectable={false}
          emptyTitle="No payslips"
          emptyMessage="No payslips for this cycle yet."
        />
      </Modal>
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
  const [pickCycle, setPickCycle] = useState<any>(null);
  const { data: pickPayslips, isLoading: loadingPick } = useQuery({
    queryKey: ['pick-cycle-payslips', pickCycle?.id],
    queryFn: () => payrollApiExt.getCyclePayslips(pickCycle.id),
    enabled: !!pickCycle,
  });
  const [zipping, setZipping] = useState(false);

  const zipPayslips = async (cycle: any, payslips: any[]) => {
    if (!payslips.length) { error('No payslips selected to download'); return; }
    setZipping(true);
    try {
      const { user } = useAuthStore.getState();
      const zip = new JSZip();
      for (const p of payslips) {
        const full = await payrollApiExt.getPayslipDetail(p.id);
        const blob = await generatePayslipPDF({
          payslip: full,
          employee: full.employee,
          company: { name: user?.company?.name || 'Company' },
        }, { save: false });
        const empCode = full.employee?.employeeCode || 'employee';
        const m = full.payrollCycle?.month ?? cycle.month ?? 1;
        const y = full.payrollCycle?.year ?? cycle.year;
        zip.file(`${m}_${y}_${empCode}_SalarySlip.pdf`, blob);
      }
      const out = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(out);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslips_${cycle.month}-${cycle.year}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      success(`Downloaded ${payslips.length} payslip(s)`);
      setPickCycle(null);
    } catch (e: any) {
      error(e?.message || 'Failed to download payslips');
    } finally {
      setZipping(false);
    }
  };

  const payslipColumns: Column<any>[] = [
    {
      key: 'employee', header: 'Employee', render: (p: any) => (
        <div>
          <div className="font-bold text-[var(--text-primary)]">{p.employee?.firstName} {p.employee?.lastName}</div>
          <div className="text-xs text-[var(--text-muted)]">{p.employee?.employeeCode}</div>
        </div>
      ),
    },
    { key: 'net', header: 'Net Pay', render: (p: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(p.netPay)}</span> },
    { key: 'gross', header: 'Gross Pay', render: (p: any) => <span className="font-mono font-semibold">{fmtINR(p.grossPay)}</span> },
  ];
  const paySlips = pickPayslips ?? [];

  const columns: Column<any>[] = [
    { key: 'label', header: 'Period', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{MONTHS[(r.month || 1) - 1]} {r.year}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <CycleStatusBadge status={r.status} /> },
    { key: 'count', header: 'Payslips', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.payslipCount ?? r.count ?? 0}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickCycle(r)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30"
          >
            <Download size={12} /> Select & Download
          </button>
          <button
            onClick={() => sendMutation.mutate(r.id)}
            disabled={sendMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Payslips
          </button>
        </div>
      ),
    },
  ];
  return (
    <SectionCard title="Send Payslips" icon={Send}>
      <DataTable columns={columns} data={cycles ?? []} loading={isLoading} keyField="id" emptyTitle="No payroll cycles" emptyMessage="Run payroll before sending payslips." />
      <Modal
        open={!!pickCycle}
        onClose={() => setPickCycle(null)}
        title={pickCycle ? `Download Payslips — ${MONTHS[(pickCycle.month || 1) - 1]} ${pickCycle.year}` : ''}
        size="lg"
      >
        {paySlips.length === 0 && !loadingPick ? (
          <p className="text-sm text-[var(--text-muted)] py-6 text-center">No payslips in this cycle.</p>
        ) : (
          <DataTable
            columns={payslipColumns}
            data={paySlips}
            loading={loadingPick}
            keyField="id"
            pageSize={8}
            searchable
            searchPlaceholder="Search employees…"
            bulkActions={[
              {
                label: 'Download Selected',
                icon: Download,
                onClick: (rows: any[]) => zipPayslips(pickCycle, rows),
              },
            ]}
            toolbar={
              <button
                onClick={() => zipPayslips(pickCycle, paySlips)}
                disabled={zipping || !paySlips.length}
                className="btn-ghost py-1.5 px-3 text-xs disabled:opacity-50"
              >
                {zipping ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download All
              </button>
            }
            emptyTitle="No payslips"
            emptyMessage="No payslips in this cycle yet."
          />
        )}
      </Modal>
    </SectionCard>
  );
}
