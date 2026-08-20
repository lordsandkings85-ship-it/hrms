import { useState } from 'react';
import { Fingerprint, CheckSquare, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../components/ui/ToastProvider';
import { attendanceApi, employeesApi } from '../../../api/client';
import { getServerDate } from '../../../utils/serverTime';
import { useAuthStore } from '../../../store/useAuthStore';

function useIsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.name?.toLowerCase() || '';
  return !!user?.isSuperAdmin || !!user?.role?.isSystem || ['admin','hr','human resource','manager'].some(r => role.includes(r));
}

const punchSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.enum(['IN', 'OUT']),
  reason: z.string().min(5, 'Reason is required'),
});

type PunchData = z.infer<typeof punchSchema>;

function AdminManualPunch() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 200 }),
  });
  const employees = employeesData?.items || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PunchData>({
    resolver: zodResolver(punchSchema),
    defaultValues: { date: getServerDate(), type: 'IN', time: '', reason: '' }
  });

  const onSubmit = async (data: PunchData) => {
    if (!selectedEmpId) { toastError('Please select an employee'); return; }
    setIsSubmitting(true);
    try {
      await attendanceApi.manualPunch({ employeeId: selectedEmpId, ...data });
      toastSuccess(`Manual ${data.type} punch submitted for approval!`);
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      reset({ date: getServerDate(), type: 'IN', time: '', reason: '' });
      setSelectedEmpId('');
    } catch (err: any) {
      toastError(err.message || 'Failed to submit manual punch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-fuchsia-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Fingerprint size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Update Attendance</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Mark manual punches for employees who missed their swipe.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Employee <span className="text-rose-500">*</span></label>
            <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500">
              <option value="">Select employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Punch Date <span className="text-rose-500">*</span></label>
              <input type="date" {...register('date')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 font-mono" />
              {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Punch Time <span className="text-rose-500">*</span></label>
              <input type="time" {...register('time')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 font-mono" />
              {errors.time && <p className="text-xs text-rose-500">{errors.time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Punch Type <span className="text-rose-500">*</span></label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input type="radio" value="IN" {...register('type')} className="peer hidden" />
                <div className="w-full p-4 border border-[var(--border)] rounded-xl text-center font-bold text-[var(--text-muted)] peer-checked:bg-fuchsia-500/10 peer-checked:text-fuchsia-500 peer-checked:border-fuchsia-500 cursor-pointer transition-colors">Punch IN</div>
              </label>
              <label className="flex-1">
                <input type="radio" value="OUT" {...register('type')} className="peer hidden" />
                <div className="w-full p-4 border border-[var(--border)] rounded-xl text-center font-bold text-[var(--text-muted)] peer-checked:bg-fuchsia-500/10 peer-checked:text-fuchsia-500 peer-checked:border-fuchsia-500 cursor-pointer transition-colors">Punch OUT</div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Reason for Manual Punch <span className="text-rose-500">*</span></label>
            <textarea {...register('reason')} rows={3} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 resize-none" placeholder="e.g. ID card forgotten, working from client site..." />
            {errors.reason && <p className="text-xs text-rose-500">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <button type="submit" disabled={isSubmitting || !selectedEmpId} className="py-3 px-8 bg-fuchsia-500 text-white rounded-xl text-sm font-bold hover:bg-fuchsia-600 transition-all shadow-md shadow-fuchsia-500/20 flex justify-center items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />} Submit Manual Punch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeManualPunch() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const myEmpId = user?.employee?.id || '';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PunchData>({
    resolver: zodResolver(punchSchema),
    defaultValues: { date: getServerDate(), type: 'IN', time: '', reason: '' }
  });

  const onSubmit = async (data: PunchData) => {
    setIsSubmitting(true);
    try {
      await attendanceApi.manualPunch({ employeeId: myEmpId, ...data });
      toastSuccess(`Manual ${data.type} punch submitted for approval!`);
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      reset({ date: getServerDate(), type: 'IN', time: '', reason: '' });
    } catch (err: any) {
      toastError(err.message || 'Failed to submit manual punch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-fuchsia-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Fingerprint size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Manual Punch</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Missed a swipe or working off-site? Log your punch manually.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Punch Date <span className="text-rose-500">*</span></label>
                <input type="date" {...register('date')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 font-mono" />
                {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Punch Time <span className="text-rose-500">*</span></label>
                <input type="time" {...register('time')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 font-mono" />
                {errors.time && <p className="text-xs text-rose-500">{errors.time.message}</p>}
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Punch Type <span className="text-rose-500">*</span></label>
              <div className="flex gap-4">
                <label className="flex-1">
                  <input type="radio" value="IN" {...register('type')} className="peer hidden" />
                  <div className="w-full p-4 border border-[var(--border)] rounded-xl text-center font-bold text-[var(--text-muted)] peer-checked:bg-fuchsia-500/10 peer-checked:text-fuchsia-500 peer-checked:border-fuchsia-500 cursor-pointer transition-colors">Punch IN</div>
                </label>
                <label className="flex-1">
                  <input type="radio" value="OUT" {...register('type')} className="peer hidden" />
                  <div className="w-full p-4 border border-[var(--border)] rounded-xl text-center font-bold text-[var(--text-muted)] peer-checked:bg-fuchsia-500/10 peer-checked:text-fuchsia-500 peer-checked:border-fuchsia-500 cursor-pointer transition-colors">Punch OUT</div>
                </label>
              </div>
           </div>

           <div className="space-y-2">
             <label className="text-xs font-bold text-[var(--text-primary)]">Reason for Manual Punch <span className="text-rose-500">*</span></label>
             <textarea {...register('reason')} rows={3} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 resize-none" placeholder="e.g. ID card forgotten, working from client site..." />
             {errors.reason && <p className="text-xs text-rose-500">{errors.reason.message}</p>}
           </div>

           <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <button type="submit" disabled={isSubmitting} className="py-3 px-8 bg-fuchsia-500 text-white rounded-xl text-sm font-bold hover:bg-fuchsia-600 transition-all shadow-md shadow-fuchsia-500/20 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />} Submit Manual Punch
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}

export default function ManualPunchPage() {
  return useIsAdmin() ? <AdminManualPunch /> : <EmployeeManualPunch />;
}
