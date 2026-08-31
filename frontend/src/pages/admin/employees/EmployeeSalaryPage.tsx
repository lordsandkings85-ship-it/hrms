import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Pencil } from 'lucide-react';
import { employeesApi, payrollApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { DataTable, Column } from '../../../components/ui/DataTable';

const COMPONENTS: { key: string; label: string }[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'hra', label: 'HRA' },
  { key: 'da', label: 'DA' },
  { key: 'conveyance', label: 'Conveyance' },
  { key: 'medical', label: 'Medical' },
  { key: 'specialAllowance', label: 'Special Allowance' },
];

export default function EmployeeSalaryPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [effectiveFrom, setEffectiveFrom] = useState('');

  const { data: employees } = useQuery({ queryKey: ['employees-list'], queryFn: () => employeesApi.list({ pageSize: 100 }) });
  const empList = (employees as any)?.items ?? [];

  const { data: structure, isLoading } = useQuery({
    queryKey: ['salary-structure', employeeId],
    queryFn: () => payrollApi.getSalaryStructure(employeeId),
    enabled: !!employeeId,
  });
  const { data: revisions } = useQuery({
    queryKey: ['salary-revisions', employeeId],
    queryFn: () => payrollApi.getSalaryRevisions(employeeId),
    enabled: !!employeeId,
  });
  const revisionList = Array.isArray(revisions) ? revisions : [];

  const monthlyGross = COMPONENTS.reduce((sum, c) => sum + Number(structure?.[c.key] || 0), 0);

  const saveMutation = useMutation({
    mutationFn: (data: any) => payrollApi.setSalaryStructure(employeeId, data),
    onSuccess: () => {
      toastSuccess('Salary structure saved');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['salary-structure', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['salary-revisions', employeeId] });
    },
    onError: (e: any) => toastError(e?.message || 'Could not save salary structure'),
  });

  const openEdit = () => {
    setForm(Object.fromEntries(COMPONENTS.map(c => [c.key, String(Number(structure?.[c.key] || 0))])));
    setEffectiveFrom(structure?.effectiveFrom ? new Date(structure.effectiveFrom).toISOString().slice(0, 10) : '');
    setEditOpen(true);
  };

  const handleSave = () => {
    const payload: Record<string, number | string> = {};
    for (const c of COMPONENTS) {
      const v = Number(form[c.key]);
      if (!Number.isFinite(v) || v < 0) { toastError(`${c.label} must be a valid number`); return; }
      payload[c.key] = v;
    }
    if (effectiveFrom) payload.effectiveFrom = effectiveFrom;
    payload.pfDeduction = Number(structure?.pfDeduction || 0);
    payload.esiDeduction = Number(structure?.esiDeduction || 0);
    payload.ptDeduction = Number(structure?.ptDeduction || 0);
    saveMutation.mutate(payload);
  };

  const revisionColumns: Column<any>[] = [
    { key: 'effectiveFrom', header: 'Effective From', render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)]">{row.effectiveFrom ? new Date(row.effectiveFrom).toLocaleDateString('en-IN') : '—'}</span> },
    { key: 'basic', header: 'Basic', render: (row: any) => <span className="font-mono text-xs">₹{Number(row.basic || 0).toLocaleString('en-IN')}</span> },
    { key: 'hra', header: 'HRA', render: (row: any) => <span className="font-mono text-xs">₹{Number(row.hra || 0).toLocaleString('en-IN')}</span> },
    { key: 'monthlyGross', header: 'Monthly Gross', render: (row: any) => (
      <span className="font-bold text-[var(--text-primary)]">₹{COMPONENTS.reduce((s, c) => s + Number(row[c.key] || 0), 0).toLocaleString('en-IN')}</span>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <Banknote size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Salary Structure</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">View and update employee salary structures.</p>
          </div>
        </div>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="input max-w-xs" aria-label="Select employee">
          <option value="">Select employee…</option>
          {empList.map((e: any) => (
            <option key={e.id} value={e.id}>{e.employeeCode} — {e.firstName} {e.lastName}</option>
          ))}
        </select>
      </div>

      {!employeeId ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <Banknote size={36} className="text-[var(--text-muted)]/40 mb-3" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Select an employee to view their salary structure</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Current Structure</h3>
              <button onClick={openEdit} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider">
                <Pencil size={14} />
                Edit Structure
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-2"><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-full rounded" /></div>
            ) : !structure ? (
              <p className="text-sm text-[var(--text-muted)]">No salary structure on file yet.</p>
            ) : (
              <div className="space-y-2.5">
                {COMPONENTS.map(c => (
                  <div key={c.key} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">{c.label}</span>
                    <span className="font-mono font-semibold text-[var(--text-primary)]">₹{Number(structure[c.key] || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-3 mt-2 border-t border-[var(--border)]">
                  <span className="font-bold text-[var(--text-primary)]">Monthly Gross</span>
                  <span className="font-mono font-bold text-emerald-600">₹{monthlyGross.toLocaleString('en-IN')}</span>
                </div>
                {structure.effectiveFrom && (
                  <div className="text-[11px] text-[var(--text-muted)]">Effective from {new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 pb-4 border-b border-[var(--border)]">Revision History</h3>
            <DataTable columns={revisionColumns} data={revisionList} loading={isLoading} keyField="id" exportable={false} pageSize={8} />
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setEditOpen(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl w-[min(90vw,480px)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Edit Salary Structure</h3>
            <div className="space-y-3">
              {COMPONENTS.map(c => (
                <div key={c.key} className="grid grid-cols-2 items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">{c.label}</label>
                  <input type="number" min="0" value={form[c.key] ?? ''} onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))} className="input" />
                </div>
              ))}
              <div className="grid grid-cols-2 items-center gap-2">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Effective From</label>
                <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditOpen(false)} className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded shadow-sm">Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="px-4 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {saveMutation.isPending ? 'Saving...' : 'Save Structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
