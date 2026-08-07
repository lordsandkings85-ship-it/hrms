import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Loader2, ArrowRight, Undo2, Trash2 } from 'lucide-react';
import { assetsApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../components/ui/AdminSection';
import { useToast } from '../../../components/ui/ToastProvider';
import { useEmployeeList } from '../payroll/sections/shared';

export default function AssetsAdminPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-assets'], queryFn: assetsApi.list });
  const employees = useEmployeeList();
  const [type, setType] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-assets'] });
    queryClient.invalidateQueries({ queryKey: ['my-profile'] });
  };
  const activeAssignment = (r: any) => (Array.isArray(r.assignments) ? r.assignments[0] : null);
  const create = useMutation({
    mutationFn: () => assetsApi.create({ type, identifier: identifier || undefined }),
    onSuccess: () => { success('Asset created'); setType(''); setIdentifier(''); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to create asset'),
  });
  const assign = useMutation({
    mutationFn: (id: string) => assetsApi.assign(id, assignTo[id]),
    onSuccess: () => { success('Asset assigned'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to assign asset'),
  });
  const returnAsset = useMutation({
    mutationFn: (r: any) => {
      const a = activeAssignment(r);
      return assetsApi.returnAsset(r.id, a.id);
    },
    onSuccess: () => { success('Asset returned'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to return asset'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => assetsApi.remove(id),
    onSuccess: () => { success('Asset deleted'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to delete asset'),
  });
  const columns: Column<any>[] = [
    { key: 'type', header: 'Type', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.type}</span> },
    { key: 'identifier', header: 'Identifier', render: (r: any) => <span className="font-mono text-xs">{r.identifier || '—'}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status || (activeAssignment(r) ? 'assigned' : 'available')} /> },
    {
      key: 'assignee', header: 'Assigned To', render: (r: any) => {
        const a = activeAssignment(r);
        return a ? (
          <span className="text-xs font-semibold">{a.employee?.firstName} {a.employee?.lastName}</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <select value={assignTo[r.id] || ''} onChange={(e) => setAssignTo({ ...assignTo, [r.id]: e.target.value })} className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs w-36">
              <option value="">Select…</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
            <button onClick={() => assign.mutate(r.id)} disabled={assign.isPending || !assignTo[r.id]} title="Assign" className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-30"><ArrowRight size={14} /></button>
          </div>
        );
      },
    },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          {activeAssignment(r) ? (
            <button onClick={() => returnAsset.mutate(r)} title="Return" className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10"><Undo2 size={14} /></button>
          ) : null}
          <button
            onClick={() => { if (confirm(`Delete asset "${r.type}${r.identifier ? ' (' + r.identifier + ')' : ''}"? This removes its assignment history.`)) remove.mutate(r.id); }}
            disabled={remove.isPending}
            title="Delete asset"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Assets</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage equipment and asset inventory, assignments and returns.</p>
      </div>
      <AdminSection
        title="Asset Inventory"
        icon={Package}
        subtitle="All company assets"
        right={
          <div className="flex items-end gap-2 flex-wrap">
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (e.g. Laptop)" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-40" />
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Serial / ID" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-40" />
            <button onClick={() => create.mutate()} disabled={!type.trim() || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
              {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
          </div>
        }
      >
        <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No assets" emptyMessage="Add assets to get started." />
      </AdminSection>
    </div>
  );
}
