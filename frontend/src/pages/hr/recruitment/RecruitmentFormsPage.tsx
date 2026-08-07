import { useEffect, useState } from 'react';
import { Landmark, Save, CheckCircle, Loader2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { integrationsApi } from '../../../api/client';

const scorecardSchema = z.object({
  roleLevel: z.string().min(1, 'Role Level required'),
  competencies: z.array(z.object({
    name: z.string().min(1, 'Competency name required'),
    weightage: z.number().min(1).max(100),
  })).min(1, 'At least one competency required'),
});

type ScorecardData = z.infer<typeof scorecardSchema>;

const defaultValues: ScorecardData = {
  roleLevel: 'Senior Software Engineer (L4)',
  competencies: [
    { name: 'System Design & Architecture', weightage: 30 },
    { name: 'Coding & Problem Solving', weightage: 40 },
    { name: 'Communication & Culture Fit', weightage: 30 },
  ]
};

export default function RecruitmentFormsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ScorecardData>({
    resolver: zodResolver(scorecardSchema),
    defaultValues,
  });

  useEffect(() => {
    integrationsApi.getConfig('interview-scorecard')
      .then((cfg: any) => {
        if (cfg && typeof cfg === 'object' && cfg.competencies) {
          reset({ roleLevel: cfg.roleLevel || defaultValues.roleLevel, competencies: cfg.competencies });
        }
      })
      .catch(() => reset(defaultValues));
  }, [reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'competencies' });

  const onSubmit = async (data: ScorecardData) => {
    setIsSaving(true);
    try {
      await integrationsApi.saveConfig('interview-scorecard', data);
      toastSuccess('Interview scorecard template saved!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save scorecard template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
             <Landmark size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Interview Scorecards</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Standardize technical and behavioral interview feedback.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        
        <div className="space-y-4 border-b border-[var(--border)] pb-6">
           <div className="space-y-2">
             <label className="text-xs font-bold text-[var(--text-primary)]">Target Role / Level <span className="text-rose-500">*</span></label>
             <input {...register('roleLevel')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
             {errors.roleLevel && <p className="text-xs text-rose-500">{errors.roleLevel.message}</p>}
           </div>
        </div>

        <div>
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-[var(--text-primary)]">Evaluation Competencies</h3>
             <button type="button" onClick={() => append({ name: '', weightage: 10 })} className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
               + Add Competency
             </button>
           </div>
           
           <div className="space-y-3">
             {fields.map((field, index) => (
               <div key={field.id} className="flex gap-4 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-alt)]">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Competency Area</label>
                    <input {...register(`competencies.${index}.name`)} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Algorithms" />
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Weightage (%)</label>
                    <input type="number" {...register(`competencies.${index}.weightage`, { valueAsNumber: true })} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => remove(index)} className="mt-7 text-rose-500 hover:bg-rose-500/10 p-2 rounded transition-colors self-start">&times;</button>
               </div>
             ))}
           </div>
           {errors.competencies && <p className="text-xs text-rose-500 mt-2">{errors.competencies.message}</p>}
        </div>

        <div className="pt-6 border-t border-[var(--border)] flex justify-end">
          <button type="submit" disabled={isSaving} className="py-2.5 px-6 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/20">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Scorecard Base
          </button>
        </div>

      </form>
    </div>
  );
}
