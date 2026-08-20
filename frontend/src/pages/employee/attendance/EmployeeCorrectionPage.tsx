import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../../store/useAuthStore';
import { attendanceApi } from '../../../api/client';
import { getServerDate } from '../../../utils/serverTime';
import { useToast } from '../../../components/ui/ToastProvider';
import { FileEdit, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  correctedCheckIn: z.string().optional(),
  correctedCheckOut: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EmployeeCorrectionPage() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const myEmpId = user?.employee?.id || '';
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const logs = await attendanceApi.list(myEmpId, data.date, data.date);
      const log = Array.isArray(logs) ? logs.find((l: any) => new Date(l.date).toISOString().slice(0, 10) === data.date) : undefined;
      if (!log) {
        toastError('No attendance record found for the selected date.');
        return;
      }
      await attendanceApi.regularize(log.id, {
        employeeId: myEmpId,
        requestedCheckIn: data.correctedCheckIn ? `${data.date}T${data.correctedCheckIn}:00` : log.checkIn,
        requestedCheckOut: data.correctedCheckOut ? `${data.date}T${data.correctedCheckOut}:00` : log.checkOut,
        reason: data.reason,
      });
      toastSuccess('Attendance correction request submitted for approval.');
      reset();
      setSubmitted(true);
    } catch (err: any) {
      toastError(err.message || 'Failed to submit correction request');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <FileEdit size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Attendance Correction Request</h1>
          <p className="text-sm text-slate-500">Submit a request to regularize your missed or incorrect punches.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Request Submitted Successfully!</h2>
            <p className="text-slate-500 max-w-md">Your correction request has been sent to your reporting manager for approval. You will be notified once it is processed.</p>
            <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Date to Regularize <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="date" 
                    {...register('date')}
                    max={getServerDate()}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
                  />
                </div>
                {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Corrected Check In (Optional)</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="time" 
                    {...register('correctedCheckIn')}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Corrected Check Out (Optional)</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="time" 
                    {...register('correctedCheckOut')}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Reason for Correction <span className="text-red-500">*</span></label>
              <textarea 
                {...register('reason')}
                rows={4}
                placeholder="E.g., Forgot to punch in due to system error, was traveling for client meeting..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors resize-none"
              />
              {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
