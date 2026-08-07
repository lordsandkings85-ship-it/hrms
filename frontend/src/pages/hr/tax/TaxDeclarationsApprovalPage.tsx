import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, Receipt } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';
import { employeeServicesApi as taxApi } from '../../../api/client';

export default function TaxDeclarationsApprovalPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const qc = useQueryClient();

  const { data: declarations, isLoading } = useQuery({
    queryKey: ['tax-declarations-all'],
    queryFn: () => taxApi.listTaxDeclarationsAll(),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approvedAmount }: { id: string; approvedAmount: number }) =>
      taxApi.approveTaxDeclaration(id, approvedAmount),
    onSuccess: () => {
      toastSuccess('Tax declaration approved');
      qc.invalidateQueries({ queryKey: ['tax-declarations-all'] });
    },
    onError: (e: any) => toastError(e?.message || 'Failed to approve declaration'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => taxApi.rejectTaxDeclaration(id),
    onSuccess: () => {
      toastSuccess('Tax declaration rejected');
      qc.invalidateQueries({ queryKey: ['tax-declarations-all'] });
    },
    onError: (e: any) => toastError(e?.message || 'Failed to reject declaration'),
  });

  const pending = (declarations || []).filter((d: any) => d.status === 'pending');

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shadow-inner">
            <Receipt size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Pending TDS Declarations</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and approve employee investment declarations for TDS.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[300px]">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Pending Approvals ({pending.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-sky-500" /></div>
        ) : pending.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-muted)]">No pending tax declarations.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Financial Year</th>
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Declared</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((d: any) => (
                  <tr key={d.id} className="border-b border-[var(--border)]/50 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-[var(--text-primary)]">
                      {d.employee?.firstName ? `${d.employee.firstName} ${d.employee.lastName || ''}` : (d.employeeId || '—')}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--text-muted)]">{d.financialYear || '—'}</td>
                    <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">{d.section}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-muted)]">{d.description || '—'}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[var(--text-primary)]">₹{(d.declaredAmount || 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => approveMutation.mutate({ id: d.id, approvedAmount: d.declaredAmount })}
                          disabled={approveMutation.isPending}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(d.id)}
                          disabled={rejectMutation.isPending}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
