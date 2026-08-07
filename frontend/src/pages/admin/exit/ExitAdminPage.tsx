import { useEffect, useState } from 'react';
import { DoorOpen, ChevronRight } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../components/ui/AdminSection';
import { exitApi } from '../../../api/client';

const STATUS_FLOW = ['initiated', 'clearance', 'fnf', 'completed'];

export default function ExitAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await exitApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load separations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const advance = async (r: any) => {
    const idx = STATUS_FLOW.indexOf(r.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    setError('');
    try {
      await exitApi.advance(r.id, STATUS_FLOW[idx + 1]);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to advance status');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r: any) => (
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {r.employee ? `${r.employee.firstName ?? ''} ${r.employee.lastName ?? ''}`.trim() || '—' : '—'}
        </span>
      ),
    },
    {
      key: 'resignationDate', header: 'Resignation', render: (r: any) => (
        <span className="text-sm text-[var(--text-muted)]">{r.resignationDate ? new Date(r.resignationDate).toLocaleDateString() : '—'}</span>
      ),
    },
    {
      key: 'lastWorkingDay', header: 'Last Working Day', render: (r: any) => (
        <span className="text-sm text-[var(--text-muted)]">{r.lastWorkingDay ? new Date(r.lastWorkingDay).toLocaleDateString() : '—'}</span>
      ),
    },
    { key: 'reason', header: 'Reason', render: (r: any) => <span className="text-sm text-[var(--text-muted)]">{r.reason || '—'}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions', render: (r: any) => {
        const idx = STATUS_FLOW.indexOf(r.status);
        const canAdvance = idx >= 0 && idx < STATUS_FLOW.length - 1;
        return canAdvance ? (
          <button onClick={() => advance(r)} title={`Advance to ${STATUS_FLOW[idx + 1]}`} className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors uppercase tracking-wider">
            Advance <ChevronRight size={14} />
          </button>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Exit & Separation</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Track separation requests, clearances and exit interviews.</p>
      </div>
      <AdminSection title="Separation Requests" icon={DoorOpen} subtitle="Employee exit requests and clearance status">
        {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
        <DataTable columns={columns} data={rows} loading={loading} keyField="id" emptyTitle="No separations" emptyMessage="No exit requests yet." />
      </AdminSection>
    </div>
  );
}
