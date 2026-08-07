import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Award, History, Loader2, Download } from 'lucide-react';
import { payrollApi, payrollApiExt } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { useToast } from '../../../../components/ui/ToastProvider';
import { fmtINR, SectionCard, EmployeeSelect } from './shared';
import { MONTHS } from './shared';
import { generatePayslipPDF } from '../../../../utils/payslipPDF';
import { useAuthStore } from '../../../../store/useAuthStore';

async function downloadPayslip(payslip: any) {
  const { user } = useAuthStore.getState();
  const fullPayslip = await payrollApiExt.getPayslipDetail(payslip.id);
  await generatePayslipPDF({
    payslip: fullPayslip,
    employee: fullPayslip.employee,
    company: { name: user?.company?.name || 'Company' },
  });
}

export function PayslipSection() {
  const [employeeId, setEmployeeId] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-payslips', employeeId],
    queryFn: () => payrollApi.getPayslips(employeeId),
    enabled: !!employeeId,
  });
  const columns: Column<any>[] = [
    { key: 'period', header: 'Month / Year', render: (r: any) => <span className="font-semibold text-[var(--text-primary)]">{r.payrollCycle?.month}/{r.payrollCycle?.year}</span> },
    { key: 'gross', header: 'Gross Pay', render: (r: any) => <span className="font-mono font-semibold">{fmtINR(r.grossPay)}</span> },
    { key: 'net', header: 'Net Pay', render: (r: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(r.netPay)}</span> },
    { key: 'tds', header: 'TDS', render: (r: any) => <span className="font-mono text-[var(--text-muted)]">{fmtINR(r.breakdown?.tdsMonthly)}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => downloadPayslip(r)} className="p-1.5 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors">
          <Download size={14} />
        </button>
      ),
    },
  ];
  return (
    <SectionCard title="Employee Payslips" icon={FileText} right={<div className="w-72"><EmployeeSelect value={employeeId} onChange={setEmployeeId} label="Select employee to view payslips…" /></div>}>
      {employeeId ? (
        <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No payslips" emptyMessage="No payslips generated for this employee." />
      ) : (
        <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-alt)]">
          Select an employee to view their payslips
        </div>
      )}
    </SectionCard>
  );
}

