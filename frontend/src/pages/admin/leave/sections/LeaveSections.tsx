import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Scale, CalendarClock, FileStack, CalendarPlus, CalendarHeart, CalendarOff, Sparkles, Check, X, Plus, Trash2, Loader2, Save, Tag } from 'lucide-react';
import { leaveApi, employeeServicesApi } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../../components/ui/AdminSection';
import { useToast } from '../../../../components/ui/ToastProvider';
import { useBackedConfig } from '../../../../hooks/useBackedConfig';

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
    { key: 'period', header: 'Period', render: (r: any) => <span className="text-xs">{new Date(r.startDate).toLocaleDateString('en-IN')} → {new Date(r.endDate).toLocaleDateString('en-IN')}</span> },
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
  const { data, isLoading } = useData('leave-balances', () => leaveApi.balancesOverview({}));
  const rows = (data ?? []).flatMap((e: any) => {
    const balances = Array.isArray(e.balances) ? e.balances : e.leaveBalances && Array.isArray(e.leaveBalances) ? e.leaveBalances : [];
    if (balances.length === 0) return [{ key: `${e.employeeId}-0`, employee: `${e.employee?.firstName || ''} ${e.employee?.lastName || ''}`.trim() || e.employeeId, leaveType: '—', allocated: e.allocated ?? 0, used: e.used ?? 0, balance: e.remaining ?? ((e.allotted ?? 0) - (e.used ?? 0)) }];
    return balances.map((b: any) => ({
      key: `${e.employeeId}-${b.leaveTypeId || b.id}`,
      employee: `${e.employee?.firstName || ''} ${e.employee?.lastName || ''}`.trim() || e.employeeId,
      leaveType: b.leaveType?.name || b.leaveType || '—',
      allocated: b.allocated ?? b.annual ?? 0,
      used: b.used ?? 0,
      balance: b.remaining ?? ((b.allotted ?? 0) - (b.used ?? 0)),
    }));
  });
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee}</span> },
    { key: 'leaveType', header: 'Leave Type', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.leaveType}</span> },
    { key: 'allocated', header: 'Allocated', render: (r: any) => <span className="font-semibold">{r.allocated}</span> },
    { key: 'used', header: 'Used', render: (r: any) => <span className="font-semibold text-amber-500">{r.used}</span> },
    { key: 'balance', header: 'Balance', render: (r: any) => <span className="font-bold text-emerald-500">{r.balance}</span> },
  ];
  return (
    <AdminSection title="Leave Balances" icon={Scale} subtitle="Leave allocation and usage per employee">
      <DataTable columns={columns} data={rows} loading={isLoading} keyField="key" emptyTitle="No balance data" emptyMessage="No leave balances found." />
    </AdminSection>
  );
}

export function CompOffSection() {
  const { data, isLoading } = useData('leave-compoff', () => employeeServicesApi.listCompOffAll());
  const approve = useMutate('compoff', (id: string) => employeeServicesApi.approveCompOff(id), 'Comp off approved', ['leave-compoff', 'comp-off-mine']);
  const reject = useMutate('compoff', (id: string) => employeeServicesApi.rejectCompOff(id), 'Comp off rejected', ['leave-compoff', 'comp-off-mine']);
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''}</span> },
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{new Date(r.date).toLocaleDateString('en-IN')}</span> },
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
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span> },
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
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{new Date(r.date).toLocaleDateString('en-IN')}</span> },
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
    { key: 'date', header: 'Date', render: (r: any) => <span className="text-xs">{new Date(r.date).toLocaleDateString('en-IN')}</span> },
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
  const [name, setName] = useState('');
  const [paid, setPaid] = useState(true);
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    queryClient.invalidateQueries({ queryKey: ['leave-all'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
  };
  const create = useMutation({
    mutationFn: () => leaveApi.createType({ name, paid }),
    onSuccess: () => { success('Leave type created'); setName(''); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to create leave type'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => leaveApi.deleteType(id),
    onSuccess: () => { success('Leave type deleted'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to delete leave type'),
  });
  const columns: Column<any>[] = [
    { key: 'name', header: 'Leave Type', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'paid', header: 'Paid', render: (r: any) => <StatusBadge status={r.paid ? 'paid' : 'unpaid'} /> },
    { key: 'accrualRate', header: 'Accrual / Month', render: (r: any) => <span className="text-xs font-semibold">{r.accrualRate ?? 0}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
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
  return (
    <AdminSection
      title="Leave Types"
      icon={Tag}
      subtitle="Leave categories available to employees"
    >
      <div className="flex items-end gap-2 flex-wrap mb-4">
        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Privilege Leave" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-44" /></div>
        <div className="flex items-center gap-1.5 pb-2"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="accent-indigo-500 w-4 h-4" /><span className="text-xs font-bold text-[var(--text-muted)]">Paid</span></div>
        <button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No leave types" emptyMessage="Add a leave type to get started." />
    </AdminSection>
  );
}
