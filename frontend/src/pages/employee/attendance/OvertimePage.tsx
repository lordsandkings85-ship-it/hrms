import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Save, Send, Check, X, Search } from 'lucide-react';
import { employeeServicesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';
import { fmtDateShort } from '../../../utils/formatDate';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

function useIsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.name?.toLowerCase() || '';
  return !!user?.isSuperAdmin || !!user?.role?.isSystem || ['admin','hr','human resource','manager'].some(r => role.includes(r));
}

const overtimeSchema = z.object({
  date: z.string().min(1, 'Date required'),
  hours: z.number().min(0.5, 'Minimum 0.5 hours').max(12, 'Maximum 12 hours'),
  reason: z.string().min(5, 'Reason required'),
});
type OvertimeData = z.infer<typeof overtimeSchema>;

function AdminOvertime() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['employee-overtime-all'],
    queryFn: () => employeeServicesApi.listOvertimeAll(),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.approveOvertime(id),
    onSuccess: () => { toastSuccess('Overtime approved'); queryClient.invalidateQueries({ queryKey: ['employee-overtime-all'] }); },
    onError: (err: any) => toastError(err.message),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => employeeServicesApi.rejectOvertime(id),
    onSuccess: () => { toastSuccess('Overtime rejected'); queryClient.invalidateQueries({ queryKey: ['employee-overtime-all'] }); },
    onError: (err: any) => toastError(err.message),
  });

  const filtered = (Array.isArray(logs) ? logs : []).filter((l: any) => {
    const name = ((l.employee?.firstName || '') + ' ' + (l.employee?.lastName || '')).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (row: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20 font-bold text-xs flex items-center justify-center shrink-0">
          {row.employee?.firstName?.[0] || 'E'}{row.employee?.lastName?.[0] || ''}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)] truncate">{row.employee?.firstName} {row.employee?.lastName}</div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{row.employee?.employeeCode}</div>
        </div>
      </div>
    )},
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{fmtDateShort(row.date)}</span> },
    { key: 'hours', header: 'Hours', render: (row: any) => <span className="text-sm font-bold text-sky-500">{row.hours} hrs</span> },
    { key: 'reason', header: 'Reason', render: (row: any) => <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate block">{row.reason}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        row.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
        row.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
        'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{row.status}</span>
    )},
    { key: 'actions', header: 'Actions', render: (row: any) => row.status === 'pending' ? (
      <div className="flex gap-1.5">
        <button onClick={() => approveMutation.mutate(row.id)} className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-lg transition-all"><Check size={14} /></button>
        <button onClick={() => rejectMutation.mutate(row.id)} className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all"><X size={14} /></button>
      </div>
    ) : <span className="text-xs text-[var(--text-muted)]">--</span> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shadow-inner">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Overtime Management</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and approve overtime requests from all employees.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">All Overtime Requests</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-sky-500/50 transition-colors w-64" />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={isLoading} keyField="id" />
      </div>
    </div>
  );
}

function EmployeeOvertime() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const [showModal, setShowModal] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['employee-overtime-logs', myEmpId],
    queryFn: () => employeeServicesApi.listOvertime(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OvertimeData>({
    resolver: zodResolver(overtimeSchema),
    defaultValues: { date: '', hours: 0, reason: '' }
  });

  const applyMutation = useMutation({
    mutationFn: (data: OvertimeData) => employeeServicesApi.createOvertime({ employeeId: myEmpId, ...data }),
    onSuccess: () => { toastSuccess('Overtime logged and sent for approval!'); setShowModal(false); reset(); queryClient.invalidateQueries({ queryKey: ['employee-overtime-logs', myEmpId] }); },
    onError: (err: any) => toastError(err.message || 'Failed to log overtime'),
  });

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{fmtDateShort(row.date)}</span> },
    { key: 'hours', header: 'Hours', render: (row: any) => <span className="text-sm font-bold text-sky-500">{row.hours} hrs</span> },
    { key: 'reason', header: 'Reason', render: (row: any) => <span className="text-xs text-[var(--text-muted)]">{row.reason}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        row.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
        row.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
        'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{row.status}</span>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shadow-inner">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Overtime Logger</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Log your extra hours and track overtime payouts.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="relative z-10 px-6 py-2.5 bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-colors flex items-center gap-2">
          <Send size={18} /> Log Overtime
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Recent Overtime Logs</h3>
        <DataTable columns={columns} data={logs || []} loading={isLoading} keyField="id" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[var(--border)] bg-sky-500/5 rounded-t-2xl">
              <h3 className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2"><Clock className="text-sky-500" size={20} /> Log Overtime Hours</h3>
            </div>
            <form onSubmit={handleSubmit((d) => applyMutation.mutate(d))} className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Date <span className="text-rose-500">*</span></label>
                 <input type="date" {...register('date')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500 font-mono" />
                 {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Hours Worked <span className="text-rose-500">*</span></label>
                 <input type="number" step="0.5" {...register('hours', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                 {errors.hours && <p className="text-xs text-rose-500">{errors.hours.message}</p>}
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Reason <span className="text-rose-500">*</span></label>
                 <textarea {...register('reason')} rows={3} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500 resize-none" placeholder="Reason for working overtime..." />
                 {errors.reason && <p className="text-xs text-rose-500">{errors.reason.message}</p>}
               </div>
               <div className="flex gap-4 pt-4 border-t border-[var(--border)] mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-[var(--surface-alt)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">Cancel</button>
                  <button type="submit" disabled={applyMutation.isPending} className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-sky-500/20">
                    {applyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Log Hours
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OvertimePage() {
  return useIsAdmin() ? <AdminOvertime /> : <EmployeeOvertime />;
}
