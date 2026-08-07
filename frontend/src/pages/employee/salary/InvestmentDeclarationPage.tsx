import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, PlusCircle, Edit3, CheckCircle, Clock, AlertTriangle,
  IndianRupee, Home, Heart, GraduationCap, Building2, TrendingUp,
  Loader2, Info, Save, ChevronDown, ChevronUp, Calculator, Send
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../components/ui/ToastProvider';
import { taxApi, payrollApi } from '../../../api/client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Spinner } from '../../../components/ui/Spinner';

interface InvestmentItem {
  section: string;
  category: string;
  description: string;
  maxLimit: number;
}

const INVESTMENT_SECTIONS: { section: string; icon: React.ElementType; color: string; bg: string; limit: number; items: InvestmentItem[] }[] = [
  {
    section: '80C – Investments & Savings', icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/10', limit: 150000,
    items: [
      { section: '80C', category: 'PPF', description: 'Public Provident Fund', maxLimit: 150000 },
      { section: '80C', category: 'ELSS', description: 'Equity Linked Savings Scheme', maxLimit: 150000 },
      { section: '80C', category: 'LIC', description: 'Life Insurance Premium', maxLimit: 150000 },
      { section: '80C', category: 'EPF', description: 'Employee Provident Fund', maxLimit: 150000 },
    ],
  },
  {
    section: '80D – Health Insurance', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', limit: 75000,
    items: [
      { section: '80D', category: 'Self & Family', description: 'Health insurance for self, spouse & children', maxLimit: 25000 },
      { section: '80D', category: 'Senior Parents', description: 'Health insurance for senior citizen parents', maxLimit: 50000 },
    ],
  },
  {
    section: '80CCD(1B) – NPS', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', limit: 50000,
    items: [
      { section: '80CCD(1B)', category: 'NPS Contribution', description: 'National Pension System (additional contribution)', maxLimit: 50000 },
    ],
  },
];

const CURRENT_FY = 'FY 2025-26';
const DEADLINE = 'January 31, 2026';

const DESC_TO_KEY: Record<string, string> = {
  'Public Provident Fund': '80C_PPF',
  'Equity Linked Savings Scheme': '80C_ELSS',
  'Life Insurance Premium': '80C_LIC',
  'Employee Provident Fund': '80C_EPF',
  'Health insurance for self, spouse & children': '80D_Self & Family',
  'Health insurance for senior citizen parents': '80D_Senior Parents',
  'National Pension System (additional contribution)': '80CCD(1B)_NPS Contribution',
};

// Build a dynamic zod schema based on limits
const schemaFields: Record<string, z.ZodTypeAny> = {};
INVESTMENT_SECTIONS.forEach(s => {
  s.items.forEach(item => {
    schemaFields[`${item.section}_${item.category}`] = z.number().min(0).max(item.maxLimit !== 999999 ? item.maxLimit : 9999999999).optional().default(0);
  });
});
const declarationSchema = z.object(schemaFields);
type DeclarationFormData = z.infer<typeof declarationSchema>;