export function StructureSection({ initialEmployeeId }: { initialEmployeeId?: string }) {
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? '');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { data: structure, isLoading } = useQuery({
    queryKey: ['admin-salary-structure', employeeId],
    queryFn: () => payrollApi.getSalaryStructure(employeeId),
    enabled: !!employeeId,
  });
  const [form, setForm] = useState({ basic: 0, hra: 0, da: 0, conveyance: 0, medical: 0, specialAllowance: 0, effectiveFrom: '', ctc: 0, deductionType: 'none' as 'none' | 'pf' | 'esi' | 'pt', deductionAmount: 0 });
  const updateMutation = useMutation({
    mutationFn: () => {
      const { ctc, deductionType, deductionAmount, ...base } = form;
      const deductions = { pfDeduction: 0, esiDeduction: 0, ptDeduction: 0 };
      if (deductionType === 'pf') deductions.pfDeduction = deductionAmount;
      if (deductionType === 'esi') deductions.esiDeduction = deductionAmount;
      if (deductionType === 'pt') deductions.ptDeduction = deductionAmount;
      return payrollApi.setSalaryStructure(employeeId, { ...base, ...deductions });
    },
    onSuccess: () => { success('Salary structure saved'); queryClient.invalidateQueries({ queryKey: ['admin-salary-structure', employeeId] }); },
    onError: (e: any) => error(e.message || 'Failed to save structure'),
  });
  const load = (s: any) => {
    if (!s) return;
    const gross =
      (s.basic ?? 0) + (s.hra ?? 0) + (s.da ?? 0) + (s.conveyance ?? 0) +
      (s.medical ?? 0) + (s.specialAllowance ?? 0);
    const pf = s.pfDeduction || 0;
    const esi = s.esiDeduction || 0;
    const pt = s.ptDeduction || 0;
    setForm({
      basic: s.basic ?? 0, hra: s.hra ?? 0, da: s.da ?? 0, conveyance: s.conveyance ?? 0,
      medical: s.medical ?? 0, specialAllowance: s.specialAllowance ?? 0,
      effectiveFrom: s.effectiveFrom ? String(s.effectiveFrom).slice(0, 10) : '',
      ctc: Math.round(gross * 12),
      deductionType: pf > 0 ? 'pf' : esi > 0 ? 'esi' : pt > 0 ? 'pt' : 'none',
      deductionAmount: pf > 0 ? pf : esi > 0 ? esi : pt,
    });
  };
  useEffect(() => {
    load(structure);
  }, [structure]);
  const fields: { key: keyof typeof form; label: string }[] = [
    { key: 'basic', label: 'Basic Pay' },
    { key: 'hra', label: 'HRA' },
    { key: 'da', label: 'DA' },
    { key: 'conveyance', label: 'Conveyance' },
    { key: 'medical', label: 'Medical' },
    { key: 'specialAllowance', label: 'Special Allowance' },
  ];
  const grossMonthly = fields.reduce((s, f) => s + Number(form[f.key] || 0), 0);

  const computeSplitFromCtc = (annualCtc: number) => {
    if (!annualCtc || annualCtc <= 0) return null;
    const monthlyCTC = annualCtc / 12;
    const basic = Math.round(monthlyCTC * 0.5);
    const hra = Math.round(monthlyCTC * 0.25);
    const da = Math.round(monthlyCTC * 0.05);
    const conveyance = Math.round(monthlyCTC * 0.05);
    const medical = Math.round(monthlyCTC * 0.05);
    const specialAllowance = Math.max(0, Math.round(monthlyCTC - basic - hra - da - conveyance - medical));
    return { basic, hra, da, conveyance, medical, specialAllowance };
  };

  const handleCtcChange = (v: number) => {
    setForm({ ...form, ctc: v });
    const split = computeSplitFromCtc(v);
    if (split) setForm({ ...form, ctc: v, ...split });
  };

  return (
    <SectionCard title="Salary Structure" icon={Award} right={<div className="w-72"><EmployeeSelect value={employeeId} onChange={setEmployeeId} label="Select employee to edit salary…" /></div>}>
      {employeeId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] text-sm">
              <div>
                <span className="font-semibold text-[var(--text-muted)]">Annual CTC</span>
                <p className="text-[10px] text-[var(--text-muted)]/70 mt-0.5">Enter CTC to auto-split the structure</p>
              </div>
              <input
                type="number"
                min={0}
                placeholder="e.g. 500000"
                value={form.ctc || ''}
                onChange={(e) => handleCtcChange(Number(e.target.value))}
                className="w-40 px-3 py-1.5 bg-[var(--surface-alt)] border border-indigo-500/40 rounded-lg text-sm font-mono text-right focus:outline-none focus:border-indigo-500"
              />
            </div>
            {fields.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] text-sm">
                <span className="font-semibold text-[var(--text-muted)]">{f.label}</span>
                <input
                  type="number"
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                  className="w-32 px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-mono text-right focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-2 text-sm font-black text-[var(--text-primary)]">
              <span>Gross Monthly Total</span>
              <span className="font-mono text-indigo-500">{fmtINR(grossMonthly)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2 text-sm font-semibold text-[var(--text-muted)]">
              <span>Annual Equivalent</span>
              <span className="font-mono">{fmtINR(grossMonthly * 12)}</span>
            </div>
            {form.deductionType !== 'none' && (
              <div className="flex items-center justify-between gap-3 py-2 text-sm font-semibold text-rose-500">
                <span>Deduction ({form.deductionType.toUpperCase()})</span>
                <span className="font-mono">− {fmtINR(form.deductionAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 py-2 text-sm font-black text-emerald-500 border-t border-[var(--border)]">
              <span>Net Monthly Salary</span>
              <span className="font-mono">{fmtINR(form.deductionType !== 'none' ? grossMonthly - form.deductionAmount : grossMonthly)}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Deduction</label>
              <select
                value={form.deductionType}
                onChange={(e) => setForm({ ...form, deductionType: e.target.value as any })}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="none">No Deduction</option>
                <option value="pf">Provident Fund (PF)</option>
                <option value="esi">ESI</option>
                <option value="pt">Professional Tax (PT)</option>
              </select>
              {form.deductionType !== 'none' && (
                <input
                  type="number"
                  min={0}
                  placeholder="Deduction amount per month"
                  value={form.deductionAmount || ''}
                  onChange={(e) => setForm({ ...form, deductionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono text-right focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Effective From</label>
              <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Save Structure
            </button>
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-alt)]">
          Select an employee to edit their salary structure
        </div>
      )}
    </SectionCard>
  );
}

export function HistorySection() {
  const [employeeId, setEmployeeId] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-salary-revisions', employeeId],
    queryFn: () => payrollApi.getSalaryRevisions(employeeId),
    enabled: !!employeeId,
  });
  const columns: Column<any>[] = [
    { key: 'date', header: 'Revision Date', render: (r: any) => <span className="font-semibold text-[var(--text-primary)]">{new Date(r.createdAt || r.effectiveFrom || r.date).toLocaleDateString('en-IN')}</span> },
    { key: 'ctc', header: 'New CTC', render: (r: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(r.newCtc ?? r.ctc ?? r.salary)}</span> },
    { key: 'reason', header: 'Reason', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.reason || r.type || '—'}</span> },
  ];
  return (
    <SectionCard title="Salary History" icon={History} right={<div className="w-72"><EmployeeSelect value={employeeId} onChange={setEmployeeId} label="Select employee to view revisions…" /></div>}>
      {employeeId ? (
        <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No revisions" emptyMessage="No salary revisions recorded for this employee." />
      ) : (
        <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-alt)]">
          Select an employee to view their salary revision history
        </div>
      )}
    </SectionCard>
  );
}

export const PAYROLL_MONTHS = MONTHS;
