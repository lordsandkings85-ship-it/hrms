import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee, CreditCard, Plus, CheckCircle, Clock, AlertTriangle,
  TrendingDown, FileText, Loader2, ChevronDown, X, Calendar,
  Wallet, BarChart3, ArrowDownLeft, ArrowUpRight, Send, Eye, ArrowLeft
} from 'lucide-react';
import { expensesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type TabKey = 'overview' | 'loans' | 'advances' | 'apply';

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: Clock },
  approved:  { label: 'Approved',  color: 'bg-green-500/10 text-green-400 border-green-500/20',   icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: AlertTriangle },
  active:    { label: 'Active',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       icon: ArrowDownLeft },
  closed:    { label: 'Closed',    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',    icon: CheckCircle },
};

const loanSchema = z.object({
  requestType: z.enum(['loan', 'advance']),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
  amount: z.number().positive('Amount must be greater than zero'),
  repayMonths: z.number().min(1).max(60),
  reason: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

function StatusBadge({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <cfg.icon size={11} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-[var(--surface-alt)] rounded-full overflow-hidden">
      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function LoansAdvancesPage() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const myEmpId = user?.employee?.id || '';

  const [tab, setTab] = useState<TabKey>('overview');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Queries
  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['my-loans', myEmpId],
    queryFn: () => expensesApi.listLoans(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: { requestType: 'advance', repayMonths: 12, reason: '' }
  });

  const requestType = watch('requestType');

  const applyMutation = useMutation({
    mutationFn: expensesApi.applyLoan,
    onSuccess: () => {
      toastSuccess('Application submitted successfully!');
      reset();
      queryClient.invalidateQueries({ queryKey: ['my-loans', myEmpId] });
      setTab('overview');
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit application'),
  });

  const onSubmit = (data: LoanFormData) => {
    applyMutation.mutate({ employeeId: myEmpId, ...data });
  };

  const activeLoans = loans.filter((l: any) => l.type === 'loan' && l.status === 'active');
  const advances = loans.filter((l: any) => l.type === 'advance');
  const totalOutstanding = loans.filter((l: any) => l.status === 'active').reduce((s: number, l: any) => s + (l.balance || 0), 0);
  const totalRepaid = loans.reduce((s: number, l: any) => s + (l.amountRepaid || 0), 0);

  return (
    <div className="page-container max-w-5xl space-y-6">
      <PageHeader 
        title="Loans & Salary Advances" 
        subtitle="Manage your employee loans, salary advances, and track your EMIs."
      />

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-2 overflow-x-auto shrink-0 pb-px">
        {[
          { id: 'overview', label: 'Dashboard', icon: BarChart3 },
          { id: 'loans', label: 'My Loans', icon: Wallet },
          { id: 'advances', label: 'Salary Advances', icon: ArrowUpRight },
          { id: 'apply', label: 'New Application', icon: Plus }
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setTab(item.id as any); setSelectedRecord(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors duration-200 shrink-0 ${
                active 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 min-h-[500px]">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Outstanding</p>
                  <p className="text-2xl font-black text-[var(--text-primary)] font-mono mt-0.5">₹{totalOutstanding.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Repaid</p>
                  <p className="text-2xl font-black text-[var(--text-primary)] font-mono mt-0.5">₹{totalRepaid.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Active Applications</p>
                  <p className="text-2xl font-black text-[var(--text-primary)] font-mono mt-0.5">{activeLoans.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-4">
                <Wallet className="text-indigo-500" size={16} /> Active EMI Schedule
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : activeLoans.length > 0 ? (
                <div className="space-y-4">
                  {activeLoans.map((loan: any) => (
                    <div key={loan.id} className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                      <div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">{loan.purpose}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                          <Calendar size={12} /> Next EMI: {new Date(loan.nextEmiDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-500 text-lg">₹{loan.emi?.toLocaleString()}</div>
                        <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">EMI Amount</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)] flex flex-col items-center justify-center gap-3">
                  <CheckCircle size={32} className="text-emerald-500/50" />
                  <p className="text-sm">No active loans or EMIs scheduled.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPLY TAB */}
        {tab === 'apply' && (
          <div className="animate-in fade-in zoom-in-95 duration-300 flex justify-center">
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-xs w-full max-w-2xl">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-6 uppercase tracking-wider">
                <FileText className="text-indigo-500" size={16} /> New Application Form
              </h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">Request Type <span className="text-rose-500">*</span></label>
                    <select 
                      {...register('requestType')}
                      className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="advance">Salary Advance</option>
                      <option value="loan">Employee Loan</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">Amount Requested (₹) <span className="text-rose-500">*</span></label>
                    <input 
                      type="number"
                      placeholder="e.g. 50000"
                      {...register('amount', { valueAsNumber: true })}
                      className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {errors.amount && <p className="text-xs text-rose-500">{errors.amount.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">Purpose / Title <span className="text-rose-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="e.g. Medical Emergency"
                      {...register('purpose')}
                      className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {errors.purpose && <p className="text-xs text-rose-500">{errors.purpose.message}</p>}
                  </div>

                  {requestType === 'loan' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-primary)]">Repayment Tenure (Months) <span className="text-rose-500">*</span></label>
                      <select 
                        {...register('repayMonths', { valueAsNumber: true })}
                        className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        {[3,6,12,18,24,36].map(m => <option key={m} value={m}>{m} Months</option>)}
                      </select>
                      {errors.repayMonths && <p className="text-xs text-rose-500">{errors.repayMonths.message}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">Detailed Reason (Optional)</label>
                  <textarea 
                    rows={4}
                    placeholder="Provide additional details..."
                    {...register('reason')}
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => { reset(); setTab('overview'); }}
                    className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={applyMutation.isPending}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send size={16} /> {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LOANS TAB */}
        {tab === 'loans' && (
          <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-4 uppercase tracking-wider">
              <Wallet className="text-indigo-500" size={16} /> My Loans
            </h3>
            {isLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : loans.filter((l: any) => l.type === 'loan').length > 0 ? (
              <div className="space-y-4">
                {loans.filter((l: any) => l.type === 'loan').map((loan: any) => (
                  <div key={loan.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">{loan.purpose}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">Amount: ₹{loan.amount.toLocaleString()}</div>
                    </div>
                    <StatusBadge status={loan.status as any} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-xs text-[var(--text-muted)]">No loans applied yet.</p>
            )}
          </div>
        )}

        {/* ADVANCES TAB */}
        {tab === 'advances' && (
          <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-4 mb-4 uppercase tracking-wider">
              <ArrowUpRight className="text-indigo-500" size={16} /> Salary Advances
            </h3>
            {isLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : advances.length > 0 ? (
              <div className="space-y-4">
                {advances.map((adv: any) => (
                  <div key={adv.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">{adv.purpose}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">Amount: ₹{adv.amount.toLocaleString()}</div>
                    </div>
                    <StatusBadge status={adv.status as any} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-xs text-[var(--text-muted)]">No salary advances applied yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
