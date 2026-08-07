import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable, Column } from './DataTable';
import { AdminSection, StatusBadge } from './AdminSection';

export type ApiFieldDef = { key: string; label: string; placeholder?: string; type?: 'text' | 'select'; options?: string[]; numeric?: boolean };

export function ApiTableEditor({ title, icon: Icon, subtitle, fields, load, create, remove, idKey = 'id', note, refreshKey }: {
  title: string;
  icon: React.ElementType;
  subtitle: string;
  fields: ApiFieldDef[];
  load: () => Promise<any[]>;
  create: (data: Record<string, any>) => Promise<any>;
  remove: (id: string) => Promise<any>;
  idKey?: string;
  note?: string;
  refreshKey?: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRef = useRef(load);
  loadRef.current = load;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadRef.current();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const add = async () => {
    if (fields.some((f) => f.type !== 'select' && !(form[f.key] || '').trim())) return;
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {};
      fields.forEach((f) => {
        const raw = form[f.key]?.trim() || (f.type === 'select' ? (f.options?.[0] || '') : '');
        payload[f.key] = f.numeric ? Number(raw) || 0 : raw;
      });
      await create(payload);
      setForm({});
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setError('');
    try {
      await remove(id);
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
    }
  };

  const columns: Column<any>[] = [
    ...fields.map((f): Column<any> => ({
      key: f.key,
      header: f.label,
      render: f.type === 'select'
        ? (r: any) => <StatusBadge status={r[f.key]} />
        : (r: any) => <span className="text-sm font-medium text-[var(--text-primary)]">{r[f.key] ?? '—'}</span>,
    })),
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => handleRemove(r.id ?? r[idKey])} aria-label="Remove row" className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
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
          <button onClick={add} disabled={saving || fields.some((f) => f.type !== 'select' && !(form[f.key] || '').trim())} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            <Plus size={14} /> {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      }
    >
      {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
      {note && <p className="text-sm text-[var(--text-muted)] mb-4">{note}</p>}
      <DataTable columns={columns} data={rows} loading={loading} keyField={idKey} emptyTitle="No entries" emptyMessage="Add entries to get started." />
    </AdminSection>
  );
}
