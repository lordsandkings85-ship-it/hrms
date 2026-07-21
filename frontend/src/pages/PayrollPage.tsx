import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, FileText, DollarSign, Lock, Calculator, ChevronDown, ChevronUp, Eye, Gift, Target, BarChart3 } from 'lucide-react';
import { payrollApi, payrollApiExt, employeesApi } from '../api/client';
import { computeTax, computePF, computeESI, computePT, fmt } from '../utils/taxCalculator';
import { useAuthStore } from '../store/useAuthStore';
import { DataTable, Column } from '../components/ui/DataTable';

type TabKey = 'run' | 'structure' | 'payslips' | 'tax' | 'bonus' | 'incentive' | 'reports';

const SUB_TO_TAB: Record<string, TabKey> = {
  monthly: 'run',
  structure: 'structure',
  payslip: 'payslips',
  tax: 'tax',
  bonus: 'bonus',
  incentive: 'incentive',
  reports: 'reports',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  run: 'monthly',
  structure: 'structure',
  payslips: 'payslip',
  tax: 'tax',
  bonus: 'bonus',
  incentive: 'incentive',
  reports: 'reports',
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();

  const roleNameLower = user?.role?.name?.toLowerCase() || '';
  const isAdmin = !!user?.isSuperAdmin || !!user?.role?.isSystem || roleNameLower.includes('admin') || roleNameLower === 'hr' || roleNameLower === 'human resources';
  const myEmpId = user?.employee?.id || '';

  const initialTab = sub ? SUB_TO_TAB[sub] || (isAdmin ? 'run' : 'structure') : (isAdmin ? 'run' : 'structure');
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (sub && SUB_TO_TAB[sub]) {
      setTab(SUB_TO_TAB[sub]);
    }
  }, [sub]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/payroll/${TAB_TO_SUB[t]}`);
  };
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
  const [annualCtc, setAnnualCtc] = useState(0);

  const handleCtcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ctc = Number(e.target.value);
    setAnnualCtc(ctc);
    
    if (ctc > 0) {
      const monthlyCTC = ctc / 12;
      let computedGross = 0;

      // CTC = Gross + Employer PF + Employer ESI + Gratuity
      // Basic = 50% of Gross
      // Gratuity = 4.81% of Basic = 2.405% of Gross (0.02405 * Gross)
      
      // Calculate Gross based on statutory thresholds
      // Threshold 1: Gross > 30000 (Basic > 15000) -> PF is capped at 1800, ESI is 0
      // Expected CTC for Gross=30000 -> 30000 + 1800 + 0 + (0.02405 * 30000) = 32521.5
      if (monthlyCTC > 32521.5) {
        computedGross = (monthlyCTC - 1800) / 1.02405;
      } 
      // Threshold 2: 21000 < Gross <= 30000 -> PF is 12% of Basic (6% of Gross), ESI is 0
      // Expected CTC for Gross=21000 -> 21000 + 1260 + 0 + (0.02405 * 21000) = 22765.05
      else if (monthlyCTC > 22765.05) {
        computedGross = monthlyCTC / 1.08405;
      }
      // Threshold 3: Gross <= 21000 -> PF is 6% of Gross, ESI is 3.25% of Gross
      else {
        // CTC = Gross * (1 + 0.06 + 0.0325 + 0.02405) = Gross * 1.11655
        computedGross = monthlyCTC / 1.11655;
      }

      const computedBasic = Math.round(computedGross * 0.50);
      const computedHra = Math.round(computedBasic * 0.40);
      const computedDa = 0;
      
      // Allowances per user rules
      const computedConveyance = 0;
      const computedMedical = 0;
      
      const computedSpecial = Math.round(computedGross - (computedBasic + computedHra + computedDa + computedConveyance + computedMedical));
      
      setBasic(computedBasic);
      setHra(computedHra);
      setDa(computedDa);
      setConveyance(computedConveyance);
      setMedical(computedMedical);
      setSpecialAllowance(Math.max(0, computedSpecial));
    }
  };

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

  const TABS: { key: TabKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'run', label: 'Monthly Payroll', icon: <Banknote size={16} />, adminOnly: true },
    { key: 'structure', label: 'Salary Structure', icon: <DollarSign size={16} /> },
    { key: 'bonus', label: 'Bonus', icon: <Gift size={16} />, adminOnly: true },
    { key: 'incentive', label: 'Incentive', icon: <Target size={16} />, adminOnly: true },
    { key: 'payslips', label: 'Payslips', icon: <FileText size={16} /> },
    { key: 'tax', label: 'Tax Calculator', icon: <Calculator size={16} /> },
    { key: 'reports', label: 'Payroll Reports', icon: <BarChart3 size={16} />, adminOnly: true },
  ];

  const cycleStatusColor: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    processed: 'bg-ledger/10 text-ledger',
    locked: 'bg-red-100 text-red-700',
  };

  const cycleColumns = useMemo<Column<any>[]>(() => [
    {
      key: 'monthYear',
      header: 'Cycle',
      sortable: true,
      render: (c) => (
        <div>
          <div className="text-sm font-medium">
            {new Date(2020, c.month - 1).toLocaleString('default', { month: 'long' })} {c.year}
          </div>
          <div className="text-xs text-muted">{c._count?.payslips || 0} payslips</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (c) => <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cycleStatusColor[c.status] || ''}`}>{c.status}</span>
    },
    {
      key: 'action',
      header: 'Action',
      render: (c) => c.status !== 'locked' ? (
        <button
          onClick={(e) => { e.stopPropagation(); lockCycleMutation.mutate(c.id); }}
          disabled={lockCycleMutation.isPending}
          className="flex items-center gap-1 text-xs border border-line px-2 py-1 rounded hover:bg-paper/80 transition-colors"
        >
          <Lock size={12} /> Lock
        </button>
      ) : <span className="text-muted/50">—</span>
    }
  ], [lockCycleMutation]);

  return (
    <div className="page-container max-w-7xl space-y-6">
      <header className="mb-6 animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Payroll Console</h1>
        <p className="text-sm font-medium text-muted mt-1">Automated payroll with income tax (Old/New regime), TDS, PF/ESI/PT compliance, and payslip management.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 animate-slideUp overflow-x-auto" style={{ animationDelay: '0.15s' }}>
        {TABS.filter(t => !t.adminOnly || isAdmin).map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
              tab === t.key ? 'text-ledger' : 'text-muted hover:text-ink'
            }`}
          >
            {t.icon} {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ledger rounded-t-full animate-slideUp" />}
          </button>
        ))}
      </div>

      {/* === Run Payroll Tab === */}
      {tab === 'run' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slideUp" style={{ animationDelay: '0.2s' }}>
          {/* Run Payroll form */}
          <div className="section-card p-6 space-y-5 h-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Process Payroll Run</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Month</label>
                <select value={runMonth} onChange={e => setRunMonth(Number(e.target.value))} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Year</label>
                <select value={runYear} onChange={e => setRunYear(Number(e.target.value))} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Tax Regime</label>
              <div className="flex gap-3">
                <button onClick={() => setRegime('new')} className={`flex-1 py-2.5 rounded text-sm font-bold transition-all shadow-sm ${regime === 'new' ? 'bg-ledger text-paper shadow-ledger/20 scale-[1.02]' : 'border border-line text-muted hover:border-ledger/30 hover:text-ink'}`}>New Regime</button>
                <button onClick={() => setRegime('old')} className={`flex-1 py-2.5 rounded text-sm font-bold transition-all shadow-sm ${regime === 'old' ? 'bg-amber-500 text-white shadow-amber-500/20 scale-[1.02]' : 'border border-line text-muted hover:border-amber-500/30 hover:text-ink'}`}>Old Regime</button>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => runPayrollMutation.mutate({ month: runMonth, year: runYear, regime })}
                disabled={runPayrollMutation.isPending}
                className="w-full flex items-center justify-center gap-2 btn-primary py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <Banknote size={16} /> {runPayrollMutation.isPending ? 'Processing…' : 'Process Payroll Roster'}
              </button>
            </div>
          </div>

          <div className="section-card overflow-hidden h-fit">
            <div className="px-6 py-4 border-b border-line mb-2 bg-paper/20">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Payroll Cycle History</h3>
            </div>
            <DataTable
              columns={cycleColumns}
              data={cycles || []}
              keyField="id"
              emptyTitle="No cycles yet"
              emptyMessage="Run your first payroll above."
              searchable={false}
              pageSize={5}
            />
          </div>
        </div>
      )}

      {/* === Salary Structure Tab === */}
      {tab === 'structure' && (
        <div className="max-w-2xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6">
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Employee</label>
              {isAdmin ? (
                <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                  <option value="">-- Choose Employee --</option>
                  {employees?.items.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm font-medium text-muted cursor-not-allowed">
                  {user?.employee?.firstName} {user?.employee?.lastName}
                </div>
              )}
            </div>

            {salaryStructure && (
              <div className="p-4 bg-ledger/5 border border-ledger/20 rounded-lg text-sm text-ledger font-medium mb-6 flex items-center justify-between">
                <span>Active Structure Gross</span>
                <span className="font-mono font-bold">{fmt(
                  salaryStructure.basic + salaryStructure.hra + salaryStructure.da +
                  salaryStructure.conveyance + salaryStructure.medical + salaryStructure.specialAllowance
                )} / month</span>
              </div>
            )}

            <form onSubmit={handleSaveStructure} className="space-y-6">
              <div className="p-5 bg-paper/30 border border-line rounded-lg">
                <label className="block text-xs font-bold text-ledger uppercase tracking-wider mb-2">Auto-Calculate from CTC</label>
                <div className="flex gap-5 items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Enter Annual CTC (₹)"
                      value={annualCtc || ''}
                      onChange={handleCtcChange}
                      disabled={!isAdmin}
                      className="w-full px-3 py-2.5 rounded border border-line bg-white text-sm font-mono shadow-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                    />
                  </div>
                  <div className="text-[11px] font-medium text-muted flex-1 leading-relaxed">
                    Entering a CTC will automatically calculate standard breakdown percentages. You can manually adjust them below.
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-ledger"></div> Earnings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {([
                    ['Basic Salary (₹/mo)', basic, setBasic],
                    ['HRA (₹/mo)', hra, setHra],
                    ['DA (₹/mo)', da, setDa],
                    ['Conveyance (₹/mo)', conveyance, setConveyance],
                    ['Medical Reimb. (₹/mo)', medical, setMedical],
                    ['Special Allowance (₹/mo)', specialAllowance, setSpecialAllowance],
                  ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
                      <input type="number" value={val} onChange={e => setter(Number(e.target.value))}
                        disabled={!isAdmin}
                        className="w-full border border-line bg-paper/50 px-3 py-2 rounded font-mono disabled:opacity-50 focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rust"></div> Deductions</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {([
                    ['PF Deduction (₹)', pfDeduction],
                    ['ESI (₹)', esiDeduction],
                    ['Professional Tax (₹)', ptDeduction],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label as string}>
                      <label className="block text-xs font-medium text-muted mb-1">{label as string}</label>
                      <div className="w-full border border-line px-3 py-2 rounded bg-paper/80 font-mono text-muted cursor-not-allowed shadow-inner">{fmt(val as number)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Tax Preview */}
              <div className="bg-gradient-to-br from-ledger/5 to-ledger/10 rounded-xl p-5 text-sm border border-ledger/10">
                <div className="font-bold mb-4 text-[10px] uppercase tracking-wider text-ledger">Live Estimates</div>
                <div className="grid grid-cols-3 gap-6 text-center divide-x divide-line/30">
                  <div>
                    <div className="font-display text-2xl font-bold text-ink">{fmt(gross)}</div>
                    <div className="text-xs font-medium text-muted mt-1">Gross / month</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold text-rust">{fmt(taxPreview.tdsPerMonth)}</div>
                    <div className="text-xs font-medium text-muted mt-1">TDS / mo ({regime})</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold text-ledger">{fmt(gross - pfDeduction - esiDeduction - ptDeduction - taxPreview.tdsPerMonth)}</div>
                    <div className="text-xs font-medium text-muted mt-1">Est. Take-Home</div>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button type="submit" disabled={saveStructureMutation.isPending || !selectedEmp}
                    className="w-full btn-primary py-2.5 text-sm font-bold disabled:opacity-50">
                    {saveStructureMutation.isPending ? 'Saving…' : 'Save & Activate Structure'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* === Payslips Tab === */}
      {tab === 'payslips' && (
        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="mb-6 max-w-sm">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Employee</label>
            {isAdmin ? (
              <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm bg-paper/50 focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                <option value="">-- Choose Employee --</option>
                {employees?.items.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            ) : (
              <div className="border border-line rounded px-3 py-2 text-sm bg-paper/50 font-medium text-muted cursor-not-allowed">
                {user?.employee?.firstName} {user?.employee?.lastName}
              </div>
            )}
          </div>

          {selectedEmp && payslips && (
            <div className="section-card overflow-hidden">
              <div className="px-6 py-4 border-b border-line bg-paper/20">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Payslip Vault</h3>
              </div>
              {payslips.length === 0 ? (
                <div className="p-6 text-sm text-muted">No payslips found. Run a payroll cycle first.</div>
              ) : (
                <div className="divide-y divide-line">
                  {payslips.map((ps: any) => (
                    <div key={ps.id}>
                      <button
                        onClick={() => setExpandedPayslip(expandedPayslip === ps.id ? null : ps.id)}
                        className={`w-full flex items-center justify-between p-5 hover:bg-paper/40 text-left transition-colors ${expandedPayslip === ps.id ? 'bg-paper/40' : ''}`}
                      >
                        <div>
                          <div className="text-sm font-bold text-ink flex items-center gap-2">
                            {new Date(2020, ps.payrollCycle?.month - 1).toLocaleString('default', { month: 'long' })} {ps.payrollCycle?.year}
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-ledger/10 text-ledger px-1.5 py-0.5 rounded">Processed</span>
                          </div>
                          <div className="text-xs font-medium text-muted mt-1">Generated {new Date(ps.generatedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-mono text-base font-bold text-ledger">{fmt(ps.netPay)}</div>
                            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">Gross: {fmt(ps.grossPay)}</div>
                          </div>
                          <div className={`p-1.5 rounded-full transition-colors ${expandedPayslip === ps.id ? 'bg-ledger text-white' : 'bg-paper text-muted border border-line'}`}>
                            {expandedPayslip === ps.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>
                      </button>

                      {expandedPayslip === ps.id && ps.breakdown && (
                        <div className="p-6 bg-paper/20 border-t border-line animate-scaleIn">
                          <div className="grid grid-cols-2 gap-8 text-sm">
                            <div className="space-y-2">
                              <div className="font-bold text-ink uppercase tracking-wider text-[10px] bg-paper/50 px-2 py-1 rounded inline-block mb-2">Earnings</div>
                              {['basic', 'hra', 'da', 'conveyance', 'medical', 'specialAllowance'].map(k => (
                                ps.breakdown[k] > 0 && (
                                  <div key={k} className="flex justify-between items-center text-xs">
                                    <span className="capitalize font-medium text-muted">{k.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-mono font-medium">{fmt(ps.breakdown[k])}</span>
                                  </div>
                                )
                              ))}
                              <div className="flex justify-between font-bold mt-3 pt-3 border-t border-line/50 text-sm">
                                <span>Gross Pay</span><span className="font-mono">{fmt(ps.grossPay)}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="font-bold text-rust uppercase tracking-wider text-[10px] bg-rust/5 px-2 py-1 rounded inline-block mb-2">Deductions</div>
                              {[
                                ['Provident Fund', ps.breakdown.pfDeduction],
                                ['ESI', ps.breakdown.esiDeduction],
                                ['Professional Tax', ps.breakdown.ptDeduction],
                                [`TDS (${ps.breakdown.taxRegime})`, ps.breakdown.tdsMonthly],
                              ].map(([k, v]) => (
                                (v as number) > 0 && (
                                  <div key={k as string} className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-muted">{k}</span>
                                    <span className="font-mono font-medium text-rust">{fmt(v as number)}</span>
                                  </div>
                                )
                              ))}
                              <div className="flex justify-between font-bold mt-3 pt-3 border-t border-line/50 text-sm">
                                <span>Total Deductions</span><span className="font-mono text-rust">{fmt(ps.totalDeductions)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-ledger mt-1 bg-ledger/10 px-3 py-2 rounded">
                                <span>Net Pay</span><span className="font-mono">{fmt(ps.netPay)}</span>
                              </div>
                            </div>
                          </div>
                          {ps.breakdown.taxableAnnual && (
                            <div className="mt-6 pt-4 border-t border-line flex justify-between items-center text-xs">
                              <span className="font-medium text-muted">Taxable Annual Income: <span className="font-mono font-bold text-ink ml-1">{fmt(ps.breakdown.taxableAnnual)}</span></span>
                              <span className="font-medium text-muted">Effective Tax Rate: <span className="font-mono font-bold text-ink ml-1">{ps.breakdown.effectiveTaxRate}</span></span>
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
        <div className="max-w-3xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2"><Calculator size={16} className="text-ledger" /> Quick Tax Simulator</h2>
              <div className="flex gap-3">
                <button onClick={() => setRegime('new')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${regime === 'new' ? 'bg-ledger text-paper shadow-sm' : 'border border-line text-muted hover:text-ink'}`}>New Regime</button>
                <button onClick={() => setRegime('old')} className={`px-4 py-1.5 rounded text-sm font-bold transition-all ${regime === 'old' ? 'bg-amber-500 text-white shadow-sm' : 'border border-line text-muted hover:text-ink'}`}>Old Regime</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {([
                ['Basic', basic, setBasic],
                ['HRA', hra, setHra],
                ['DA', da, setDa],
                ['Conveyance', conveyance, setConveyance],
                ['Medical', medical, setMedical],
                ['Special Allowance', specialAllowance, setSpecialAllowance],
              ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-muted mb-1">{label} (₹/mo)</label>
                  <input type="number" value={val} onChange={e => setter(Number(e.target.value))}
                    className="w-full border border-line bg-paper/50 px-3 py-2 rounded font-mono focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6 bg-gradient-to-br from-ledger/5 to-ledger/10 rounded-xl p-6 text-center border border-ledger/10">
              <div>
                <div className="font-display text-2xl font-bold text-ink">{fmt(taxPreview.grossAnnual)}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-1">Gross Annual</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-rust">{fmt(taxPreview.totalAnnualTax)}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-1">Annual Tax</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-amber-600">{fmt(taxPreview.tdsPerMonth)}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mt-1">TDS / month</div>
              </div>
            </div>

            <div className="text-sm space-y-2 pt-2">
              <div className="flex justify-between font-medium text-muted pb-1 border-b border-line/50"><span>Taxable Income</span><span className="font-mono text-ink">{fmt(taxPreview.taxableIncome)}</span></div>
              <div className="flex justify-between font-medium text-muted pb-1 border-b border-line/50"><span>Standard Deduction</span><span className="font-mono text-ink">{fmt(taxPreview.standardDeduction)}</span></div>
              {taxPreview.hraExemption > 0 && <div className="flex justify-between font-medium text-muted pb-1 border-b border-line/50"><span>HRA Exemption</span><span className="font-mono text-ink">{fmt(taxPreview.hraExemption)}</span></div>}
              
              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Slab Breakdown</div>
                {taxPreview.taxSlabs.length === 0 && <div className="text-ledger font-bold text-sm bg-ledger/10 px-3 py-2 rounded inline-block">✅ No tax (87A rebate applied)</div>}
                {taxPreview.taxSlabs.map(s => (
                  <div key={s.slab} className="flex justify-between text-muted text-xs mb-1"><span>{s.slab}</span><span className="font-mono font-medium">{fmt(s.tax)}</span></div>
                ))}
              </div>
              
              <div className="flex justify-between font-bold pt-3 mt-3 border-t border-line text-base"><span>Effective Rate</span><span className="text-ledger">{taxPreview.effectiveRate}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* === Bonus Tab === */}
      {tab === 'bonus' && isAdmin && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <Gift size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Bonus Administration</h3>
            <p className="text-xs text-muted max-w-md">Schedule and disburse one-time bonuses (e.g., Diwali Bonus, Performance Bonus) in the upcoming payroll cycle.</p>
            <button className="btn-primary mt-2">Add New Bonus</button>
          </div>
        </div>
      )}

      {/* === Incentive Tab === */}
      {tab === 'incentive' && isAdmin && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <Target size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Sales & Performance Incentives</h3>
            <p className="text-xs text-muted max-w-md">Manage variable pay and commissions tied to employee performance metrics.</p>
            <button className="btn-primary mt-2">Log Incentive</button>
          </div>
        </div>
      )}

      {/* === Reports Tab === */}
      {tab === 'reports' && isAdmin && (
        <div className="max-w-4xl animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
            <BarChart3 size={32} className="text-muted/30 mb-2" />
            <h3 className="text-sm font-bold text-ink">Payroll Reporting Engine</h3>
            <p className="text-xs text-muted max-w-md">Generate detailed financial reports including CTC variations, tax summaries, and PF/ESI challans.</p>
            <button className="btn-primary mt-2">Generate Payroll Report</button>
          </div>
        </div>
      )}
    </div>
  );
}
