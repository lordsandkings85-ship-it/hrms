import { useEffect, useState } from 'react';
import { Receipt, Check, X, CircleDollarSign } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../components/ui/AdminSection';
import { expensesApi } from '../../../api/client';

const fmt = (n: number | undefined | null) => n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`;

export default function ExpensesAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await expensesApi.listCompanyLoans();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, fn: (id: string) => Promise<any>, label: string) => {
    setError('');
    try {
      await fn(id);
      await load();
    } catch (e: any) {
      setError(e?.message || `Failed to ${label}`);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r: any) => (
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {r.employee ? `${r.employee.firstName ?? ''} ${r.employee.lastName ?? ''}`.trim() || '—' : '—'}
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: (r: any) => <StatusBadge status={r.type || 'loan'} /> },
    { key: 'purpose', header: 'Purpose', render: (r: any) => <span className="text-sm text-[var(--text-muted)]">{r.purpose || '—'}</span> },
    { key: 'amount', header: 'Amount', render: (r: any) => <span className="text-sm font-bold text-[var(--text-primary)]">{fmt(r.amount)}</span> },
    { key: 'emi', header: 'EMI', render: (r: any) => <span className="text-sm text-[var(--text-muted)]">{r.emi ? fmt(r.emi) : '—'}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'appliedOn', header: 'Applied', render: (r: any) => (
        <span className="text-sm text-[var(--text-muted)]">{r.appliedOn ? new Date(r.appliedOn).toLocaleDateString() : '—'}</span>
      ),
    },
    {
      key: 'actions', header: 'Actions', render: (r: any) => (
        <div className="flex gap-1">
          {(r.status === 'pending') && (
            <>
              <button onClick={() => act(r.id, expensesApi.approveLoan, 'approve')} aria-label="Approve" title="Approve" className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><Check size={14} /></button>
              <button onClick={() => act(r.id, expensesApi.rejectLoan, 'reject')} aria-label="Reject" title="Reject" className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><X size={14} /></button>
            </>
          )}
          {(r.status === 'active') && (
            <button onClick={() => act(r.id, expensesApi.closeLoan, 'close')} aria-label="Close" title="Close loan" className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"><CircleDollarSign size={14} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Loans / Salary Advances</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Review and approve loan / advance requests from the expenses service.</p>
      </div>
      <AdminSection title="Loan & Advance Requests" icon={Receipt} subtitle="Track advances and loan applications">
        {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
        <DataTable columns={columns} data={rows} loading={loading} keyField="id" emptyTitle="No requests" emptyMessage="No loan or advance requests yet." />
      </AdminSection>
    </div>
  );
}
