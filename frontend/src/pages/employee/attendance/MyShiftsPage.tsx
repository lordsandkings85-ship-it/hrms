import { useQuery, useMutation } from '@tanstack/react-query';
import { shiftsApi, employeesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { getServerNow, getServerDate } from '../../../utils/serverTime';
import { Clock3, CalendarDays, Sun, Repeat } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useToast } from '../../../components/ui/ToastProvider';
import { fmtDateShort } from '../../../utils/formatDate';

const formatTime12 = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const changeRequestSchema = z.object({
  requestedShiftId: z.string().min(1, 'Please select a new shift'),
  effectiveFrom: z.string().min(1, 'Please select a date'),
  reason: z.string().min(5, 'Reason is required'),
});
type ChangeFormData = z.infer<typeof changeRequestSchema>;

export default function MyShiftsPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const { error: toastError } = useToast();
  const [submitted, setSubmitted] = useState(false);

  // Fetch employee record to extract active shift
  const { data: emp, isLoading: isLoadingEmp } = useQuery({
    queryKey: ['my-profile', myEmpId],
    queryFn: () => employeesApi.get(myEmpId),
    enabled: !!myEmpId
  });

  // Fetch all shifts for the dropdown
  const { data: shiftsList } = useQuery({
    queryKey: ['shifts-list'],
    queryFn: () => shiftsApi.list(),
  });

  // Fetch holidays
  const { data: holidays, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['holidays-list'],
    queryFn: () => shiftsApi.listHolidays(),
  });

  const activeAssignment = (emp as any)?.shiftAssignment?.find((sa: any) => !sa.effectiveTo || new Date(sa.effectiveTo) > getServerNow());
  const activeShift = activeAssignment?.shift;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangeFormData>({
    resolver: zodResolver(changeRequestSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ChangeFormData) => shiftsApi.requestChange({
      employeeId: myEmpId,
      shiftId: activeShift?.id || '',
      ...data
    }),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toastError(err.message || 'Failed to request shift change')
  });

  return (
    <div className="page-container max-w-7xl space-y-6">
      <PageHeader
        title="My Work Schedule & Shifts"
        subtitle="Review your roster plan, working hours, and request shift changes."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Shift & Holidays */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Shift Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Clock3 className="text-indigo-500" size={16} /> Active Roster Plan
            </h3>

            {isLoadingEmp ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : activeShift ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl space-y-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Shift Name</p>
                  <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{activeShift.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Timings</p>
                    <p className="text-sm font-bold text-indigo-500 font-mono mt-0.5">
                      {formatTime12(activeShift.startTime)} - {formatTime12(activeShift.endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Schedule Type</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize mt-0.5">{activeShift.type}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No active work shift assigned.</p>
            )}
          </div>

          {/* Holidays Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Sun className="text-amber-500" size={16} /> Upcoming Holidays
            </h3>

            {isLoadingHolidays ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : !holidays || holidays.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No company holidays defined yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-60 overflow-y-auto pr-1">
                {holidays.map((h: any) => (
                  <div key={h.id} className="py-2.5 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{h.name}</span>
                    <span className="font-mono font-semibold text-slate-400">{fmtDateShort(h.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Shift Change Request */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-xs h-full">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 uppercase tracking-wider">
              <Repeat className="text-indigo-500" size={16} /> Request Shift Change
            </h3>
            
            {submitted ? (
               <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
                 <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                   <Clock3 size={32} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Request Submitted Successfully!</h2>
                 <p className="text-slate-500 max-w-md">Your shift change request has been sent to your reporting manager for approval.</p>
                 <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                   Submit Another Request
                 </button>
               </div>
            ) : (
              <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6 max-w-md">
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Current Shift</label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {activeShift ? `${activeShift.name} (${formatTime12(activeShift.startTime)} - ${formatTime12(activeShift.endTime)})` : 'None Assigned'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Requested Shift <span className="text-rose-500">*</span></label>
                  <select 
                    {...register('requestedShiftId')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Select a new shift</option>
                    {shiftsList?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatTime12(s.startTime)} - {formatTime12(s.endTime)})
                      </option>
                    ))}
                  </select>
                  {errors.requestedShiftId && <p className="text-xs text-rose-500">{errors.requestedShiftId.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Effective From <span className="text-rose-500">*</span></label>
                  <input 
                    type="date"
                    {...register('effectiveFrom')}
                    min={getServerDate()}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {errors.effectiveFrom && <p className="text-xs text-rose-500">{errors.effectiveFrom.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Reason for Change <span className="text-rose-500">*</span></label>
                  <textarea 
                    {...register('reason')}
                    rows={4}
                    placeholder="Provide justification for the shift change..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                  {errors.reason && <p className="text-xs text-rose-500">{errors.reason.message}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={mutation.isPending || !activeShift}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {mutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
