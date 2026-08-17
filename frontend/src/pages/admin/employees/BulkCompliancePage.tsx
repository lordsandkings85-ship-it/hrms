import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Edit2, X } from 'lucide-react';
import { employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';

const EMPTY_FIELDS = { uan: '', pfNumber: '', esic: '', pan: '', aadhaar: '' };
const FIELD_LABELS: [keyof typeof EMPTY_FIELDS, string][] = [
  ['uan', 'UAN'],
  ['pfNumber', 'PF Number'],
  ['esic', 'ESIC'],
  ['pan', 'PAN'],
  ['aadhaar', 'Aadhaar'],
];

export default function BulkCompliancePage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [editing, setEditing] = useState<any | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({ ...EMPTY_FIELDS });
  const [applyAll, setApplyAll] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 100 }),
  });

  const empList = employees?.items ?? [];

  const openModal = (row: any) => {
    setEditing(row);
    setFields({
      uan: row.uan || '',
      pfNumber: row.pfNumber || '',
      esic: row.esic || '',
      pan: row.pan || '',
      aadhaar: row.aadhaar || '',
    });
    setApplyAll(false);
  };

  const save = useMutation({
    mutationFn: () => {
      const defined: Record<string, string> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value.trim() !== '') defined[key] = value.trim();
      }
      const items = applyAll
        ? empList.map((e: any) => ({ employeeId: e.id, ...defined }))
        : [{ employeeId: editing.id, ...defined }];
      return employeesApi.bulkCompliance(items);
    },
    onSuccess: (res: any) => {
      const text = `Updated: ${res?.updated ?? 0}, Skipped: ${res?.skipped?.length ?? 0}`;
      if ((res?.skipped?.length ?? 0) > 0) {
        toastError(text);
      } else {
        toastSuccess(text);
      }
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update compliance'),
  });

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {((row.firstName || '?')[0] || '')}{((row.lastName || '?')[0] || '')}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text-primary)] text-sm truncate">{row.firstName} {row.lastName}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{row.employeeCode}</div>
          </div>
        </div>
      ),
    },
    { key: 'uan', header: 'UAN', render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)]">{row.uan || '—'}</span> },
    { key: 'pfNumber', header: 'PF Number', render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)]">{row.pfNumber || '—'}</span> },
    { key: 'esic', header: 'ESIC', render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)]">{row.esic || '—'}</span> },
    { key: 'pan', header: 'PAN', render: (row: any) => <span className="font-mono text-xs uppercase text-[var(--text-primary)]">{row.pan || '—'}</span> },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => openModal(row)}
            aria-label="Edit compliance"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-colors text-xs font-semibold"
          >
            <Edit2 size={12} />
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Bulk Compliance</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Update statutory compliance data in bulk.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Compliance Records
            </h3>
          </div>
          <div className="text-xs text-[var(--text-muted)] font-medium">{empList.length} employees</div>
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

          <DataTable columns={columns} data={empList} loading={isLoading} keyField="id" pageSize={100} selectable={false} />
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl w-[min(90vw,560px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Edit Compliance — {editing.firstName} {editing.lastName}
              </h3>
              <button onClick={() => setEditing(null)} aria-label="Close" className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {FIELD_LABELS.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</label>
                  <input
                    type="text"
                    value={fields[key]}
                    onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyAll}
                onChange={(e) => setApplyAll(e.target.checked)}
                className="rounded border-[var(--border)] accent-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-[var(--text-primary)] font-medium">Apply to all {empList.length} listed employees</span>
            </label>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (Object.values(fields).every((v) => v.trim() === '')) {
                    toastError('Enter at least one field');
                    return;
                  }
                  save.mutate();
                }}
                disabled={save.isPending}
                className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-xs font-bold disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
