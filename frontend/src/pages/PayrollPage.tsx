import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, FileText, DollarSign, Lock, Calculator, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { payrollApi, payrollApiExt, employeesApi } from '../api/client';
import { computeTax, computePF, computeESI, computePT, fmt } from '../utils/taxCalculator';
import { useAuthStore } from '../store/useAuthStore';

type TabKey = 'run' | 'structure' | 'payslips' | 'tax';

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const myEmpId = user?.employee?.id || '';

  const [tab, setTab] = useState<TabKey>(isAdmin ? 'run' : 'structure');
  const [selectedEmp, setSelectedEmp] = useState(myEmpId);
  const [regime, setRegime] = useState<'old' | 'new'>('new');
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [expandedPayslip, setExpandedPayslip] = useState<string | null>(null);

  // Sync selectedEmp with user structure data if non-admin
  useEffect(() => {
    if (!isAdmin && myEmpId) setSelectedEmp(myEmpId);
  }, [isAdmin, myEmpId]);

  // Salary Structure form state
  const [basic, setBasic] = useState(50000);
  const [hra, setHra] = useState(20000);
  const [da, setDa] = useState(5000);
  const [conveyance, setConveyance] = useState(1600);
  const [medical, setMedical] = useState(1250);
  const [specialAllowance, setSpecialAllowance] = useState(10000);

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: salaryStructure, refetch: refetchStructure } = useQuery({
    queryKey: ['salary-structure', selectedEmp],
    queryFn: () => payrollApi.getSalaryStructure(selectedEmp),
    enabled: !!selectedEmp,
  });

  const { data: payslips } = useQuery({
    queryKey: ['payslips', selectedEmp],
    queryFn: () => payrollApi.getPayslips(selectedEmp),
    enabled: !!selectedEmp,
  });

  const { data: cycles } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: payrollApiExt.listCycles,
  });

  const saveStructureMutation = useMutation({
    mutationFn: (data: any) => payrollApi.setSalaryStructure(selectedEmp, data),
    onSuccess: () => refetchStructure(),
  });

  const runPayrollMutation = useMutation({
    mutationFn: payrollApiExt.runPayroll,
    onSuccess: (data) => {
      alert(`✅ Payroll processed. ${data.payslipCount} payslips generated.`);
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      if (selectedEmp) queryClient.invalidateQueries({ queryKey: ['payslips', selectedEmp] });
    },
  });

  const lockCycleMutation = useMutation({
    mutationFn: payrollApiExt.lockCycle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] }),
  });

  // Live tax preview from current salary structure form values
  const taxPreview = useMemo(() => computeTax({
    basic, hra, da, conveyance, medical, specialAllowance, regime,
  }), [basic, hra, da, conveyance, medical, specialAllowance, regime]);

  const gross = basic + hra + da + conveyance + medical + specialAllowance;

  // Auto-compute statutory deductions from current salary inputs
  const pfDeduction = computePF(basic);
  const esiDeduction = computeESI(gross);
  const ptDeduction = computePT(gross);

  const handleSaveStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return alert('Select an employee first');
    saveStructureMutation.mutate({
      effectiveFrom: new Date().toISOString(),
      basic, hra, da, conveyance, medical, specialAllowance,
    });
  };

  const TABS = [
    ...(isAdmin ? [{ key: 'run' as TabKey, label: 'Run Payroll', icon: <Banknote size={16} /> }] : []),
    { key: 'structure' as TabKey, label: 'Salary Structure', icon: <DollarSign size={16} /> },
    { key: 'payslips' as TabKey, label: 'Payslips', icon: <FileText size={16} /> },
    { key: 'tax' as TabKey, label: 'Tax Calculator', icon: <Calculator size={16} /> },
  ];

  const cycleStatusColor: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    processed: 'bg-ledger/10 text-ledger',
    locked: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Payroll Console</h1>
        <p className="text-sm text-muted mt-1">Automated payroll with income tax (Old/New regime), TDS, PF/ESI/PT compliance, and payslip management.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-line gap-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-ledger text-ledger' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === Run Payroll Tab === */}
      {tab === 'run' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Run Payroll form */}
          <div className="bg-white border border-line rounded-lg p-6 space-y-4 h-fit">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Process Payroll Run</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Month</label>
                <select value={runMonth} onChange={e => setRunMonth(Number(e.target.value))} className="w-full px-3 py-2 rounded-md border border-line text-sm">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Year</label>
                <select value={runYear} onChange={e => setRunYear(Number(e.target.value))} className="w-full px-3 py-2 rounded-md border border-line text-sm">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-2">Tax Regime</label>
              <div className="flex gap-2">
                <button onClick={() => setRegime('new')} className={`flex-1 py-2 rounded text-sm font-medium ${regime === 'new' ? 'bg-ledger text-paper' : 'border border-line text-ink'}`}>New Regime</button>
                <button onClick={() => setRegime('old')} className={`flex-1 py-2 rounded text-sm font-medium ${regime === 'old' ? 'bg-amber-500 text-white' : 'border border-line text-ink'}`}>Old Regime</button>
              </div>
            </div>
            <button
              onClick={() => runPayrollMutation.mutate({ month: runMonth, year: runYear, regime })}
              disabled={runPayrollMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark disabled:opacity-50"
            >
              <Banknote size={16} /> {runPayrollMutation.isPending ? 'Processing…' : 'Process Payroll Roster'}
            </button>
          </div>

          {/* Cycles Table */}
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h3 className="text-sm font-semibold">Payroll Cycle History</h3>
            </div>
            {!cycles || cycles.length === 0 ? (
              <div className="p-6 text-sm text-muted">No payroll cycles yet. Run your first payroll above.</div>
            ) : (
              <div className="divide-y divide-line">
                {cycles.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 hover:bg-paper/40">
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(2020, c.month - 1).toLocaleString('default', { month: 'long' })} {c.year}
                      </div>
                      <div className="text-xs text-muted">{c._count?.payslips || 0} payslips</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cycleStatusColor[c.status] || ''}`}>{c.status}</span>
                      {c.status !== 'locked' && (
                        <button
                          onClick={() => lockCycleMutation.mutate(c.id)}
                          disabled={lockCycleMutation.isPending}
                          className="flex items-center gap-1 text-xs border border-line px-2 py-1 rounded hover:bg-paper/80"
                        >
                          <Lock size={12} /> Lock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Salary Structure Tab === */}
      {tab === 'structure' && (
        <div className="max-w-2xl">
          <div className="bg-white border border-line rounded-lg p-6">
            <div className="mb-4">
              <label className="block text-xs text-muted mb-1">Employee</label>
              {isAdmin ? (
                <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="w-full px-3 py-2 rounded-md border border-line text-sm">
                  <option value="">-- Choose Employee --</option>
                  {employees?.items.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 rounded-md border border-line bg-gray-50 text-sm text-muted cursor-not-allowed">
                  {user?.employee?.firstName} {user?.employee?.lastName}
                </div>
              )}
            </div>

            {salaryStructure && (
              <div className="p-3 bg-ledger/5 rounded border border-ledger/20 text-xs mb-4">
                <span className="font-semibold">Active Structure:</span> Gross ≈ {fmt(
                  salaryStructure.basic + salaryStructure.hra + salaryStructure.da +
                  salaryStructure.conveyance + salaryStructure.medical + salaryStructure.specialAllowance
                )} / month
              </div>
            )}

            <form onSubmit={handleSaveStructure} className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Earnings</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {([
                    ['Basic Salary (₹/mo)', basic, setBasic],
                    ['HRA (₹/mo)', hra, setHra],
                    ['DA (₹/mo)', da, setDa],
                    ['Conveyance (₹/mo)', conveyance, setConveyance],
                    ['Medical Reimb. (₹/mo)', medical, setMedical],
                    ['Special Allowance (₹/mo)', specialAllowance, setSpecialAllowance],
                  ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                    <div key={label}>
                      <label className="block text-muted mb-0.5">{label}</label>
                      <input type="number" value={val} onChange={e => setter(Number(e.target.value))}
                        disabled={!isAdmin}
                        className="w-full border border-line px-2 py-1.5 rounded text-sm disabled:opacity-50" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Deductions</h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {([
                    ['PF Deduction (₹)', pfDeduction],
                    ['ESI (₹)', esiDeduction],
                    ['Professional Tax (₹)', ptDeduction],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label as string}>
                      <label className="block text-xs text-muted mb-0.5">{label as string}</label>
                      <div className="w-full border border-line px-2 py-1.5 rounded text-sm bg-paper/50 text-muted cursor-not-allowed">{fmt(val as number)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Tax Preview */}
              <div className="bg-gradient-to-r from-ledger/5 to-ledger/10 rounded-lg p-4 text-sm">
                <div className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted">Live Estimates</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-display text-lg font-bold">{fmt(gross)}</div>
                    <div className="text-xs text-muted">Gross / month</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-rust">{fmt(taxPreview.tdsPerMonth)}</div>
                    <div className="text-xs text-muted">TDS / month ({regime})</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-ledger">{fmt(gross - pfDeduction - esiDeduction - ptDeduction - taxPreview.tdsPerMonth)}</div>
                    <div className="text-xs text-muted">Est. Take-Home</div>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <button type="submit" disabled={saveStructureMutation.isPending || !selectedEmp}
                  className="w-full bg-ink text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ink/90 disabled:opacity-50">
                  {saveStructureMutation.isPending ? 'Saving…' : 'Save & Activate Structure'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* === Payslips Tab === */}
      {tab === 'payslips' && (
        <div>
          <div className="mb-4">
            <label className="block text-xs text-muted mb-1">Employee</label>
            {isAdmin ? (
              <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="border border-line rounded px-3 py-2 text-sm">
                <option value="">-- Choose Employee --</option>
                {employees?.items.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            ) : (
              <div className="border border-line rounded px-3 py-2 text-sm bg-gray-50 text-muted cursor-not-allowed">
                {user?.employee?.firstName} {user?.employee?.lastName}
              </div>
            )}
          </div>

          {selectedEmp && payslips && (
            <div className="bg-white border border-line rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-line">
                <h3 className="text-sm font-semibold">Payslip Vault</h3>
              </div>
              {payslips.length === 0 ? (
                <div className="p-6 text-sm text-muted">No payslips found. Run a payroll cycle first.</div>
              ) : (
                <div className="divide-y divide-line">
                  {payslips.map((ps: any) => (
                    <div key={ps.id}>
                      <button
                        onClick={() => setExpandedPayslip(expandedPayslip === ps.id ? null : ps.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-paper/40 text-left"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {new Date(2020, ps.payrollCycle?.month - 1).toLocaleString('default', { month: 'long' })} {ps.payrollCycle?.year}
                          </div>
                          <div className="text-xs text-muted">Generated {new Date(ps.generatedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold text-ledger">{fmt(ps.netPay)}</div>
                            <div className="text-[10px] text-muted">Gross: {fmt(ps.grossPay)}</div>
                          </div>
                          {expandedPayslip === ps.id ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                        </div>
                      </button>

                      {expandedPayslip === ps.id && ps.breakdown && (
                        <div className="p-4 bg-paper/30 border-t border-line">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold text-muted uppercase tracking-wider mb-2">Earnings</div>
                              {['basic', 'hra', 'da', 'conveyance', 'medical', 'specialAllowance'].map(k => (
                                ps.breakdown[k] > 0 && (
                                  <div key={k} className="flex justify-between mb-1">
                                    <span className="capitalize text-muted">{k.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-mono">{fmt(ps.breakdown[k])}</span>
                                  </div>
                                )
                              ))}
                              <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-line">
                                <span>Gross</span><span className="font-mono">{fmt(ps.grossPay)}</span>
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-muted uppercase tracking-wider mb-2">Deductions</div>
                              {[
                                ['PF', ps.breakdown.pfDeduction],
                                ['ESI', ps.breakdown.esiDeduction],
                                ['Professional Tax', ps.breakdown.ptDeduction],
                                [`TDS (${ps.breakdown.taxRegime} regime)`, ps.breakdown.tdsMonthly],
                              ].map(([k, v]) => (
                                (v as number) > 0 && (
                                  <div key={k as string} className="flex justify-between mb-1">
                                    <span className="text-muted">{k}</span>
                                    <span className="font-mono text-rust">{fmt(v as number)}</span>
                                  </div>
                                )
                              ))}
                              <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-line">
                                <span>Total Deductions</span><span className="font-mono text-rust">{fmt(ps.totalDeductions)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-ledger mt-1">
                                <span>Net Pay</span><span className="font-mono">{fmt(ps.netPay)}</span>
                              </div>
                            </div>
                          </div>
                          {ps.breakdown.taxableAnnual && (
                            <div className="mt-2 pt-2 border-t border-line text-xs text-muted">
                              Taxable Annual Income: {fmt(ps.breakdown.taxableAnnual)} · Effective Rate: {ps.breakdown.effectiveTaxRate}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === Tax Tab === */}
      {tab === 'tax' && (
        <div className="max-w-3xl">
          <div className="bg-white border border-line rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Quick Tax Preview</h2>
              <div className="flex gap-2">
                <button onClick={() => setRegime('new')} className={`px-3 py-1 rounded text-sm font-medium ${regime === 'new' ? 'bg-ledger text-paper' : 'border border-line'}`}>New Regime</button>
                <button onClick={() => setRegime('old')} className={`px-3 py-1 rounded text-sm font-medium ${regime === 'old' ? 'bg-amber-500 text-white' : 'border border-line'}`}>Old Regime</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {([
                ['Basic', basic, setBasic],
                ['HRA', hra, setHra],
                ['DA', da, setDa],
                ['Conveyance', conveyance, setConveyance],
                ['Medical', medical, setMedical],
                ['Special Allowance', specialAllowance, setSpecialAllowance],
              ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label}>
                  <label className="block text-muted mb-0.5">{label} (₹/mo)</label>
                  <input type="number" value={val} onChange={e => setter(Number(e.target.value))}
                    className="w-full border border-line px-2 py-1.5 rounded" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gradient-to-r from-ledger/5 to-ledger/10 rounded-lg p-4 text-center">
              <div>
                <div className="font-display text-xl font-bold">{fmt(taxPreview.grossAnnual)}</div>
                <div className="text-xs text-muted">Gross Annual</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold text-rust">{fmt(taxPreview.totalAnnualTax)}</div>
                <div className="text-xs text-muted">Annual Tax</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold text-amber-600">{fmt(taxPreview.tdsPerMonth)}</div>
                <div className="text-xs text-muted">TDS / month</div>
              </div>
            </div>

            <div className="text-xs space-y-1.5">
              <div className="flex justify-between text-muted"><span>Taxable Income</span><span className="font-mono">{fmt(taxPreview.taxableIncome)}</span></div>
              <div className="flex justify-between text-muted"><span>Standard Deduction</span><span className="font-mono">{fmt(taxPreview.standardDeduction)}</span></div>
              {taxPreview.hraExemption > 0 && <div className="flex justify-between text-muted"><span>HRA Exemption</span><span className="font-mono">{fmt(taxPreview.hraExemption)}</span></div>}
              {taxPreview.taxSlabs.length === 0 && <div className="text-ledger font-medium">✅ No tax (87A rebate applied)</div>}
              {taxPreview.taxSlabs.map(s => (
                <div key={s.slab} className="flex justify-between text-muted"><span>{s.slab}</span><span className="font-mono">{fmt(s.tax)}</span></div>
              ))}
              <div className="flex justify-between font-semibold pt-1 border-t border-line"><span>Effective Rate</span><span>{taxPreview.effectiveRate}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
