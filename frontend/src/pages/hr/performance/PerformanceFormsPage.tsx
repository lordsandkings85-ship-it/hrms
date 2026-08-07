import { useEffect, useState } from 'react';
import { FileText, Save, CheckCircle, Loader2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { integrationsApi } from '../../../api/client';

const formsSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string(),
  questions: z.array(z.object({
    text: z.string().min(1, 'Question text required'),
    type: z.enum(['text', 'rating', 'boolean']),
  })).min(1, 'At least one question required'),
});

type FormsData = z.infer<typeof formsSchema>;

const defaultValues: FormsData = {
  title: 'Annual Self-Appraisal (2025)',
  description: 'Standard self-reflection form for all technical staff.',
  questions: [
    { text: 'What were your top 3 achievements this year?', type: 'text' },
    { text: 'Rate your overall performance against goals', type: 'rating' }
  ]
};

export default function PerformanceFormsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormsData>({
    resolver: zodResolver(formsSchema),
    defaultValues,
  });

  useEffect(() => {
    integrationsApi.getConfig('performance-form-template')
      .then((cfg: any) => {
        if (cfg && typeof cfg === 'object' && cfg.questions) {
          reset({ title: cfg.title || defaultValues.title, description: cfg.description || '', questions: cfg.questions });
        }
      })
      .catch(() => reset(defaultValues));
  }, [reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const onSubmit = async (data: FormsData) => {
    setIsSaving(true);
    try {
      await integrationsApi.saveConfig('performance-form-template', data);
      toastSuccess('Performance Form template saved successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save performance form template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Appraisal Form Builder</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Design custom evaluation templates for review cycles.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        
        <div className="space-y-4 border-b border-[var(--border)] pb-6">
           <div className="space-y-2">
             <label className="text-xs font-bold text-[var(--text-primary)]">Template Title <span className="text-rose-500">*</span></label>
             <input {...register('title')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
             {errors.title && <p className="text-xs text-rose-500">{errors.title.message}</p>}
           </div>
           <div className="space-y-2">
             <label className="text-xs font-bold text-[var(--text-primary)]">Description</label>
             <textarea {...register('description')} rows={2} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500 resize-none" />
           </div>
        </div>

        <div>
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-[var(--text-primary)]">Form Questions</h3>
             <button type="button" onClick={() => append({ text: '', type: 'text' })} className="text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
               + Add Question
             </button>
           </div>
           
           <div className="space-y-3">
             {fields.map((field, index) => (
               <div key={field.id} className="flex gap-4 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface-alt)]">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Question Text</label>
                    <input {...register(`questions.${index}.text`)} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. Rate your communication skills" />
                  </div>
                  <div className="w-40 space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Answer Type</label>
                    <select {...register(`questions.${index}.type`)} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-sm focus:outline-none font-bold">
                      <option value="text">Paragraph Text</option>
                      <option value="rating">1-5 Rating</option>
                      <option value="boolean">Yes/No</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => remove(index)} className="mt-7 text-rose-500 hover:bg-rose-500/10 p-2 rounded transition-colors self-start">&times;</button>
               </div>
             ))}
           </div>
           {errors.questions && <p className="text-xs text-rose-500 mt-2">{errors.questions.message}</p>}
        </div>

        <div className="pt-6 border-t border-[var(--border)] flex justify-end">
          <button type="submit" disabled={isSaving} className="py-2.5 px-6 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-sm shadow-amber-500/20">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Form Template
          </button>
        </div>

      </form>
    </div>
  );
}
