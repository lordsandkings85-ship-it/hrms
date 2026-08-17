import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Laptop, Plus, MoreVertical, Edit2, Trash2, Undo2 } from 'lucide-react';
import { employeesApi, assetsApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { DataTable, Column } from '../../../components/ui/DataTable';

export default function EmployeeAssetsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<any>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [newType, setNewType] = useState('');
  const [newIdentifier, setNewIdentifier] = useState('');

  const { data: assets, isLoading } = useQuery({ queryKey: ['assets'], queryFn: () => assetsApi.list() });
  const { data: employees } = useQuery({ queryKey: ['employees-list'], queryFn: () => employeesApi.list({ pageSize: 100 }) });

  const assetList = Array.isArray(assets) ? assets : [];
  const empList = (employees as any)?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assets'] });

  const createMutation = useMutation({
    mutationFn: () => assetsApi.create({ type: newType, identifier: newIdentifier || undefined }),
    onSuccess: () => { toastSuccess('Asset added'); setAddOpen(false); setNewType(''); setNewIdentifier(''); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not add asset'),
  });

  const assignMutation = useMutation({
    mutationFn: (v: { assetId: string; employeeId: string }) => assetsApi.assign(v.assetId, v.employeeId),
    onSuccess: () => { toastSuccess('Asset assigned'); setAssignFor(null); setAssignEmployeeId(''); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not assign asset'),
  });

  const returnMutation = useMutation({
    mutationFn: (v: { assetId: string; assignmentId: string }) => assetsApi.returnAsset(v.assetId, v.assignmentId),
    onSuccess: () => { toastSuccess('Asset returned'); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not return asset'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetsApi.remove(id),
    onSuccess: () => { toastSuccess('Asset deleted'); invalidate(); },
    onError: (e: any) => toastError(e?.message || 'Could not delete asset'),
  });

  const columns: Column<any>[] = [
    { key: 'type', header: 'Asset Type', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.type}</span> },
    { key: 'identifier', header: 'Identifier', render: (row: any) => <span className="font-mono text-xs uppercase text-[var(--text-muted)] tracking-wider">{row.identifier || '—'}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${row.status === 'assigned' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'}`}>{row.status}</span>
    )},
    { key: 'assignedTo', header: 'Assigned To', render: (row: any) => {
      const a = row.assignments?.[0];
      return a?.employee ? <span className="text-[var(--text-primary)] text-xs font-semibold">{a.employee.firstName} {a.employee.lastName}</span> : <span className="text-[var(--text-muted)] text-xs">—</span>;
    }},
    { key: 'createdAt', header: 'Added On', render: (row: any) => <span className="font-mono text-xs text-[var(--text-muted)]">{row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '—'}</span> },
    { key: 'actions', header: '', render: (row: any) => {
      const a = row.assignments?.[0];
      return (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'available' && (
            <button aria-label="Assign" title="Assign to employee" onClick={() => { setAssignFor(row); setAssignEmployeeId(''); }} className="p-1.5 text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
              <Edit2 size={14} />
            </button>
          )}
          {row.status === 'assigned' && a && (
            <button aria-label="Return" title="Return asset" onClick={() => { if (confirm(`Return ${row.type} from ${a.employee.firstName} ${a.employee.lastName}?`)) returnMutation.mutate({ assetId: row.id, assignmentId: a.id }); }} className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
              <Undo2 size={14} />
            </button>
          )}
          <button aria-label="Delete" title="Delete asset" onClick={() => { if (confirm(`Delete asset ${row.type}${row.identifier ? ' (' + row.identifier + ')' : ''}?`)) deleteMutation.mutate(row.id); }} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
          <button aria-label="Row actions" className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>
      );
    }},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <Laptop size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Assets</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage assets assigned to employees.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Assets Database
              <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20">{assetList.length}</span>
            </h3>
          </div>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider">
            <Plus size={16} />
            <span>Add Employee Assets</span>
          </button>
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
          <DataTable columns={columns} data={assetList} loading={isLoading} keyField="id" exportFilename="assets.csv" />
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setAddOpen(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl w-[min(90vw,480px)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Add Employee Asset</h3>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Asset Type <span className="text-red-500">*</span></label>
            <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="e.g. Laptop, Mouse, ID Card" className="input mb-3" />
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Identifier</label>
            <input value={newIdentifier} onChange={e => setNewIdentifier(e.target.value)} placeholder="e.g. Serial number" className="input mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAddOpen(false)} className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded shadow-sm">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!newType.trim() || createMutation.isPending} className="px-4 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {createMutation.isPending ? 'Saving...' : 'Save Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setAssignFor(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl w-[min(90vw,480px)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Assign Asset</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">{assignFor.type}{assignFor.identifier ? ` (${assignFor.identifier})` : ''}</p>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Employee <span className="text-red-500">*</span></label>
            <select value={assignEmployeeId} onChange={e => setAssignEmployeeId(e.target.value)} className="input mb-4">
              <option value="">Select employee</option>
              {empList.map((e: any) => (
                <option key={e.id} value={e.id}>{e.employeeCode} — {e.firstName} {e.lastName}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignFor(null)} className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded shadow-sm">Cancel</button>
              <button onClick={() => assignMutation.mutate({ assetId: assignFor.id, employeeId: assignEmployeeId })} disabled={!assignEmployeeId || assignMutation.isPending} className="px-4 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
