import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, FileUp, IndianRupee, Send, Clock, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { expensesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/ToastProvider';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const claimSchema = z.object({
  category: z.enum(['travel', 'accommodation', 'food', 'fuel', 'office', 'advance']),
  amount: z.number().positive('Amount must be greater than zero'),
  receiptUrl: z.string().url('Invalid URL').or(z.literal('')),
});

type ClaimFormData = z.infer<typeof claimSchema>;

export default function MyExpensesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const myEmpId = user?.employee?.id || '';
  const { success: toastSuccess, error: toastError } = useToast();
  const isAdvance = pathname.startsWith('/expenses/advance');

  // Fetch expenses for this employee
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['my-expenses-list', myEmpId],
    queryFn: () => expensesApi.listForEmployee(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      category: isAdvance ? 'advance' : 'travel',
      receiptUrl: ''
    }
  });

  // Submit Expense
  const submitExpenseMutation = useMutation({
    mutationFn: expensesApi.submit,
    onSuccess: () => {
      toastSuccess(isAdvance ? 'Advance claim registered successfully!' : 'Expense claim registered successfully!');
      reset();
      queryClient.invalidateQueries({ queryKey: ['my-expenses-list', myEmpId] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit claim'),
  });

  const onSubmit = (data: ClaimFormData) => {
    submitExpenseMutation.mutate({
      employeeId: myEmpId,
      ...data,
    });
  };

  const advanceList = (expenses || []).filter((e: any) => e.category === 'advance');
  const visibleList = isAdvance ? advanceList : (expenses || []);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={isAdvance ? 'Advance Claim' : 'Claims & Reimbursements'}
        subtitle={isAdvance ? 'Request a salary advance against future expenses.' : 'Submit expense reports, upload receipts, and check reimbursement statuses.'}
        icon={isAdvance ? Wallet : Receipt}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit Claim form */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 h-fit space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
            {isAdvance ? <Wallet className="text-indigo-500" size={16} /> : <Receipt className="text-indigo-500" size={16} />} {isAdvance ? 'Request Advance' : 'Submit Claim'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Category</label>
              {isAdvance ? (
                <input
                  type="text"
                  value="Advance"
                  disabled
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none opacity-70"
                />
              ) : (
                <select
                  {...register('category')}
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                >
                  <option value="travel">Travel</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="food">Meals / Food</option>
                  <option value="fuel">Fuel &amp; Transport</option>
                  <option value="office">Office Supplies</option>
                </select>
              )}
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Amount (₹) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                placeholder="₹0.00"
                {...register('amount', { valueAsNumber: true })}
                className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none font-mono"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Receipt URL (Optional)</label>
              <input
                type="text"
                placeholder="https://storage.hrms.internal/..."
                {...register('receiptUrl')}
                className="w-full bg-[var(--surface-alt)] text-xs text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none font-mono"
              />
              {errors.receiptUrl && <p className="text-xs text-red-500 mt-1">{errors.receiptUrl.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitExpenseMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={15} /> {submitExpenseMutation.isPending ? 'Submitting...' : isAdvance ? 'Request Advance' : 'Submit Claim'}
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 h-fit space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
            {isAdvance ? <Wallet className="text-indigo-500" size={16} /> : <Receipt className="text-indigo-500" size={16} />} {isAdvance ? 'Advance Claims Registry' : 'Claims Registry'}
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : visibleList.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">{isAdvance ? 'No advance claims filed yet.' : 'No expense claims filed yet.'}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {visibleList.map((exp: any) => {
                const statusColors: Record<string, { badge: string, icon: React.ElementType }> = {
                  pending: { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
                  manager_approved: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
                  approved: { badge: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
                  rejected: { badge: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle }
                };
                const cfg = statusColors[exp.status] || { badge: 'bg-slate-550/10 text-slate-400 border-slate-500/20', icon: Clock };
                const StatusIcon = cfg.icon;
                return (
                  <div key={exp.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
                        <IndianRupee size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--text-primary)] capitalize truncate">
                          {exp.category}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          Submitted on {new Date(exp.createdAt).toLocaleDateString('en-IN')}
                          {exp.receiptUrl && (
                            <a
                              href={exp.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 ml-2 hover:underline inline-flex items-center gap-0.5"
                            >
                              Receipt <FileUp size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <span className="font-mono font-bold text-[var(--text-primary)]">₹{exp.amount.toLocaleString('en-IN')}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                        <StatusIcon size={10} />
                        {exp.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
