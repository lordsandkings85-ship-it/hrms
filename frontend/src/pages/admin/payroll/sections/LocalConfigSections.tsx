import { useState } from 'react';
import { CalendarRange, ListChecks, Tags, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { MONTHS, SectionCard } from './shared';
import { useBackedConfig } from '../../../../hooks/useBackedConfig';

function initialCalendar() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: MONTHS[i],
    runDate: '25',
    paymentDate: 'Last working day',
    cycleType: 'Monthly',
  }));
}

export function PayrollCalendarSection() {
  const [rows, setRows, saving] = useBackedConfig<any[]>('payroll-config-calendar', 'payroll.calendar', initialCalendar());
  const [saved, setSaved] = useState(false);
  const persist = (next: any[]) => {
    setRows(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <SectionCard
      title="Payroll Calendar"
      icon={CalendarRange}
      right={
        <button onClick={() => persist(rows)} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saved ? 'Saved' : 'Save'}
        </button>
      }
    >
      <p className="text-sm text-[var(--text-muted)] mb-4">Configure payroll run and payment dates per month. Synced to the backend settings store.</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-alt)]">
            <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <th className="px-4 py-3 font-bold">Month</th>
              <th className="px-4 py-3 font-bold">Run Date</th>
              <th className="px-4 py-3 font-bold">Payment Date</th>
              <th className="px-4 py-3 font-bold">Cycle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.month} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{r.monthName}</td>
                <td className="px-4 py-3"><input value={r.runDate} onChange={(e) => { const next = rows.map((x: any) => x.month === r.month ? { ...x, runDate: e.target.value } : x); setRows(next); }} className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-28 focus:outline-none focus:border-indigo-500" /></td>
                <td className="px-4 py-3"><input value={r.paymentDate} onChange={(e) => { const next = rows.map((x: any) => x.month === r.month ? { ...x, paymentDate: e.target.value } : x); setRows(next); }} className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-40 focus:outline-none focus:border-indigo-500" /></td>
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{r.cycleType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function PayrollMastersSection() {
  const [masters, setMasters, saving] = useBackedConfig<any[]>('payroll-config-masters', 'payroll.masters', [
    { id: 'pf', name: 'Provident Fund', rate: '12%', enabled: true },
    { id: 'esi', name: 'ESI', rate: '0.75%', enabled: true },
    { id: 'pt', name: 'Professional Tax', rate: 'State-wise slab', enabled: true },
    { id: 'gratuity', name: 'Gratuity', rate: '4.81%', enabled: false },
  ]);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [saved, setSaved] = useState(false);
  const persist = (next: any[]) => {
    setMasters(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const toggle = (id: string) => persist(masters.map((m: any) => m.id === id ? { ...m, enabled: !m.enabled } : m));
  const remove = (id: string) => persist(masters.filter((m: any) => m.id !== id));
  const add = () => {
    if (!name.trim()) return;
    persist([...masters, { id: `m_${Date.now()}`, name: name.trim(), rate: rate.trim() || '—', enabled: true }]);
    setName(''); setRate('');
  };
  return (
    <SectionCard
      title="Payroll Masters"
      icon={ListChecks}
      right={
        <button onClick={() => persist(masters)} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saved ? 'Saved' : 'Save'}
        </button>
      }
    >
      <p className="text-sm text-[var(--text-muted)] mb-4">Statutory and allowance master configuration. Synced to the backend settings store.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 space-y-3 h-fit">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Plus size={14} className="text-indigo-500" /> Add Master</h4>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. LWF)" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate (e.g. 2%)" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={add} disabled={!name.trim()} className="w-full py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
            <Plus size={15} /> Add
          </button>
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-alt)]">
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Rate</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {masters.map((m: any) => (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-[var(--text-muted)]">{m.rate}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(m.id)} className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase tracking-wider ${m.enabled ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-alt)]'}`}>
                        {m.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(m.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function PayrollHeadsSection() {
  const [heads, setHeads, saving] = useBackedConfig<any[]>('payroll-config-heads', 'payroll.heads', [
    { id: 'earn_basic', name: 'Basic Pay', type: 'Earning' },
    { id: 'earn_hra', name: 'HRA', type: 'Earning' },
    { id: 'earn_da', name: 'Dearness Allowance', type: 'Earning' },
    { id: 'earn_conveyance', name: 'Conveyance', type: 'Earning' },
    { id: 'ded_pf', name: 'Provident Fund', type: 'Deduction' },
    { id: 'ded_esi', name: 'ESI', type: 'Deduction' },
    { id: 'ded_tds', name: 'TDS', type: 'Deduction' },
    { id: 'ded_pt', name: 'Professional Tax', type: 'Deduction' },
  ]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'Earning' | 'Deduction'>('Earning');
  const [saved, setSaved] = useState(false);
  const persist = (next: any[]) => {
    setHeads(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const remove = (id: string) => persist(heads.filter((h: any) => h.id !== id));
  const add = () => {
    if (!name.trim()) return;
    persist([...heads, { id: `h_${Date.now()}`, name: name.trim(), type }]);
    setName('');
  };
  return (
    <SectionCard
      title="Salary Heads"
      icon={Tags}
      right={
        <button onClick={() => persist(heads)} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saved ? 'Saved' : 'Save'}
        </button>
      }
    >
      <p className="text-sm text-[var(--text-muted)] mb-4">Earning and deduction components that make up the salary structure. Synced to the backend settings store.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 space-y-3 h-fit">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Plus size={14} className="text-indigo-500" /> Add Head</h4>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Head name (e.g. LTA)" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          <div className="flex gap-2">
            <button onClick={() => setType('Earning')} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${type === 'Earning' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>Earning</button>
            <button onClick={() => setType('Deduction')} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${type === 'Deduction' ? 'bg-rose-500 text-white border-rose-500' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>Deduction</button>
          </div>
          <button onClick={add} disabled={!name.trim()} className="w-full py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
            <Plus size={15} /> Add Head
          </button>
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-alt)]">
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {heads.map((h: any) => (
                  <tr key={h.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{h.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase tracking-wider ${h.type === 'Earning' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-rose-500 border-rose-500/20 bg-rose-500/10'}`}>{h.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(h.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