export default function InvestmentDeclarationPage() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const myEmpId = user?.employee?.id || '';

  const { data: dbDecls, isLoading } = useQuery({
    queryKey: ['tax-declarations', myEmpId],
    queryFn: () => taxApi.getDeclarations(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const { data: salaryStructure } = useQuery({
    queryKey: ['salary-structure', myEmpId],
    queryFn: () => payrollApi.getSalaryStructure(myEmpId).catch(() => null),
    enabled: !!myEmpId,
  });

  const monthlyCtc = salaryStructure
    ? (salaryStructure.basic || 0) + (salaryStructure.hra || 0) + (salaryStructure.da || 0)
      + (salaryStructure.conveyance || 0) + (salaryStructure.medical || 0) + (salaryStructure.specialAllowance || 0)
    : 0;
  const grossSalary = monthlyCtc > 0 ? Math.round(monthlyCtc * 12) : 0;

  const { register, watch, reset, handleSubmit, formState: { errors } } = useForm<DeclarationFormData>({
    resolver: zodResolver(declarationSchema),
  });

  useEffect(() => {
    if (dbDecls) {
      const init: Record<string, number> = {};
      dbDecls.forEach((d: any) => {
        const key = DESC_TO_KEY[d.description] || `${d.section}_${d.description.split(' ')[0]}`;
        init[key] = (d.approvedAmount || d.declaredAmount || 0);
      });
      reset(init as any);
    }
  }, [dbDecls, reset]);

  const formValues = watch();
  const declarations = (formValues || {}) as Record<string, number>;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '80C – Investments & Savings': true });

  const submitMutation = useMutation({
    mutationFn: async (lines: Array<{ employeeId: string; financialYear: string; section: string; description: string; declaredAmount: number }>) => {
      for (const line of lines) {
        await taxApi.submitDeclaration(line);
      }
    },
    onSuccess: () => {
      toastSuccess('Investment Declaration submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['tax-declarations', myEmpId] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit declaration'),
  });

  const onSubmit = (data: DeclarationFormData) => {
    const lines: Array<{ employeeId: string; financialYear: string; section: string; description: string; declaredAmount: number }> = [];
    INVESTMENT_SECTIONS.forEach(sec => {
      sec.items.forEach(item => {
        const amount = Number(data[`${item.section}_${item.category}`] || 0);
        if (amount > 0) {
          lines.push({ employeeId: myEmpId, financialYear: CURRENT_FY, section: item.section, description: item.description, declaredAmount: amount });
        }
      });
    });
    if (!lines.length) { toastError('Please enter at least one investment amount.'); return; }
    submitMutation.mutate(lines);
  };

  const toggleSection = (section: string) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

  // Tax calculation
  const standardDeduction = 50000;
  const totalDeductions = Math.min(
    (declarations['80C_PPF'] || 0) + (declarations['80C_ELSS'] || 0) + (declarations['80C_LIC'] || 0) + (declarations['80C_EPF'] || 0), 150000
  ) + Math.min((declarations['80D_Self & Family'] || 0) + (declarations['80D_Senior Parents'] || 0), 75000)
    + Math.min(declarations['80CCD(1B)_NPS Contribution'] || 0, 50000);

  const taxableIncome = Math.max(grossSalary - standardDeduction - totalDeductions, 0);
  const estimatedTax = taxableIncome <= 250000 ? 0 :
    taxableIncome <= 500000 ? (taxableIncome - 250000) * 0.05 :
    taxableIncome <= 1000000 ? 12500 + (taxableIncome - 500000) * 0.2 :
    112500 + (taxableIncome - 1000000) * 0.3;
  const monthlyTDS = Math.round((estimatedTax * 1.04) / 12);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><Spinner /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Investment Declaration"
        subtitle={`${CURRENT_FY} · Submit your investment proofs for TDS computation`}
        icon={Shield}
      />

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">
          Last date to submit investment declarations: <strong className="text-amber-400">{DEADLINE}</strong>. 
          Submission after deadline will result in higher TDS deduction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Declarations Form */}
        <div className="lg:col-span-2 space-y-4">
          <form id="declForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {INVESTMENT_SECTIONS.map(sec => {
              const secTotal = sec.items.reduce((s, item) => s + (declarations[`${item.section}_${item.category}`] || 0), 0);
              const cappedTotal = Math.min(secTotal, sec.limit);
              const isExpanded = expanded[sec.section];

              return (
                <div key={sec.section} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <button type="button" onClick={() => toggleSection(sec.section)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-alt)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${sec.bg}`}><sec.icon size={16} className={sec.color} /></div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-[var(--text-primary)]">{sec.section}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Max: ₹{sec.limit.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${secTotal > sec.limit ? 'text-red-400' : sec.color}`}>
                          ₹{cappedTotal.toLocaleString('en-IN')}
                        </div>
                        {secTotal > sec.limit && <div className="text-xs text-red-400">Capped at limit</div>}
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                      {sec.items.map(item => {
                        const key = `${item.section}_${item.category}`;
                        return (
                          <div key={key} className="flex items-center gap-4 px-5 py-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-[var(--text-primary)]">{item.category}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</div>
                              <div className="text-xs text-[var(--text-muted)]">Max: ₹{item.maxLimit.toLocaleString('en-IN')}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">₹</span>
                                <input
                                  type="number"
                                  {...register(key, { valueAsNumber: true })}
                                  placeholder="0"
                                  className="w-32 pl-7 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                              </div>
                              {errors[key] && <span className="text-xs text-red-500 absolute -bottom-5 right-0">{errors[key]?.message as string}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </form>
        </div>

        {/* Tax Summary Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/5 to-transparent">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-indigo-400" />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">Live Tax Estimate</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Gross Salary</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">₹{grossSalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Total Investments</span>
                <span className="font-mono text-green-400">(₹{totalDeductions.toLocaleString('en-IN')})</span>
              </div>
              <div className="border-t border-[var(--border)] pt-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-[var(--text-primary)]">Taxable Income</span>
                  <span className="font-mono text-[var(--text-primary)]">₹{taxableIncome.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="border-t-2 border-indigo-500/30 pt-3">
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--text-primary)]">Monthly TDS</span>
                  <span className="font-mono text-indigo-400 text-lg">₹{monthlyTDS.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <button type="submit" form="declForm" disabled={submitMutation.isPending}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
                {submitMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {submitMutation.isPending ? 'Submitting...' : 'Submit Declaration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
