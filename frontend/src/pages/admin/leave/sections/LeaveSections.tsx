import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Scale, CalendarClock, FileStack, CalendarPlus, CalendarHeart, CalendarOff, Sparkles, Check, X, Plus, Trash2, Loader2, Save, Tag, Pencil } from 'lucide-react';
import { leaveApi, employeeServicesApi } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../../components/ui/AdminSection';
import { useToast } from '../../../../components/ui/ToastProvider';
import { useBackedConfig } from '../../../../hooks/useBackedConfig';
import { fmtDate, fmtDateShort, fmtDateCompact } from '../../../../utils/formatDate';

function useData<T>(key: string, fn: () => Promise<T>) {
  return useQuery({ queryKey: [key], queryFn: fn });
}

function useMutate<TArgs>(key: string, fn: (a: TArgs) => Promise<any>, msg: string, invalidate: string[]) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { success(msg); invalidate.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })); },
    onError: (e: any) => error(e.message || 'Operation failed'),
  });
}

const REQUEST_STATUSES = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export function LeaveRequestsSection() {
  const [status, setStatus] = useState('pending');
  const { data, isLoading } = useData('leave-all', () => leaveApi.listAll({ status: status === 'all' ? undefined : status }));
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const approve = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => { success('Leave approved'); queryClient.invalidateQueries({ queryKey: ['leave-all'] }); queryClient.invalidateQueries({ queryKey: ['leave-history'] }); queryClient.invalidateQueries({ queryKey: ['leave-balances'] }); queryClient.invalidateQueries({ queryKey: ['leave-balances-dash'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }); },
    onError: (e: any) => error(e.message || 'Failed to approve'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => leaveApi.reject(id),
    onSuccess: () => { success('Leave rejected'); queryClient.invalidateQueries({ queryKey: ['leave-all'] }); },
    onError: (e: any) => error(e.message || 'Failed to reject'),
  });
  const bulkApprove = useMutation({
    mutationFn: (ids: string[]) => leaveApi.bulkApprove(ids),
    onSuccess: () => {
      success('Leave requests approved');
      queryClient.invalidateQueries({ queryKey: ['leave-all'] });
      queryClient.invalidateQueries({ queryKey: ['leave-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['leave-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances-dash'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (e: any) => error(e.message || 'Failed to approve'),
  });
  const bulkReject = useMutation({
    mutationFn: (ids: string[]) => leaveApi.bulkReject(ids),
    onSuccess: () => {
      success('Leave requests rejected');
      queryClient.invalidateQueries({ queryKey: ['leave-all'] });
      queryClient.invalidateQueries({ queryKey: ['leave-analytics'] });
    },
    onError: (e: any) => error(e.message || 'Failed to reject'),
  });
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''}</span> },
    { key: 'type', header: 'Leave Type', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.leaveType?.name || r.leaveType || '—'}</span> },
    { key: 'period', header: 'Period', render: (r: any) => <span className="text-xs">{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</span> },
    { key: 'days', header: 'Days', render: (r: any) => <span className="font-semibold">{r.days ?? r.totalDays ?? 1}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => approve.mutate(r.id)} disabled={r.status !== 'pending' || approve.isPending} title="Approve" className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30"><Check size={15} /></button>
          <button onClick={() => reject.mutate(r.id)} disabled={r.status !== 'pending' || reject.isPending} title="Reject" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><X size={15} /></button>
        </div>
      ),
    },
  ];
  return (
    <AdminSection title="Leave Requests" icon={CalendarCheck2} subtitle="All leave applications across the company">
      <div className="flex flex-wrap gap-2 mb-4">
        {REQUEST_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors ${status === s ? 'bg-indigo-500 text-white border-indigo-500' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {s}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        keyField="id"
        emptyTitle="No leave requests"
        emptyMessage="No requests match the selected status."
        bulkActions={[
          { label: 'Approve', icon: Check, onClick: (selected) => bulkApprove.mutate(selected.map((r: any) => r.id)) },
          { label: 'Reject', icon: X, danger: true, onClick: (selected) => bulkReject.mutate(selected.map((r: any) => r.id)) },
        ]}
      />
    </AdminSection>
  );
}

export function LeaveBalancesSection() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocForm, setAllocForm] = useState({ employeeId: '', leaveTypeId: '', amount: 1, reason: '' });
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { data, isLoading } = useData('leave-balances', () => leaveApi.balancesOverview({ year }));
  const { data: types } = useData('leave-types', () => leaveApi.listTypes());
  const { data: employees } = useData('employees-list', async () => {
    const res = await fetch('/api/v1/employees?page=1&pageSize=200', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } });
    const json = await res.json();
    return json.data || [];
  });
  const allocMutation = useMutation({
    mutationFn: (d: typeof allocForm) => leaveApi.adjustBalance({ ...d, year, amount: Number(d.amount) }),
    onSuccess: () => { success('Balance allocated'); setShowAllocate(false); setAllocForm({ employeeId: '', leaveTypeId: '', amount: 1, reason: '' }); queryClient.invalidateQueries({ queryKey: ['leave-balances'] }); },
    onError: (e: any) => toastError(e.message || 'Failed'),
  });
  const rows = (data ?? []).flatMap((e: any) => {
    const balances = Array.isArray(e.balances) ? e.balances : e.leaveBalances && Array.isArray(e.leaveBalances) ? e.leaveBalances : [];
    const displayName = e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.employeeCode || e.employeeId;
    if (balances.length === 0) return [{ key: `${e.employeeId}-0`, employee: displayName, employeeCode: e.employeeCode, department: e.department, leaveType: '—', allotted: 0, used: 0, carriedOver: 0, remaining: 0 }];
    return balances.map((b: any) => ({
      key: `${e.employeeId}-${b.leaveType || 'unknown'}`,
      employee: displayName,
      employeeCode: e.employeeCode,
      department: e.department,
      leaveType: b.leaveType?.name || b.leaveType || '—',
      allotted: b.allotted ?? 0,
      used: b.used ?? 0,
      carriedOver: b.carriedOver ?? 0,
      remaining: b.remaining ?? Math.max(0, (b.allotted ?? 0) + (b.carriedOver ?? 0) - (b.used ?? 0)),
    }));
  });
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee}{r.employeeCode ? <span className="ml-1.5 text-[10px] text-[var(--text-muted)] font-normal">({r.employeeCode})</span> : null}</span> },
    { key: 'department', header: 'Dept', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.department || '—'}</span> },
    { key: 'leaveType', header: 'Leave Type', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.leaveType}</span> },
    { key: 'allotted', header: 'Allocated', render: (r: any) => <span className="font-semibold">{r.allotted}</span> },
    { key: 'carriedOver', header: 'Carry Fwd', render: (r: any) => <span className="font-semibold text-sky-500">{r.carriedOver || '—'}</span> },
    { key: 'used', header: 'Used', render: (r: any) => <span className="font-semibold text-amber-500">{r.used}</span> },
    { key: 'remaining', header: 'Balance', render: (r: any) => <span className="font-bold text-emerald-500">{r.remaining}</span> },
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  return (
    <AdminSection
      title="Leave Balances"
      icon={Scale}
      subtitle="Leave allocation and usage per employee"
      right={
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowAllocate(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600">
            <span>+</span> Allocate
          </button>
        </div>
      }
    >
      <DataTable columns={columns} data={rows} loading={isLoading} keyField="key" emptyTitle="No balance data" emptyMessage="No leave balances found." />
      {showAllocate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAllocate(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-[var(--text-primary)] mb-4">Allocate Leave Balance</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Employee</label>
                <select value={allocForm.employeeId} onChange={(e) => setAllocForm({ ...allocForm, employeeId: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm">
                  <option value="">Select employee</option>
                  {(employees ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Leave Type</label>
                <select value={allocForm.leaveTypeId} onChange={(e) => setAllocForm({ ...allocForm, leaveTypeId: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm">
                  <option value="">Select leave type</option>
                  {(types ?? []).filter((t: any) => t.isActive !== false).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Days to Allocate</label>
                <input type="number" min={0.5} step={0.5} value={allocForm.amount} onChange={(e) => setAllocForm({ ...allocForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">Reason</label>
                <input type="text" value={allocForm.reason} onChange={(e) => setAllocForm({ ...allocForm, reason: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm" placeholder="Optional reason" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowAllocate(false)} className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
              <button onClick={() => allocMutation.mutate(allocForm)} disabled={!allocForm.employeeId || !allocForm.leaveTypeId || allocMutation.isPending} className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 disabled:opacity-50">
                {allocMutation.isPending ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSection>
  );
}

export function CompOffSection() {
  const { data, isLoading } = useData('leave-compoff', () => employeeServicesApi.listCompOffAll());
  const approve = useMutate('compoff', (id: string) => employeeServicesApi.approveCompOff(id), 'Comp off approved', ['leave-compoff', 'comp-off-mine']);
  const reject = useMutate('compoff', (id: string) => employeeServicesApi.rejectCompOff(id), 'Comp off rejected', ['leave-compoff', 'comp-off-mine']);
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''}</span> },
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{fmtDate(r.date)}</span> },
    { key: 'reason', header: 'Reason', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.reason || '—'}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => approve.mutate(r.id)} disabled={r.status !== 'pending' || approve.isPending} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30"><Check size={15} /></button>
          <button onClick={() => reject.mutate(r.id)} disabled={r.status !== 'pending' || reject.isPending} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><X size={15} /></button>
        </div>
      ),
    },
  ];
  return (
    <AdminSection title="Comp Off" icon={CalendarClock} subtitle="Compensatory off requests">
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No comp off entries" emptyMessage="No comp off requests found." />
    </AdminSection>
  );
}

const POLICY_FIELDS = ['annualDays', 'maxConsecutiveDays', 'maxCarryForward', 'applicableAfter', 'requiresApproval', 'paid'] as const;

export function LeavePoliciesSection() {
  const { data, isLoading } = useData('leave-policies', () => leaveApi.getPolicies());
  const [form, setForm] = useState<Record<string, any>>({});
  const save = useMutate('policies', (d: any) => leaveApi.setPolicies(d), 'Leave policies saved', ['leave-policies']);
  const policies = Array.isArray(data) ? data : data?.policies ? (data as any).policies : [];
  const current = Object.keys(form).length ? form : Object.fromEntries((policies as any[]).map((p: any) => [p.id || p.leaveTypeId || p.name, { ...p }]));
  const setField = (id: string, field: string, value: any) => setForm({ ...current, [id]: { ...(current[id] || {}), [field]: value } });
  return (
    <AdminSection
      title="Leave Policies"
      icon={FileStack}
      subtitle="Leave codes and rules per leave type"
      right={
        <button onClick={() => save.mutate(Object.values(current))} disabled={save.isPending} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50">
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      }
    >
      {isLoading && policies.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : policies.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No leave policies defined yet. Define them below to store locally.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-alt)]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3 font-bold">Leave Type</th>
                {POLICY_FIELDS.map((f) => (
                  <th key={f} className="px-4 py-3 font-bold capitalize">{f.replace(/([A-Z])/g, ' $1')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(current).map(([id, p]: [string, any]) => (
                <tr key={id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{p.leaveType?.name || p.name || p.leaveTypeId || id}</td>
                  {POLICY_FIELDS.map((f) => (
                    <td key={f} className="px-4 py-3">
                      {typeof p[f] === 'boolean' ? (
                        <input type="checkbox" checked={!!p[f]} onChange={(e) => setField(id, f, e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                      ) : (
                        <input type="number" value={p[f] ?? 0} onChange={(e) => setField(id, f, Number(e.target.value))} className="w-20 px-2 py-1 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  );
}

export function HolidaysSection() {
  const { data, isLoading } = useData('leave-holidays', () => leaveApi.listHolidays());
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const create = useMutate('holidays', (d: { name: string; date: string }) => leaveApi.createHoliday(d), 'Holiday added', ['leave-holidays']);
  const remove = useMutate('holidays', (id: string) => leaveApi.deleteHoliday(id), 'Holiday removed', ['leave-holidays']);
  const columns: Column<any>[] = [
    { key: 'name', header: 'Holiday', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{fmtDateCompact(r.date)}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => remove.mutate(r.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
      ),
    },
  ];
  return (
    <AdminSection title="General Holidays" icon={CalendarPlus} subtitle="Company-wide holidays" right={
      <div className="flex items-end gap-2 flex-wrap">
        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-36" /></div>
        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" /></div>
        <button onClick={() => { if (name && date) create.mutate({ name, date }); }} disabled={!name || !date || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
    }>
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No holidays" emptyMessage="No general holidays defined." />
    </AdminSection>
  );
}

export function FlexibleHolidaysSection() {
  const { data, isLoading } = useData('leave-flexible', () => employeeServicesApi.listFlexibleHolidaysAll());
  const approve = useMutate('flexible', (id: string) => employeeServicesApi.approveFlexibleHoliday(id), 'Flexible holiday approved', ['leave-flexible', 'flexible-holiday-mine']);
  const reject = useMutate('flexible', (id: string) => employeeServicesApi.rejectFlexibleHoliday(id), 'Flexible holiday rejected', ['leave-flexible', 'flexible-holiday-mine']);
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''}</span> },
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{fmtDate(r.date)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => approve.mutate(r.id)} disabled={r.status !== 'pending' || approve.isPending} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30"><Check size={15} /></button>
          <button onClick={() => reject.mutate(r.id)} disabled={r.status !== 'pending' || reject.isPending} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><X size={15} /></button>
        </div>
      ),
    },
  ];
  return (
    <AdminSection title="Flexible Holidays" icon={CalendarHeart} subtitle="Employee flexible holiday requests">
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No flexible holidays" emptyMessage="No flexible holiday requests found." />
    </AdminSection>
  );
}

export function WeeklyOffSection() {
  const [days, setDays, saving] = useBackedConfig<any[]>('leave-config-weekly-off', 'leave.weeklyOff', [
    { day: 'Sunday', off: true }, { day: 'Monday', off: false }, { day: 'Tuesday', off: false },
    { day: 'Wednesday', off: false }, { day: 'Thursday', off: false }, { day: 'Friday', off: false },
    { day: 'Saturday', off: true },
  ]);
  const [saved, setSaved] = useState(false);
  const toggle = (i: number) => {
    const next = days.map((d: any, idx: number) => idx === i ? { ...d, off: !d.off } : d);
    setDays(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };
  return (
    <AdminSection title="Weekly Off" icon={CalendarOff} subtitle="Configure which weekdays are off" right={
      <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${saving ? 'text-amber-500 border-amber-500/20 bg-amber-500/10' : saved ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-[var(--text-muted)] border-[var(--border)]'}`}>{saving ? 'Saving…' : saved ? 'Saved' : 'Auto-save'}</span>
    }>
      <p className="text-sm text-[var(--text-muted)] mb-4">Synced to the backend settings store and used by attendance policy.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((d: any, i: number) => (
          <button key={d.day} onClick={() => toggle(i)} className={`p-4 rounded-2xl border transition-colors text-center ${d.off ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[var(--surface-alt)] border-[var(--border)]'}`}>
            <p className={`text-sm font-bold ${d.off ? 'text-indigo-500' : 'text-[var(--text-muted)]'}`}>{d.day}</p>
            <p className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${d.off ? 'text-indigo-500' : 'text-[var(--text-muted)]'}`}>{d.off ? 'Off' : 'Working'}</p>
          </button>
        ))}
      </div>
    </AdminSection>
  );
}

export function SpecialHolidaySection() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { data: holidays, isLoading } = useQuery({ queryKey: ['leave-holidays'], queryFn: leaveApi.listHolidays });
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const add = useMutation({
    mutationFn: () => leaveApi.createHoliday({ name: name.trim(), date }),
    onSuccess: () => {
      success('Special holiday added');
      setName(''); setDate('');
      queryClient.invalidateQueries({ queryKey: ['leave-holidays'] });
    },
    onError: (e: any) => error(e.message || 'Failed to add holiday'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => leaveApi.deleteHoliday(id),
    onSuccess: () => {
      success('Special holiday removed');
      queryClient.invalidateQueries({ queryKey: ['leave-holidays'] });
    },
    onError: (e: any) => error(e.message || 'Failed to remove holiday'),
  });

  const columns: Column<any>[] = [
    { key: 'name', header: 'Holiday', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{fmtDate(r.date)}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => remove.mutate(r.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
      ),
    },
  ];
  return (
    <AdminSection
      title="Special Holiday"
      icon={Sparkles}
      subtitle="Optional / special holidays"
    >
      <div className="flex items-end gap-2 flex-wrap mb-4">
        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Foundation Day" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-44" /></div>
        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" /></div>
        <button onClick={() => add.mutate()} disabled={!name || !date || add.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
          {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
      <DataTable columns={columns} data={holidays ?? []} loading={isLoading} keyField="id" emptyTitle="No special holidays" emptyMessage="Add special holidays to get started." />
    </AdminSection>
  );
}

export function LeaveTypesSection() {
  const { data, isLoading } = useData('leave-types', () => leaveApi.listTypes());
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const defaultForm = {
    code: '', name: '', paid: true, annualAllocation: 0, accrualRate: 0,
    carryForward: false, carryForwardLimit: 0, maxConsecutiveDays: 0,
    halfDayAllowed: false, negativeBalanceAllowed: false, encashment: false,
    attachmentRequired: false, approvalRequired: true, isActive: true,
  };
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    queryClient.invalidateQueries({ queryKey: ['leave-all'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
  };

  const create = useMutation({
    mutationFn: () => leaveApi.createType(form),
    onSuccess: () => { success('Leave type created'); setForm(defaultForm); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to create leave type'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => leaveApi.updateType(id, data),
    onSuccess: () => { success('Leave type updated'); setEditingId(null); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to update leave type'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => leaveApi.deleteType(id),
    onSuccess: () => { success('Leave type deleted'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to delete leave type'),
  });

  const setField = (obj: typeof form | Record<string, any>, setFn: (v: any) => void, field: string, value: any) => {
    setFn({ ...obj, [field]: value });
  };

  const Checkbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-indigo-500 w-4 h-4" />
      <span className="text-xs font-bold text-[var(--text-muted)]">{label}</span>
    </label>
  );

  const columns: Column<any>[] = [
    { key: 'code', header: 'Code', render: (r: any) => <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">{r.code || '—'}</span> },
    { key: 'name', header: 'Name', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'paid', header: 'Paid', render: (r: any) => <StatusBadge status={r.paid ? 'paid' : 'unpaid'} /> },
    { key: 'annualAllocation', header: 'Annual Alloc', render: (r: any) => <span className="text-xs font-semibold">{r.annualAllocation ?? 0}</span> },
    { key: 'accrualRate', header: 'Accrual / Month', render: (r: any) => <span className="text-xs font-semibold">{r.accrualRate ?? 0}</span> },
    { key: 'carryForward', header: 'Carry Forward', render: (r: any) => r.carryForward ? <StatusBadge status="active" /> : <span className="text-xs text-[var(--text-muted)]">No</span> },
    { key: 'isActive', header: 'Active', render: (r: any) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={() => { setEditingId(r.id); setEditForm({ ...r }); }}
            disabled={update.isPending}
            title="Edit leave type"
            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-30"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => { if (confirm(`Delete leave type "${r.name}"? This removes its balances and requests.`)) remove.mutate(r.id); }}
            disabled={remove.isPending}
            title="Delete leave type"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const rows = (data ?? []).flatMap((r: any) => {
    const row = { ...r, _editing: false };
    return [row];
  });

  const expandedRows = rows.flatMap((r: any) => {
    const items: any[] = [{ ...r, _rowKey: r.id }];
    if (editingId === r.id) {
      items.push({ _isEditRow: true, _rowKey: `${r.id}-edit` });
    }
    return items;
  });

  const buildFormFields = (formObj: Record<string, any>, setFormFn: (v: any) => void) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Code</label>
        <input value={formObj.code || ''} onChange={(e) => setFormFn({ ...formObj, code: e.target.value })} placeholder="e.g. PL" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Name</label>
        <input value={formObj.name || ''} onChange={(e) => setFormFn({ ...formObj, name: e.target.value })} placeholder="e.g. Privilege Leave" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Annual Allocation (days)</label>
        <input type="number" value={formObj.annualAllocation ?? 0} onChange={(e) => setFormFn({ ...formObj, annualAllocation: Number(e.target.value) })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Accrual Rate (/month)</label>
        <input type="number" value={formObj.accrualRate ?? 0} onChange={(e) => setFormFn({ ...formObj, accrualRate: Number(e.target.value) })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Carry Forward Limit</label>
        <input type="number" value={formObj.carryForwardLimit ?? 0} onChange={(e) => setFormFn({ ...formObj, carryForwardLimit: Number(e.target.value) })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Max Consecutive Days</label>
        <input type="number" value={formObj.maxConsecutiveDays ?? 0} onChange={(e) => setFormFn({ ...formObj, maxConsecutiveDays: Number(e.target.value) })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2">
        <Checkbox label="Paid" checked={!!formObj.paid} onChange={() => setFormFn({ ...formObj, paid: !formObj.paid })} />
        <Checkbox label="Carry Forward" checked={!!formObj.carryForward} onChange={() => setFormFn({ ...formObj, carryForward: !formObj.carryForward })} />
        <Checkbox label="Half Day Allowed" checked={!!formObj.halfDayAllowed} onChange={() => setFormFn({ ...formObj, halfDayAllowed: !formObj.halfDayAllowed })} />
        <Checkbox label="Negative Balance" checked={!!formObj.negativeBalanceAllowed} onChange={() => setFormFn({ ...formObj, negativeBalanceAllowed: !formObj.negativeBalanceAllowed })} />
        <Checkbox label="Encashment" checked={!!formObj.encashment} onChange={() => setFormFn({ ...formObj, encashment: !formObj.encashment })} />
        <Checkbox label="Attachment Required" checked={!!formObj.attachmentRequired} onChange={() => setFormFn({ ...formObj, attachmentRequired: !formObj.attachmentRequired })} />
        <Checkbox label="Approval Required" checked={!!formObj.approvalRequired} onChange={() => setFormFn({ ...formObj, approvalRequired: !formObj.approvalRequired })} />
        <Checkbox label="Active" checked={!!formObj.isActive} onChange={() => setFormFn({ ...formObj, isActive: !formObj.isActive })} />
      </div>
    </div>
  );

  return (
    <AdminSection
      title="Leave Types"
      icon={Tag}
      subtitle="Leave categories available to employees"
    >
      <div className="mb-4">
        {buildFormFields(form, setForm)}
        <div className="flex justify-end mt-3">
          <button onClick={() => create.mutate()} disabled={!form.code.trim() || !form.name.trim() || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Leave Type
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[var(--text-muted)]" size={20} /></div>
      ) : expandedRows.length === 0 ? (
        <div className="text-center py-8 text-sm text-[var(--text-muted)]">No leave types defined.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-alt)]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-bold">{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expandedRows.map((r: any) => {
                if (r._isEditRow) {
                  return (
                    <tr key={r._rowKey} className="border-t border-[var(--border)]">
                      <td colSpan={columns.length} className="p-0">
                        {buildFormFields(editForm, setEditForm)}
                        <div className="flex justify-end gap-2 px-4 pb-3">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            Cancel
                          </button>
                          <button
                            onClick={() => update.mutate({ id: editForm.id, code: editForm.code, name: editForm.name, paid: editForm.paid, annualAllocation: editForm.annualAllocation, accrualRate: editForm.accrualRate, carryForward: editForm.carryForward, carryForwardLimit: editForm.carryForwardLimit, maxConsecutiveDays: editForm.maxConsecutiveDays, halfDayAllowed: editForm.halfDayAllowed, negativeBalanceAllowed: editForm.negativeBalanceAllowed, encashment: editForm.encashment, attachmentRequired: editForm.attachmentRequired, approvalRequired: editForm.approvalRequired, isActive: editForm.isActive })}
                            disabled={!editForm.code?.trim() || !editForm.name?.trim() || update.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                          >
                            {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={r._rowKey} className="border-t border-[var(--border)] hover:bg-[var(--surface-alt)]/50 transition-colors">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3">{c.render(r)}</td>
                    ))}
                   </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminSection>
  );
}

export function LeaveTransactionsSection() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const { data: employees } = useData('employees-list', async () => {
    const res = await fetch('/api/v1/employees?page=1&pageSize=200', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } });
    const json = await res.json();
    return json.data || [];
  });
  const { data: txns, isLoading } = useData(
    ['leave-txn', selectedEmployee, year],
    () => selectedEmployee ? leaveApi.transactions(selectedEmployee, year) : Promise.resolve([])
  );
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const txnTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ALLOCATION: 'bg-emerald-500/15 text-emerald-500',
      LEAVE_TAKEN: 'bg-rose-500/15 text-rose-500',
      CARRY_FORWARD: 'bg-sky-500/15 text-sky-500',
      ADJUSTMENT_CREDIT: 'bg-emerald-500/15 text-emerald-500',
      ADJUSTMENT_DEBIT: 'bg-rose-500/15 text-rose-500',
      ENCASHMENT: 'bg-amber-500/15 text-amber-500',
      CANCELLATION_CREDIT: 'bg-sky-500/15 text-sky-500',
      EXPIRY: 'bg-gray-500/15 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors[type] || 'bg-gray-500/15 text-gray-500'}`}>{type}</span>;
  };
  const columns: Column<any>[] = [
    { key: 'createdAt', header: 'Date', render: (r: any) => <span className="text-xs font-mono">{fmtDateShort(r.createdAt)}</span> },
    { key: 'type', header: 'Type', render: (r: any) => txnTypeBadge(r.type) },
    { key: 'leaveType', header: 'Leave Type', render: (r: any) => <span className="text-xs">{r.leaveType?.name || r.leaveTypeId || '—'}</span> },
    { key: 'amount', header: 'Amount', render: (r: any) => <span className={`font-bold ${r.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{r.amount > 0 ? '+' : ''}{r.amount}</span> },
    { key: 'reason', header: 'Reason', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.reason || '—'}</span> },
  ];
  return (
    <AdminSection title="Transaction History" icon={FileStack} subtitle="View leave allocation and deduction history">
      <div className="flex items-center gap-2 mb-4">
        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold">
          <option value="">Select employee</option>
          {(employees ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {selectedEmployee ? (
        <DataTable columns={columns} data={(txns ?? []).map((t: any) => ({ ...t, key: t.id }))} loading={isLoading} keyField="key" emptyTitle="No transactions" emptyMessage="No transactions found for this employee." />
      ) : (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">Select an employee to view transactions</div>
      )}
    </AdminSection>
  );
}

export function LeaveYearsSection() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { data: leaveYears, isLoading } = useData('leave-years', () => leaveApi.listLeaveYears());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const create = useMutation({
    mutationFn: (d: typeof form) => leaveApi.createLeaveYear(d),
    onSuccess: () => { success('Leave year created'); setShowForm(false); setForm({ name: '', startDate: '', endDate: '' }); queryClient.invalidateQueries({ queryKey: ['leave-years'] }); },
    onError: (e: any) => toastError(e.message || 'Failed'),
  });
  const toggleActive = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) => leaveApi.updateLeaveYear(d.id, { isActive: d.isActive }),
    onSuccess: () => { success('Leave year updated'); queryClient.invalidateQueries({ queryKey: ['leave-years'] }); },
    onError: (e: any) => toastError(e.message || 'Failed'),
  });
  const del = useMutation({
    mutationFn: (id: string) => leaveApi.deleteLeaveYear(id),
    onSuccess: () => { success('Leave year deleted'); queryClient.invalidateQueries({ queryKey: ['leave-years'] }); },
    onError: (e: any) => toastError(e.message || 'Failed'),
  });
  const carryForward = useMutation({
    mutationFn: (fromYearId: string) => leaveApi.processCarryForward(fromYearId),
    onSuccess: () => { success('Carry forward processed'); queryClient.invalidateQueries({ queryKey: ['leave-years'] }); },
    onError: (e: any) => toastError(e.message || 'Failed'),
  });
  const columns: Column<any>[] = [
    { key: 'name', header: 'Year', render: (r: any) => <span className="font-bold">{r.name}</span> },
    { key: 'startDate', header: 'Start', render: (r: any) => <span className="text-xs font-mono">{fmtDate(r.startDate)}</span> },
    { key: 'endDate', header: 'End', render: (r: any) => <span className="text-xs font-mono">{fmtDate(r.endDate)}</span> },
    { key: 'isActive', header: 'Status', render: (r: any) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    { key: 'carryForwardProcessed', header: 'Carry Fwd', render: (r: any) => r.carryForwardProcessed ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-[var(--text-muted)]" /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => toggleActive.mutate({ id: r.id, isActive: !r.isActive })} className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[var(--border)] hover:bg-[var(--surface-alt)]">
            {r.isActive ? 'Deactivate' : 'Activate'}
          </button>
          {!r.carryForwardProcessed && (
            <button onClick={() => carryForward.mutate(r.id)} disabled={carryForward.isPending} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50">
              Carry Forward
            </button>
          )}
          <button onClick={() => { if (confirm('Delete this leave year?')) del.mutate(r.id); }} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];
  return (
    <AdminSection title="Leave Years" icon={CalendarDays} subtitle="Manage leave year periods and carry-forward"
      right={<button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600"><Plus size={14} /> New Leave Year</button>}>
      {showForm && (
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm" placeholder="e.g. 2026" />
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm" />
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm" />
          <button onClick={() => create.mutate(form)} disabled={!form.name || !form.startDate || !form.endDate || create.isPending} className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}
      <DataTable columns={columns} data={(leaveYears ?? []).map((y: any) => ({ ...y, key: y.id }))} loading={isLoading} keyField="key" emptyTitle="No leave years" emptyMessage="No leave years configured." />
    </AdminSection>
  );
}
