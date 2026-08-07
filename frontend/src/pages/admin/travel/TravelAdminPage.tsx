import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plane, Check, X } from 'lucide-react';
import { travelApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../components/ui/AdminSection';
import { useToast } from '../../../components/ui/ToastProvider';

export default function TravelAdminPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-travel'], queryFn: travelApi.listForCompany });
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-travel'] });
  const approve = useMutation({
    mutationFn: (id: string) => travelApi.updateStatus(id, 'approved'),
    onSuccess: () => { success('Travel claim approved'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to approve'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => travelApi.updateStatus(id, 'rejected'),
    onSuccess: () => { success('Travel claim rejected'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to reject'),
  });
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''}</span> },
    { key: 'period', header: 'Period', render: (r: any) => <span className="text-xs">{new Date(r.fromDate).toLocaleDateString('en-IN')} → {new Date(r.toDate).toLocaleDateString('en-IN')}</span> },
    { key: 'purpose', header: 'Purpose', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.purpose || '—'}</span> },
    { key: 'advance', header: 'Advance', render: (r: any) => <span className="font-mono font-semibold">₹{r.advance ?? 0}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => approve.mutate(r.id)} disabled={r.status !== 'pending' || approve.isPending} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30"><Check size={15} /></button>
          <button onClick={() => reject.mutate(r.id)} disabled={r.status !== 'pending' || reject.isPending} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><X size={15} /></button>
        </div>
      ),
    },
  ];
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Travel Claims</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Review and approve travel requests across the company.</p>
      </div>
      <AdminSection title="Travel Requests" icon={Plane} subtitle="All travel claims">
        <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No travel requests" emptyMessage="No travel claims found." />
      </AdminSection>
    </div>
  );
}
