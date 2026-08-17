import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Loader2, X, Check } from 'lucide-react';
import { employeesApi, fnfApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastProvider';

const inr = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('en-IN') : '—');
const initials = (e: any) => `${e?.firstName?.[0] || ''}${e?.lastName?.[0] || ''}`.toUpperCase() || '?';

export default function FinalSettlementPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [employeeId, setEmployeeId] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('90');
  const [overridesFor, setOverridesFor] = useState<any>(null);
  const [noticeRecovery, setNoticeRecovery] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [unpaidSalaryAmt, setUnpaidSalaryAmt] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 100 }),
  });

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['fnf-list'],
    queryFn: () => fnfApi.list(),
  });

  const empList: any[] = employees?.items ?? [];

  const initiate = useMutation({
    mutationFn: () =>
      fnfApi.initiate({
        employeeId,
        lastWorkingDay,
        noticePeriodDays: Number(noticePeriodDays) || 90,
      }),
    onSuccess: () => {
      toastSuccess('Settlement initiated');
      setEmployeeId('');
      setLastWorkingDay('');
      setNoticePeriodDays('90');
      queryClient.invalidateQueries({ queryKey: ['fnf-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to initiate settlement'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => fnfApi.approve(id),
    onSuccess: () => {
      toastSuccess('Settlement approved');
      queryClient.invalidateQueries({ queryKey: ['fnf-list'] });
      queryClient.invalidateQueries({ queryKey: ['fnf-employee'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to approve settlement'),
  });

  const saveOverrides = useMutation({
    mutationFn: (vars: { id: string; data: any }) => fnfApi.updateOverrides(vars.id, vars.data),
    onSuccess: () => {
      toastSuccess('Overrides saved');
      setOverridesFor(null);
      setNoticeRecovery('');
      setOtherDeductions('');
      setUnpaidSalaryAmt('');
      queryClient.invalidateQueries({ queryKey: ['fnf-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to save overrides'),
  });

  const openOverrides = (row: any) => {
    setOverridesFor(row);
    setNoticeRecovery(row.noticeRecovery != null ? String(row.noticeRecovery) : '');
    setOtherDeductions(row.otherDeductions != null ? String(row.otherDeductions) : '');
    setUnpaidSalaryAmt(row.unpaidSalaryAmt != null ? String(row.unpaidSalaryAmt) : '');
  };

  const submitOverrides = () => {
    const data: Record<string, number> = {};
    if (noticeRecovery !== '') data.noticeRecovery = Number(noticeRecovery);
    if (otherDeductions !== '') data.otherDeductions = Number(otherDeductions);
    if (unpaidSalaryAmt !== '') data.unpaidSalaryAmt = Number(unpaidSalaryAmt);
    saveOverrides.mutate({ id: overridesFor.id, data });
  };

  const canInitiate = !!employeeId && !!lastWorkingDay;

  const selectClass =
    'w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500';

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
      key: 'lastWorkingDay',
      header: 'Last Working Day',
      render: (row: any) => <span className="text-sm text-[var(--text-primary)]">{fmtDate(row.lastWorkingDay)}</span>,
    },
    {
      key: 'gratuityAmount',
      header: 'Gratuity',
      render: (row: any) => <span className="text-sm text-[var(--text-primary)]">{inr(row.gratuityAmount)}</span>,
    },
    {
      key: 'leaveEncashAmount',
      header: 'Leave Encashment',
      render: (row: any) => <span className="text-sm text-[var(--text-primary)]">{inr(row.leaveEncashAmount)}</span>,
    },
    {
      key: 'unpaidSalaryAmt',
      header: 'Unpaid Salary',
      render: (row: any) => <span className="text-sm text-[var(--text-primary)]">{inr(row.unpaidSalaryAmt)}</span>,
    },
    {
      key: 'noticeRecovery',
      header: 'Notice Recovery',
      render: (row: any) => <span className="text-sm text-red-500">{inr(row.noticeRecovery)}</span>,
    },
    {
      key: 'netSettlement',
      header: 'Net Settlement',
      render: (row: any) => <span className="text-sm font-bold text-[var(--text-primary)]">{inr(row.netSettlement)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) =>
        row.status === 'draft' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => approve.mutate(row.id)}
              disabled={approve.isPending}
              className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => openOverrides(row)}
              className="px-3 py-1.5 text-[var(--text-muted)] border border-[var(--border)] rounded-xl hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-xs font-bold uppercase tracking-wider"
            >
              Overrides
            </button>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <HandCoins size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Final Settlement</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Process Full and Final (FnF) settlements.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Initiate Settlement</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={selectClass}>
              <option value="">Select employee…</option>
              {empList.map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode || e.employeeId || '—'})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Last Working Day</label>
            <input
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Notice Period Days</label>
            <input
              type="number"
              min={0}
              value={noticePeriodDays}
              onChange={(e) => setNoticePeriodDays(e.target.value)}
              className={selectClass}
            />
          </div>
          <button
            onClick={() => initiate.mutate()}
            disabled={!canInitiate || initiate.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50 h-[38px]"
          >
            {initiate.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {initiate.isPending ? 'Initiating…' : 'Initiate Settlement'}
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Settlements</h3>
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

          <DataTable columns={columns} data={settlements ?? []} loading={isLoading} keyField="id" emptyTitle="No settlements" emptyMessage="No final settlements have been initiated yet." />
        </div>
      </div>

      {overridesFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOverridesFor(null)}
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl w-[min(90vw,560px)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Settlement Overrides</h3>
                <p className="text-sm text-[var(--text-muted)]">{overridesFor.employee?.firstName} {overridesFor.employee?.lastName}</p>
              </div>
              <button
                onClick={() => setOverridesFor(null)}
                aria-label="Close"
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Notice Recovery (₹)</label>
                <input
                  type="number"
                  value={noticeRecovery}
                  onChange={(e) => setNoticeRecovery(e.target.value)}
                  className={selectClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Other Deductions (₹)</label>
                <input
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(e.target.value)}
                  className={selectClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Unpaid Salary Amount (₹)</label>
                <input
                  type="number"
                  value={unpaidSalaryAmt}
                  onChange={(e) => setUnpaidSalaryAmt(e.target.value)}
                  className={selectClass}
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4 mt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setOverridesFor(null)}
                className="flex-1 py-2.5 bg-[var(--surface-alt)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitOverrides}
                disabled={saveOverrides.isPending}
                className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saveOverrides.isPending && <Loader2 size={16} className="animate-spin" />}
                Save Overrides
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
