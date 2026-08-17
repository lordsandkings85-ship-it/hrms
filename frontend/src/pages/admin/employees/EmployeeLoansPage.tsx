import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Check, X, Lock } from 'lucide-react';
import { expensesApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';

export default function EmployeeLoansPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { data: loans, isLoading } = useQuery({ queryKey: ['company-loans'], queryFn: () => expensesApi.listCompanyLoans() });
  const loanList = Array.isArray(loans) ? loans : [];

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['company-loans'] }); queryClient.invalidateQueries({ queryKey: ['my-loans'] }); };

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approveLoan(id),
    onSuccess: () => { toastSuccess('Loan approved'); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not approve loan'),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => expensesApi.rejectLoan(id),
    onSuccess: () => { toastSuccess('Loan rejected'); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not reject loan'),
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => expensesApi.closeLoan(id),
    onSuccess: () => { toastSuccess('Loan closed'); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not close loan'),
  });

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (row: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs border border-indigo-500/20">
          {(row.employee?.firstName?.[0] || 'E') + (row.employee?.lastName?.[0] || '')}
        </div>
        <div>
          <div className="font-bold text-[var(--text-primary)]">{row.employee?.firstName} {row.employee?.lastName}</div>
          <div className="font-mono text-[10px] uppercase text-[var(--text-muted)]">{row.employee?.employeeCode}</div>
        </div>
      </div>
    )},
    { key: 'type', header: 'Type', render: (row: any) => (
      <span className="text-[var(--text-muted)] font-medium bg-[var(--surface-alt)] px-2 py-1 rounded-md border border-[var(--border)] uppercase text-[10px]">{row.type || 'loan'}</span>
    )},
    { key: 'amount', header: 'Amount', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">₹{Number(row.amount || 0).toLocaleString('en-IN')}</span> },
    { key: 'purpose', header: 'Purpose', render: (row: any) => <span className="max-w-[200px] truncate block text-xs text-[var(--text-muted)]">{row.purpose || '—'}</span> },
    { key: 'emi', header: 'EMI', render: (row: any) => row.emiMonths ? <span className="font-mono text-xs text-[var(--text-primary)]">₹{Number(row.emi || 0).toLocaleString('en-IN')} × {row.emiMonths}</span> : <span className="text-[var(--text-muted)] text-xs">—</span> },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
    { key: 'appliedOn', header: 'Applied On', render: (row: any) => <span className="font-mono text-xs text-[var(--text-muted)]">{row.appliedOn ? new Date(row.appliedOn).toLocaleDateString('en-IN') : '—'}</span> },
    { key: 'actions', header: 'Actions', render: (row: any) => (
      <div className="flex items-center gap-2">
        {row.status === 'pending' && (
          <>
            <button onClick={() => approveMutation.mutate(row.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
              <Check size={12} /> Approve
            </button>
            <button onClick={() => { if (confirm('Reject this loan request?')) rejectMutation.mutate(row.id); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
              <X size={12} /> Reject
            </button>
          </>
        )}
        {(row.status === 'approved' || row.status === 'active') && (
          <button onClick={() => { if (confirm('Mark this loan as fully closed?')) closeMutation.mutate(row.id); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/10 text-[var(--text-muted)] hover:bg-slate-500 hover:text-white border border-[var(--border)] text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
            <Lock size={12} /> Close
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <HandCoins size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Loans & Advances</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and manage employee loan and advance requests.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Loan Requests
              <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20">{loanList.length}</span>
            </h3>
          </div>
        </div>

        <div className="premium-datatable">
          <style>{`
            .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
            .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
            .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
            .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
            .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
            .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          <DataTable columns={columns} data={loanList} loading={isLoading} keyField="id" exportFilename="loans.csv" />
        </div>
      </div>
    </div>
  );
}
