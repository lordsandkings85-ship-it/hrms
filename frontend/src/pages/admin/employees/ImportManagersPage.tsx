import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Plus, Play } from 'lucide-react';
import { employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';

interface ManagerRow {
  id: string;
  employeeCode: string;
  managerCode: string;
  companyEmail: string;
}

let idCounter = 0;

const nextId = () => `m${++idCounter}`;

export default function ImportManagersPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [text, setText] = useState('');
  const [rows, setRows] = useState<ManagerRow[]>([]);
  const [results, setResults] = useState<any[] | null>(null);

  const parse = () => {
    const seen = new Map<string, ManagerRow>();
    for (const line of text.split('\n')) {
      const [employeeCode = '', managerCode = '', companyEmail = ''] = line.split(',').map((s) => s.trim());
      if (!employeeCode) continue;
      seen.set(employeeCode, {
        id: nextId(),
        employeeCode,
        managerCode,
        companyEmail,
      });
    }
    setRows([...seen.values()]);
    setResults(null);
  };

  const updateRow = (id: string, patch: Partial<ManagerRow>) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const addRow = () => {
    setRows([...rows, { id: nextId(), employeeCode: '', managerCode: '', companyEmail: '' }]);
    setResults(null);
  };

  const importMut = useMutation({
    mutationFn: () => {
      const items = rows
        .map((r) => ({ employeeCode: r.employeeCode.trim(), managerCode: r.managerCode.trim(), companyEmail: r.companyEmail.trim() }))
        .filter((r) => r.employeeCode !== '')
        .map((r) => {
          const item: { employeeCode: string; managerCode?: string; companyEmail?: string } = { employeeCode: r.employeeCode };
          if (r.managerCode) item.managerCode = r.managerCode;
          if (r.companyEmail) item.companyEmail = r.companyEmail;
          return item;
        });
      return employeesApi.importManagers(items);
    },
    onSuccess: (res: any) => {
      const result = res?.result ?? [];
      const updated = result.filter((r: any) => r.status === 'updated').length;
      const failed = result.length - updated;
      setResults(result);
      if (failed > 0) {
        toastError(`${updated} updated, ${failed} failed`);
      } else {
        toastSuccess(`${updated} updated, ${failed} failed`);
      }
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Import failed'),
  });

  const previewColumns: Column<ManagerRow>[] = [
    {
      key: 'employeeCode',
      header: 'Employee Code',
      render: (row) => (
        <input
          type="text"
          value={row.employeeCode}
          onChange={(e) => updateRow(row.id, { employeeCode: e.target.value })}
          placeholder="EMP001"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      ),
    },
    {
      key: 'managerCode',
      header: 'Manager Code',
      render: (row) => (
        <input
          type="text"
          value={row.managerCode}
          onChange={(e) => updateRow(row.id, { managerCode: e.target.value })}
          placeholder="EMP002"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      ),
    },
    {
      key: 'companyEmail',
      header: 'Company Email',
      render: (row) => (
        <input
          type="text"
          value={row.companyEmail}
          onChange={(e) => updateRow(row.id, { companyEmail: e.target.value })}
          placeholder="name@company.com"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      ),
    },
    {
      key: 'remove',
      header: '',
      render: (row) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => removeRow(row.id)}
            aria-label="Remove row"
            className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ),
    },
  ];

  const resultColumns: Column<any>[] = [
    {
      key: 'employeeCode',
      header: 'Employee Code',
      render: (row) => <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-primary)]">{row.employeeCode}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.status === 'updated' ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">updated</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-red-500/10 text-red-500 border-red-500/20">failed</span>
        ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <span className="text-xs text-[var(--text-muted)]">{row.reason || '—'}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <Upload size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Import Managers</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Import reporting managers & company emails</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Import Managers
            </h3>
          </div>
          <div className="text-xs text-[var(--text-muted)] font-medium">{rows.length} rows parsed</div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Paste rows — one per line: employeeCode,managerCode,companyEmail
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'employeeCode,managerCode,companyEmail'}
              rows={6}
              className="w-full px-3 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors resize-y"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={parse}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 transition-colors bg-[var(--surface-alt)] text-xs font-semibold"
              >
                <Play size={14} />
                Parse
              </button>
              <button
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-colors text-xs font-semibold"
              >
                <Plus size={14} />
                Add row
              </button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="premium-datatable">
              <style>{`
                 .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                 .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                 .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                 .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                 .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                 .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
              `}</style>

              <DataTable
                columns={previewColumns}
                data={rows}
                keyField="id"
                pageSize={100}
                searchable={false}
                showToolbar={false}
                selectable={false}
                exportable={false}
                emptyTitle="No rows"
                emptyMessage="Paste lines above and click Parse."
              />

              <div className="flex items-center justify-end mt-4">
                <button
                  onClick={() => {
                    if (!rows.some((r) => r.employeeCode.trim() !== '')) {
                      toastError('No valid rows to import');
                      return;
                    }
                    importMut.mutate();
                  }}
                  disabled={importMut.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                >
                  <Upload size={14} />
                  Import
                </button>
              </div>
            </div>
          )}

          {results && (
            <div className="premium-datatable">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Import Results</h3>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {results.filter((r) => r.status === 'updated').length} updated, {results.filter((r) => r.status !== 'updated').length} failed
                </span>
              </div>
              <DataTable
                columns={resultColumns}
                data={results}
                keyField="employeeCode"
                pageSize={100}
                searchable={false}
                showToolbar={false}
                selectable={false}
                exportable={false}
                emptyTitle="No results"
                emptyMessage="Nothing was imported."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
