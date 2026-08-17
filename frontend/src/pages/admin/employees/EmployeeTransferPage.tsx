import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Check, Loader2 } from 'lucide-react';
import { employeesApi, organizationApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';

export default function EmployeeTransferPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [employeeId, setEmployeeId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 100 }),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['org-branches'],
    queryFn: () => organizationApi.listBranches(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['org-departments'],
    queryFn: () => organizationApi.listDepartments(),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['org-designations'],
    queryFn: () => organizationApi.listDesignations(),
  });

  const empList: any[] = employees?.items ?? [];

  const selectedEmployee = empList.find((e: any) => e.id === employeeId) || null;

  const currentBranch = selectedEmployee?.branch?.name || '—';
  const currentDepartment = selectedEmployee?.department?.name || '—';
  const currentDesignation = selectedEmployee?.designation?.title || '—';

  const transfer = useMutation({
    mutationFn: () => {
      const payload: any = {};
      if (branchId) payload.branchId = branchId;
      if (departmentId) payload.departmentId = departmentId;
      if (designationId) payload.designationId = designationId;
      return employeesApi.update(employeeId, payload);
    },
    onSuccess: () => {
      toastSuccess('Transfer saved');
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to save transfer'),
  });

  const canSubmit = !!employeeId && !!transferDate;

  const onEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEmployeeId(e.target.value);
    setBranchId('');
    setDepartmentId('');
    setDesignationId('');
    setTransferDate('');
    setReason('');
  };

  const selectClass =
    'w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <ArrowRightLeft size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employee Transfer</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Move employees across branches, departments and designations.</p>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-stretch md:items-end gap-1.5 md:w-80">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Employee</label>
          <select value={employeeId} onChange={onEmployeeChange} className={selectClass}>
            <option value="">Select employee…</option>
            {empList.map((e: any) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode || e.employeeId || '—'})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Transfer Details</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
          Current: {currentBranch} · {currentDepartment} · {currentDesignation}
        </p>

        {selectedEmployee ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Branch</label>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectClass}>
                  <option value="">No change</option>
                  {(branches ?? []).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selectClass}>
                  <option value="">No change</option>
                  {(departments ?? []).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Designation</label>
                <select value={designationId} onChange={(e) => setDesignationId(e.target.value)} className={selectClass}>
                  <option value="">No change</option>
                  {(designations ?? []).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Transfer Date</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className={selectClass}
                />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Reason</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for transfer…"
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => transfer.mutate()}
                disabled={!canSubmit || transfer.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {transfer.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {transfer.isPending ? 'Saving…' : 'Save Transfer'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)] mt-6">Select an employee to begin.</p>
        )}
      </div>
    </div>
  );
}
