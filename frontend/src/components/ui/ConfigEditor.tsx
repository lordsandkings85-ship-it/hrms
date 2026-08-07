import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { DataTable, Column } from './DataTable';
import { AdminSection, StatusBadge } from './AdminSection';
import { loadLocal, saveLocal } from '../../utils/localStore';
import { configApi } from '../../api/client';

export type FieldDef = { key: string; label: string; placeholder?: string; type?: 'text' | 'select'; options?: string[]; width?: string };

export function ConfigEditor({ storageKey, backendKey, title, icon: Icon, subtitle, fields, defaultRows, note }: {
  storageKey: string;
  backendKey?: string;
  title: string;
  icon: React.ElementType;
  subtitle: string;
  fields: FieldDef[];
  defaultRows: any[];
  note?: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<any[]>(() => loadLocal(storageKey, defaultRows));
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!backendKey) return;
    let active = true;
    configApi.list().then((settings) => {
      if (!active) return;
      const found = (settings || []).find((s: any) => s.key === backendKey);
      const loaded = found?.value;
      if (Array.isArray(loaded) && loaded.length > 0) setRows(loaded);
    }).catch(() => {});
    return () => { active = false; };
  }, [backendKey]);

  const persistMutation = useMutation({
    mutationFn: (next: any[]) => backendKey ? configApi.upsert(backendKey, next) : Promise.resolve(next),
    onSuccess: () => {
      if (backendKey) queryClient.invalidateQueries({ queryKey: ['settings-config'] });
    },
  });

  const persist = (next: any[]) => {
    setRows(next);
    saveLocal(storageKey, next);
    if (backendKey) persistMutation.mutate(next);
  };

  const add = () => {
    if (fields.some((f) => f.type !== 'select' && !(form[f.key] || '').trim())) return;
    const row: any = { id: `r_${Date.now()}` };
    fields.forEach((f) => { row[f.key] = form[f.key]?.trim() || (f.type === 'select' ? (f.options?.[0] || '') : ''); });
    persist([...rows, row]);
    setForm({});
  };
  const remove = (id: string) => persist(rows.filter((r) => r.id !== id));
  const columns: Column<any>[] = [
    ...fields.map((f): Column<any> => ({
      key: f.key,
      header: f.label,
      render: f.type === 'select'
        ? (r: any) => <StatusBadge status={r[f.key]} />
        : (r: any) => <span className="text-sm font-medium text-[var(--text-primary)]">{r[f.key] || '—'}</span>,
    })),
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => remove(r.id)} aria-label="Remove row" className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
      ),
    },
  ];
  return (
    <AdminSection
      title={title}
      icon={Icon}
      subtitle={subtitle}
      right={
        <div className="flex items-end gap-2 flex-wrap">
          {persistMutation.isPending && <Loader2 size={14} className="animate-spin text-[var(--text-muted)] self-center" />}
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select value={form[f.key] || f.options?.[0] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} aria-label={f.label} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-44" />
              )}
            </div>
          ))}
          <button onClick={add} disabled={fields.some((f) => f.type !== 'select' && !(form[f.key] || '').trim())} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            <Plus size={14} /> Add
          </button>
        </div>
      }
    >
      {note && <p className="text-sm text-[var(--text-muted)] mb-4">{note}</p>}
      <DataTable columns={columns} data={rows} loading={false} keyField="id" emptyTitle="No entries" emptyMessage="Add entries to get started." />
    </AdminSection>
  );
}
