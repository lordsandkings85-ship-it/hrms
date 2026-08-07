import { useEffect, useState } from 'react';
import { Calculator, CheckCircle2, Loader2, Save, Percent } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { taxApi } from '../../../api/client';
import { Spinner } from '../../../components/ui/Spinner';

// Zod Schema for Tax Slabs
const taxSlabSchema = z.object({
  minIncome: z.number().min(0),
  maxIncome: z.number().nullable(), // Null means "Above"
  rate: z.number().min(0).max(100),
});

const taxConfigSchema = z.object({
  financialYear: z.string().min(1, 'Financial Year is required'),
  standardDeduction: z.number().min(0),
  rebateLimit: z.number().min(0),
  healthEducationCess: z.number().min(0).max(100),
  oldRegimeSlabs: z.array(taxSlabSchema),
  newRegimeSlabs: z.array(taxSlabSchema),
});

type TaxConfigData = z.infer<typeof taxConfigSchema>;

// Default Tax Configuration (FY 2025-26)
const defaultValues: TaxConfigData = {
  financialYear: 'FY 2025-26',
  standardDeduction: 50000,
  rebateLimit: 700000,
  healthEducationCess: 4,
  oldRegimeSlabs: [
    { minIncome: 0, maxIncome: 250000, rate: 0 },
    { minIncome: 250001, maxIncome: 500000, rate: 5 },
    { minIncome: 500001, maxIncome: 1000000, rate: 20 },
    { minIncome: 1000001, maxIncome: null, rate: 30 },
  ],
  newRegimeSlabs: [
    { minIncome: 0, maxIncome: 300000, rate: 0 },
    { minIncome: 300001, maxIncome: 600000, rate: 5 },
    { minIncome: 600001, maxIncome: 900000, rate: 10 },
    { minIncome: 900001, maxIncome: 1200000, rate: 15 },
    { minIncome: 1200001, maxIncome: 1500000, rate: 20 },
    { minIncome: 1500001, maxIncome: null, rate: 30 },
  ],
};

export default function TaxMasterPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<TaxConfigData>({
    resolver: zodResolver(taxConfigSchema),
    defaultValues,
  });

  useEffect(() => {
    taxApi.getMasterConfig()
      .then((cfg: any) => {
        if (cfg && typeof cfg === 'object') {
          reset({
            financialYear: cfg.financialYear || defaultValues.financialYear,
            standardDeduction: cfg.standardDeduction ?? defaultValues.standardDeduction,
            rebateLimit: cfg.rebateLimit ?? defaultValues.rebateLimit,
            healthEducationCess: cfg.healthEducationCess ?? defaultValues.healthEducationCess,
            oldRegimeSlabs: Array.isArray(cfg.oldRegimeSlabs) && cfg.oldRegimeSlabs.length ? cfg.oldRegimeSlabs : defaultValues.oldRegimeSlabs,
            newRegimeSlabs: Array.isArray(cfg.newRegimeSlabs) && cfg.newRegimeSlabs.length ? cfg.newRegimeSlabs : defaultValues.newRegimeSlabs,
          });
        }
      })
      .catch(() => reset(defaultValues))
      .finally(() => setIsLoading(false));
  }, [reset]);

  const { fields: oldSlabs, append: appendOld, remove: removeOld } = useFieldArray({ control, name: 'oldRegimeSlabs' });
  const { fields: newSlabs, append: appendNew, remove: removeNew } = useFieldArray({ control, name: 'newRegimeSlabs' });

  const onSubmit = async (data: TaxConfigData) => {
    setIsSaving(true);
    try {
      await taxApi.saveMasterConfig(data);
      toastSuccess('Tax Master Configuration saved successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save Tax Master Configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
             <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Tax Master Configuration</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Configure global income tax brackets, deductions, and cess rates.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 flex justify-center"><Spinner /></div>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Global Settings */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Percent className="text-blue-500" size={20} /> Global Tax Parameters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2">
               <label className="text-xs font-bold text-[var(--text-primary)]">Financial Year</label>
               <input {...register('financialYear')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500" />
               {errors.financialYear && <p className="text-xs text-rose-500">{errors.financialYear.message}</p>}
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-bold text-[var(--text-primary)]">Standard Deduction (₹)</label>
               <input type="number" {...register('standardDeduction', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500" />
               {errors.standardDeduction && <p className="text-xs text-rose-500">{errors.standardDeduction.message}</p>}
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold text-[var(--text-primary)]">87A Rebate Limit (₹)</label>
               <input type="number" {...register('rebateLimit', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500" />
               {errors.rebateLimit && <p className="text-xs text-rose-500">{errors.rebateLimit.message}</p>}
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold text-[var(--text-primary)]">Health & Education Cess (%)</label>
               <input type="number" {...register('healthEducationCess', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500" />
               {errors.healthEducationCess && <p className="text-xs text-rose-500">{errors.healthEducationCess.message}</p>}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Old Tax Regime */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-[var(--text-primary)]">Old Tax Regime Slabs</h3>
               <button type="button" onClick={() => appendOld({ minIncome: 0, maxIncome: null, rate: 0 })} className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors">
                 + Add Slab
               </button>
             </div>
             
             <div className="space-y-3">
               {oldSlabs.map((field, index) => (
                 <div key={field.id} className="flex items-center gap-3 bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Min Income (₹)</label>
                     <input type="number" {...register(`oldRegimeSlabs.${index}.minIncome`, { valueAsNumber: true })} className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                   </div>
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Max Income (₹)</label>
                     <input type="number" {...register(`oldRegimeSlabs.${index}.maxIncome`, { setValueAs: v => v === '' ? null : Number(v) })} placeholder="Above" className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                   </div>
                   <div className="w-20 space-y-1">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Rate (%)</label>
                     <input type="number" {...register(`oldRegimeSlabs.${index}.rate`, { valueAsNumber: true })} className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                   </div>
                   <button type="button" onClick={() => removeOld(index)} className="mt-4 text-rose-500 hover:text-rose-600 p-1.5 rounded hover:bg-rose-500/10">×</button>
                 </div>
               ))}
             </div>
          </div>

          {/* New Tax Regime */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-[var(--text-primary)]">New Tax Regime Slabs</h3>
               <button type="button" onClick={() => appendNew({ minIncome: 0, maxIncome: null, rate: 0 })} className="text-xs font-bold text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors">
                 + Add Slab
               </button>
             </div>
             
             <div className="space-y-3">
               {newSlabs.map((field, index) => (
                 <div key={field.id} className="flex items-center gap-3 bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Min Income (₹)</label>
                     <input type="number" {...register(`newRegimeSlabs.${index}.minIncome`, { valueAsNumber: true })} className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                   </div>
                   <div className="flex-1 space-y-1">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Max Income (₹)</label>
                     <input type="number" {...register(`newRegimeSlabs.${index}.maxIncome`, { setValueAs: v => v === '' ? null : Number(v) })} placeholder="Above" className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                   </div>
                   <div className="w-20 space-y-1">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Rate (%)</label>
                     <input type="number" {...register(`newRegimeSlabs.${index}.rate`, { valueAsNumber: true })} className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                   </div>
                   <button type="button" onClick={() => removeNew(index)} className="mt-4 text-rose-500 hover:text-rose-600 p-1.5 rounded hover:bg-rose-500/10">×</button>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSaving} className="py-3 px-8 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 flex justify-center items-center gap-2">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Tax Configuration
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
