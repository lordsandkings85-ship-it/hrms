import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock3, Loader2, Check, CalendarDays } from 'lucide-react';
import { employeesApi, shiftsApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';

const formatTime12 = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
};

function currentAssignment(row: any) {
  const list = row?.shiftAssignment ?? [];
  return list.find((sa: any) => !sa.effectiveTo || new Date(sa.effectiveTo) > new Date()) || list[0];
}

export default function ShiftAssignPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [empId, setEmpId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({}),
  });

  const { data: shifts } = useQuery({ queryKey: ['admin-shifts'], queryFn: shiftsApi.list });

  const assign = useMutation({
    mutationFn: () => shiftsApi.assign({ shiftId, employeeId: empId, effectiveFrom }),
    onSuccess: () => {
      success('Shift assigned');
      setEmpId('');
      setShiftId('');
      setEffectiveFrom('');
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
    },
    onError: (e: any) => error(e.message || 'Failed to assign shift'),
  });

  const empList = (Array.isArray(employees) ? employees : (employees as any)?.items ?? []).filter((e: any) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || `${e.employeeCode || e.employeeId || ''}`.toLowerCase().includes(q);
  });

  const canAssign = empId && shiftId && effectiveFrom;

  const columns: Column<any>[] = [
    { key: 'name', header: 'Employee Name', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.firstName} {row.lastName}</span> },
    { key: 'empId', header: 'Employee ID', render: (row: any) => <span className="font-mono text-xs uppercase text-[var(--text-muted)] tracking-wider">{row.employeeCode || row.employeeId || 'N/A'}</span> },
    { key: 'dept', header: 'Department', render: (row: any) => <span className="text-[var(--text-primary)] text-xs font-semibold">{row.department?.name || '—'}</span> },
    { key: 'designation', header: 'Designation', render: (row: any) => <span className="text-[var(--text-muted)] text-xs">{row.designation?.name || '—'}</span> },
    {
      key: 'currentShift',
      header: 'Current Shift',
      render: (row: any) => {
        const ca = currentAssignment(row);
        return ca?.shift ? (
          <span className="text-xs font-bold text-indigo-500">{ca.shift.name} <span className="text-[var(--text-muted)] font-mono">({formatTime12(ca.shift.startTime)} - {formatTime12(ca.shift.endTime)})</span></span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Not assigned</span>
        );
      },
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (row: any) => {
        const ca = currentAssignment(row);
        return ca?.effectiveFrom ? (
          <span className="text-xs text-[var(--text-muted)]">{new Date(ca.effectiveFrom).toLocaleDateString('en-IN')}</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <Clock3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Shift Assign</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Assign and manage employee shifts and timings.</p>
          </div>
        </div>
      </div>

      {/* Assign Form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Assign Shift to Employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Employee</label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select employee…</option>
              {empList.map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode || e.employeeId || '—'})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Shift</label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select shift…</option>
              {(shifts ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({formatTime12(s.startTime)} - {formatTime12(s.endTime)})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Effective From</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => assign.mutate()}
            disabled={!canAssign || assign.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50 h-[38px]"
          >
            {assign.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {assign.isPending ? 'Assigning…' : 'Assign Shift'}
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-500" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Employee Shift Assignments</h3>
          </div>
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-3 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors w-64"
          />
        </div>
        <DataTable columns={columns} data={empList} loading={isLoading} keyField="id" emptyTitle="No employees" emptyMessage="No employees found for this company." />
      </div>
    </div>
  );
}
