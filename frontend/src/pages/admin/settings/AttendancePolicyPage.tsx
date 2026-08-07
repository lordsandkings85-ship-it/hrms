import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { AdminSection } from '../../../components/ui/AdminSection';
import { attendancePolicyApi } from '../../../api/client';

const DEFAULTS = [
  { key: 'workdays', name: 'Weekly Working Days', value: '6' },
  { key: 'dailyhours', name: 'Daily Work Hours', value: '9' },
  { key: 'grace', name: 'Grace Period (minutes)', value: '15' },
  { key: 'halfday', name: 'Half Day Threshold (hours)', value: '4.5' },
  { key: 'late', name: 'Late Mark After (minutes)', value: '15' },
  { key: 'geo', name: 'Geo-fencing Required', value: 'No' },
  { key: 'overtime', name: 'Overtime Enabled', value: 'Yes' },
  { key: 'weekend', name: 'Weekend Attendance Counting', value: 'Yes' },
];

export default function AttendancePolicyPage() {
  const [rows, setRows] = useState<any[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    attendancePolicyApi.list()
      .then((data: any[]) => {
        if (cancelled) return;
        const stored = Array.isArray(data) ? data : [];
        const map = new Map(stored.map((r: any) => [r.key, r.value]));
        setRows(DEFAULTS.map((d) => ({ ...d, value: map.get(d.key) ?? d.value })));
      })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load policy'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = async (key: string, value: string) => {
    const next = rows.map((r) => r.key === key ? { ...r, value } : r);
    setRows(next);
    setError('');
    try {
      await attendancePolicyApi.upsert(key, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Attendance Policy</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Configure working hours, grace period and attendance rules.</p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${saved ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-[var(--text-muted)] border-[var(--border)]'}`}>{saved ? 'Saved' : 'Auto-save'}</span>
      </div>
      <AdminSection title="Policy Rules" icon={Timer} subtitle="Stored in the attendance policy endpoint">
        {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-alt)]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3 font-bold">Rule</th>
                <th className="px-4 py-3 font-bold">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.key} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{r.name}</td>
                  <td className="px-4 py-3">
                    <input value={r.value} disabled={loading} onChange={(e) => update(r.key, e.target.value)} className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-48 focus:outline-none focus:border-indigo-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
