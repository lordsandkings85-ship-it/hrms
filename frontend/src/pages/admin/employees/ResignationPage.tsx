import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserMinus, X, Loader2 } from 'lucide-react';
import { exitApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastProvider';

const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('en-IN') : '—');
const initials = (e: any) => `${e?.firstName?.[0] || ''}${e?.lastName?.[0] || ''}`.toUpperCase() || '?';

export default function ResignationPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fallbackRow, setFallbackRow] = useState<any>(null);
  const [note, setNote] = useState('');

  const { data: exits = [], isLoading } = useQuery({
    queryKey: ['exit-list'],
    queryFn: () => exitApi.list(),
  });

  const selectedRow = (exits ?? []).find((e: any) => e.id === selectedId) || fallbackRow;

  const advance = useMutation({
    mutationFn: (vars: { id: string; status: string }) => exitApi.advance(vars.id, vars.status),
    onSuccess: () => {
      toastSuccess('Status updated');
      queryClient.invalidateQueries({ queryKey: ['exit-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update status'),
  });

  const checklist = useMutation({
    mutationFn: (vars: { id: string; complete: boolean }) =>
      vars.complete ? exitApi.completeChecklist(vars.id) : exitApi.uncompleteChecklist(vars.id),
    onSuccess: () => {
      toastSuccess('Checklist updated');
      queryClient.invalidateQueries({ queryKey: ['exit-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update checklist'),
  });

  const interview = useMutation({
    mutationFn: (vars: { id: string; note: string }) => exitApi.saveInterview(vars.id, vars.note),
    onSuccess: () => {
      toastSuccess('Interview note saved');
      queryClient.invalidateQueries({ queryKey: ['exit-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to save interview note'),
  });

  const openManage = (row: any) => {
    setSelectedId(row.id);
    setFallbackRow(row);
    setNote('');
  };

  const closeModal = () => {
    setSelectedId(null);
    setFallbackRow(null);
    setNote('');
  };

  const advanceBtn =
    'px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2';

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials(row.employee)}
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">{row.employee?.firstName} {row.employee?.lastName}</div>
            <div className="text-xs text-[var(--text-muted)] font-medium">{row.employee?.employeeCode || '—'} · {row.employee?.department?.name || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'resignationDate',
      header: 'Resignation Date',
      render: (row: any) => <span className="text-sm text-[var(--text-primary)]">{fmtDate(row.resignationDate)}</span>,
    },
    {
      key: 'lastWorkingDay',
      header: 'Last Working Day',
      render: (row: any) => <span className="text-sm text-[var(--text-primary)]">{fmtDate(row.lastWorkingDay)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => openManage(row)}
          className="px-3 py-1.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider"
        >
          Manage
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <UserMinus size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Resignations &amp; Exit</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage resignations, exit checklists and separation workflows.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Resignations &amp; Exit</h3>
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

          <DataTable columns={columns} data={exits ?? []} loading={isLoading} keyField="id" emptyTitle="No resignations" emptyMessage="No exit processes have been initiated yet." />
        </div>
      </div>

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl w-[min(92vw,720px)] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {selectedRow.employee?.firstName} {selectedRow.employee?.lastName}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {selectedRow.employee?.employeeCode || '—'} · {selectedRow.employee?.department?.name || '—'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  Resignation: {fmtDate(selectedRow.resignationDate)} · Last Working Day: {fmtDate(selectedRow.lastWorkingDay)}
                </p>
                {selectedRow.reason && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 italic">{selectedRow.reason}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRow.status === 'initiated' && (
                  <button
                    onClick={() => advance.mutate({ id: selectedRow.id, status: 'in_progress' })}
                    disabled={advance.isPending}
                    className={advanceBtn}
                  >
                    {advance.isPending && <Loader2 size={14} className="animate-spin" />}
                    Mark in progress
                  </button>
                )}
                {selectedRow.status !== 'fnf' && selectedRow.status !== 'completed' && (
                  <button
                    onClick={() => advance.mutate({ id: selectedRow.id, status: 'fnf' })}
                    disabled={advance.isPending}
                    className={advanceBtn}
                  >
                    {advance.isPending && <Loader2 size={14} className="animate-spin" />}
                    Move to FnF
                  </button>
                )}
                {selectedRow.status === 'fnf' && (
                  <button
                    onClick={() => advance.mutate({ id: selectedRow.id, status: 'completed' })}
                    disabled={advance.isPending}
                    className={advanceBtn}
                  >
                    {advance.isPending && <Loader2 size={14} className="animate-spin" />}
                    Complete
                  </button>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Checklist</h4>
              <div className="space-y-2">
                {selectedRow.checklists?.length ? (
                  selectedRow.checklists.map((item: any) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.completedAt != null}
                        onChange={() => checklist.mutate({ id: item.id, complete: item.completedAt == null })}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      <span className={`text-sm font-medium ${item.completedAt != null ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                        {item.task}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No checklist items.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Exit Interview</h4>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Interview notes…"
                className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                onClick={() => interview.mutate({ id: selectedRow.id, note })}
                disabled={interview.isPending || !note.trim()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
              >
                {interview.isPending && <Loader2 size={14} className="animate-spin" />}
                Save interview note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
