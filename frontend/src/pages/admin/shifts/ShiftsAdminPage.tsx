import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Loader2, Check, Users, X, Trash2, Zap } from 'lucide-react';
import { shiftsApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../components/ui/AdminSection';
import { useToast } from '../../../components/ui/ToastProvider';
import { useEmployeeList } from '../payroll/sections/shared';
import { fmtDate, fmt24To12 } from '../../../utils/formatDate';
import ShiftTypesSection from './sections/ShiftTypesSection';

type TabKey = 'types' | 'shifts';

const formatTime12 = fmt24To12;

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'types', label: 'Shift Types', icon: Zap },
  { key: 'shifts', label: 'Shifts', icon: Clock },
];

export default function ShiftsAdminPage() {
  const [tab, setTab] = useState<TabKey>('types');
  const { data: shifts, isLoading } = useQuery({ queryKey: ['admin-shifts'], queryFn: shiftsApi.list });
  const { data: shiftTypes } = useQuery({ queryKey: ['admin-shift-types'], queryFn: () => import('../../../api/client').then(m => m.shiftTypesApi.list()) });
  const { data: assignments, isLoading: loadingAssignments } = useQuery({ queryKey: ['admin-shift-assignments'], queryFn: shiftsApi.listAssignments });
  const { data: requests } = useQuery({ queryKey: ['admin-shift-requests'], queryFn: shiftsApi.listChangeRequests });
  const employees = useEmployeeList();
  const [name, setName] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState('');
  const [assignShift, setAssignShift] = useState<Record<string, string>>({});
  const [assignEmp, setAssignEmp] = useState('');
  const [effFrom, setEffFrom] = useState('');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-shifts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-shift-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-shift-requests'] });
    queryClient.invalidateQueries({ queryKey: ['admin-shift-types'] });
    queryClient.invalidateQueries({ queryKey: ['shifts-list'] });
    queryClient.invalidateQueries({ queryKey: ['employees-list'] });
  };

  const selectedType = (shiftTypes ?? []).find((t: any) => t.id === selectedShiftTypeId);

  const handleTypeSelect = (typeId: string) => {
    setSelectedShiftTypeId(typeId);
    const t = (shiftTypes ?? []).find((ty: any) => ty.id === typeId);
    if (t) {
      setStart(t.defaultStartTime);
      setEnd(t.defaultEndTime);
    }
  };

  const create = useMutation({
    mutationFn: () => shiftsApi.create({
      name, startTime: start, endTime: end, type: selectedType?.isFlexible ? 'flexible' : 'fixed',
      ...(selectedShiftTypeId && { shiftTypeId: selectedShiftTypeId }),
    }),
    onSuccess: () => { success('Shift created'); setName(''); setSelectedShiftTypeId(''); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to create shift'),
  });
  const assign = useMutation({
    mutationFn: () => shiftsApi.assign({ shiftId: assignShift[assignEmp] || Object.values(assignShift)[0] || '', employeeId: assignEmp, effectiveFrom: effFrom }),
    onSuccess: () => { success('Shift assigned'); setAssignEmp(''); setAssignShift({}); setEffFrom(''); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to assign shift'),
  });
  const decideApprove = useMutation({
    mutationFn: (id: string) => shiftsApi.approveChangeRequest(id),
    onSuccess: () => { success('Request approved'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to approve request'),
  });
  const decideReject = useMutation({
    mutationFn: (id: string) => shiftsApi.rejectChangeRequest(id),
    onSuccess: () => { success('Request rejected'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to reject request'),
  });
  const removeShift = useMutation({
    mutationFn: (id: string) => shiftsApi.remove(id),
    onSuccess: () => { success('Shift deleted'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to delete shift'),
  });
  const removeAssignment = useMutation({
    mutationFn: (id: string) => shiftsApi.removeAssignment(id),
    onSuccess: () => { success('Assignment removed'); invalidate(); },
    onError: (e: any) => error(e.message || 'Failed to remove assignment'),
  });

  const shiftColumns: Column<any>[] = [
    { key: 'name', header: 'Shift', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'start', header: 'Start', render: (r: any) => <span className="font-mono text-xs">{formatTime12(r.startTime)}</span> },
    { key: 'end', header: 'End', render: (r: any) => <span className="font-mono text-xs">{formatTime12(r.endTime)}</span> },
    { key: 'type', header: 'Type', render: (r: any) => r.shiftType
      ? <span className="text-xs font-bold text-indigo-500">{r.shiftType.name}</span>
      : <span className="text-[var(--text-muted)] text-xs capitalize">{r.type}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={() => { if (confirm(`Delete shift "${r.name}"? This removes its assignments and change requests.`)) removeShift.mutate(r.id); }}
            disabled={removeShift.isPending}
            title="Delete shift"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];
  const assignmentColumns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''} <span className="text-[var(--text-muted)] font-mono text-xs uppercase">({r.employee?.employeeCode || '—'})</span></span> },
    { key: 'dept', header: 'Department', render: (r: any) => <span className="text-xs">{r.employee?.department?.name || '—'}</span> },
    { key: 'shift', header: 'Shift', render: (r: any) => <span className="text-xs font-bold text-indigo-500">{r.shift?.name || '—'} {r.shift?.startTime ? <span className="text-[var(--text-muted)] font-mono">({formatTime12(r.shift.startTime)} - {formatTime12(r.shift.endTime)})</span> : null}</span> },
    { key: 'effectiveFrom', header: 'Effective From', render: (r: any) => <span className="text-xs">{fmtDate(r.effectiveFrom)}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={() => { if (confirm(`Remove this assignment for ${r.employee?.firstName || ''} ${r.employee?.lastName || ''}?`)) removeAssignment.mutate(r.id); }}
            disabled={removeAssignment.isPending}
            title="Remove assignment"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];
  const requestColumns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName || ''}</span> },
    { key: 'shift', header: 'Requested Shift', render: (r: any) => <span className="text-xs">{r.requestedShift?.name || r.requestedShiftId || '—'}</span> },
    { key: 'from', header: 'Effective From', render: (r: any) => <span className="text-xs">{fmtDate(r.effectiveFrom)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => decideApprove.mutate(r.id)} disabled={r.status !== 'pending'} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30"><Check size={15} /></button>
          <button onClick={() => decideReject.mutate(r.id)} disabled={r.status !== 'pending'} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><X size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Shifts</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Define shift types, configure shifts, and assign employees.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-[var(--surface-alt)] rounded-xl border border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'types' && <ShiftTypesSection />}

      {tab === 'shifts' && (
        <>
          <AdminSection
            title="Define Shift"
            icon={Clock}
            subtitle="Shift templates"
            right={
              <div className="flex items-end gap-2 flex-wrap">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Shift Type</label>
                  <select value={selectedShiftTypeId} onChange={(e) => handleTypeSelect(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Manual</option>
                    {(shiftTypes ?? []).filter((t: any) => t.isActive).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shift name" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-36" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Start</label>
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">End</label>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono" />
                </div>
                <button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                  {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
                </button>
              </div>
            }
          >
            <DataTable columns={shiftColumns} data={shifts ?? []} loading={isLoading} keyField="id" showToolbar={false} selectable={false} emptyTitle="No shifts" emptyMessage="Define a shift to get started." />
          </AdminSection>
          <AdminSection
            title="Assign Shift"
            icon={Users}
            subtitle="Assign an employee to a shift"
            right={
              <div className="flex items-end gap-2 flex-wrap">
                <select value={assignEmp} onChange={(e) => setAssignEmp(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Select employee…</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
                <select value={assignShift[assignEmp] || ''} onChange={(e) => setAssignShift({ ...assignShift, [assignEmp]: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Select shift…</option>
                  {(shifts ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="date" value={effFrom} onChange={(e) => setEffFrom(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                <button onClick={() => assign.mutate()} disabled={!assignEmp || !(assignShift[assignEmp]) || assign.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
                  {assign.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Assign
                </button>
              </div>
            }
          >
            <p className="text-sm text-[var(--text-muted)] mb-4">Select an employee, target shift and effective date, then click Assign.</p>
            <div className="pt-4 border-t border-[var(--border)]">
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Current Assignments</h4>
              <p className="text-xs text-[var(--text-muted)] mb-4">Employees and the shifts assigned to them.</p>
              <DataTable columns={assignmentColumns} data={assignments ?? []} loading={loadingAssignments} keyField="id" showToolbar={false} selectable={false} emptyTitle="No assignments" emptyMessage="Assign a shift to an employee to see it here." />
            </div>
          </AdminSection>
          <AdminSection title="Shift Change Requests" icon={X} subtitle="Pending shift change approvals">
            <DataTable columns={requestColumns} data={requests ?? []} loading={isLoading} keyField="id" showToolbar={false} selectable={false} emptyTitle="No change requests" emptyMessage="No shift change requests pending." />
          </AdminSection>
        </>
      )}
    </div>
  );
}
