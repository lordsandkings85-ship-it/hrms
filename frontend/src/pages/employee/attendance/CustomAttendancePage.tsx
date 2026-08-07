import { useState, useEffect } from 'react';
import { Sliders, CalendarClock, Settings2, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { attendancePolicyApi } from '../../../api/client';

const policySchema = z.object({
  flexiTime: z.boolean(),
  coreHoursStart: z.string(),
  coreHoursEnd: z.string(),
  gracePeriodMins: z.number().min(0).max(60),
});

type PolicyData = z.infer<typeof policySchema>;

const DEFAULTS: PolicyData = { flexiTime: true, coreHoursStart: '10:00', coreHoursEnd: '16:00', gracePeriodMins: 15 };

export default function CustomAttendancePage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset } = useForm<PolicyData>({
    resolver: zodResolver(policySchema),
    defaultValues: DEFAULTS
  });

  useEffect(() => {
    let cancelled = false;
    attendancePolicyApi.list()
      .then((data: any[]) => {
        if (cancelled) return;
        const stored = Array.isArray(data) ? data : [];
        const map = new Map(stored.map((r: any) => [r.key, r.value]));
        reset({
          flexiTime: map.get('custom.flexiTime') === 'true',
          coreHoursStart: map.get('custom.coreHoursStart') ?? DEFAULTS.coreHoursStart,
          coreHoursEnd: map.get('custom.coreHoursEnd') ?? DEFAULTS.coreHoursEnd,
          gracePeriodMins: Number(map.get('custom.gracePeriodMins') ?? DEFAULTS.gracePeriodMins),
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reset]);

  const onSubmit = async (data: PolicyData) => {
    setSaving(true);
    try {
      await Promise.all([
        attendancePolicyApi.upsert('custom.flexiTime', String(data.flexiTime)),
        attendancePolicyApi.upsert('custom.coreHoursStart', data.coreHoursStart),
        attendancePolicyApi.upsert('custom.coreHoursEnd', data.coreHoursEnd),
        attendancePolicyApi.upsert('custom.gracePeriodMins', String(data.gracePeriodMins)),
      ]);
      toastSuccess('Custom attendance policy updated for your team.');
    } catch (e: any) {
      toastError(e?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-inner">
             <Sliders size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Custom Attendance Rules</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Configure flexible working hours and grace periods.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Settings2 className="text-purple-500" size={20} /> Team Policy Settings
            </h3>
            
            <div className="space-y-4">
               <label className="flex items-center gap-3 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-alt)] cursor-pointer">
                 <input type="checkbox" disabled={loading} {...register('flexiTime')} className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500 bg-[var(--surface)] border-[var(--border)]" />
                 <div>
                   <div className="text-sm font-bold text-[var(--text-primary)]">Enable Flexi-Time</div>
                   <div className="text-xs text-[var(--text-muted)]">Allow employees to complete their 9 hours any time during the day.</div>
                 </div>
               </label>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">Core Hours Start</label>
                   <input type="time" {...register('coreHoursStart')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500 font-mono" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">Core Hours End</label>
                   <input type="time" {...register('coreHoursEnd')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500 font-mono" />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Late Punch Grace Period (Mins)</label>
                 <input type="number" {...register('gracePeriodMins', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
               </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
               <button type="submit" disabled={saving || loading} className="py-2.5 px-6 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-all flex items-center gap-2 disabled:opacity-50">
                 {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} {saving ? 'Saving…' : 'Save Policy'}
               </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-1 space-y-6">
           <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 shadow-sm">
             <CalendarClock className="text-purple-500 mb-4" size={32} />
             <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-2">How it works</h3>
             <ul className="space-y-2 text-sm text-purple-600 dark:text-purple-300/80">
               <li className="flex gap-2"><span>&bull;</span><span>Flexi-time disables strict 9 AM late marks.</span></li>
               <li className="flex gap-2"><span>&bull;</span><span>Core hours mandate presence for critical syncs.</span></li>
               <li className="flex gap-2"><span>&bull;</span><span>Grace period allows minor delays.</span></li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
