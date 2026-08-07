import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import * as z from 'zod';
import { Calculator, ArrowRight, IndianRupee } from 'lucide-react';
import { taxSetupApi } from '../../../api/client';

const calculatorSchema = z.object({
  grossSalary: z.number().min(0, 'Must be positive').default(1000000),
  section80C: z.number().min(0).max(150000).default(0),
  section80D: z.number().min(0).default(0),
  hraExemption: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
});

type CalculatorData = z.infer<typeof calculatorSchema>;

function parseRate(r: any): number {
  const raw = String(r ?? '').trim();
  const n = Number(r);
  if (!Number.isFinite(n)) return 0;
  if (raw.endsWith('%')) return n / 100;
  return n > 1 ? n / 100 : n;
}

function computeTaxFromSlabs(taxable: number, slabs: any[], regime: string): number | null {
  const rows = (slabs || []).filter((s) => String(s.regime).toLowerCase() === regime.toLowerCase());
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.fromAmount ?? 0) - (b.fromAmount ?? 0));
  let tax = 0;
  for (const s of rows) {
    const from = s.fromAmount ?? 0;
    const to = s.toAmount && Number(s.toAmount) > from ? Number(s.toAmount) : Infinity;
    const rate = parseRate(s.rate);
    const band = Math.max(0, Math.min(taxable, to) - from);
    tax += band * rate;
    if (taxable <= to) break;
  }
  return tax;
}

export default function TaxCalculatorPage() {
  const { register, watch, formState: { errors } } = useForm<CalculatorData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: { grossSalary: 1200000, section80C: 150000, section80D: 25000, hraExemption: 100000, otherDeductions: 0 }
  });

  const { data: slabsData } = useQuery({
    queryKey: ['tax-slabs'],
    queryFn: () => taxSetupApi.list('slabs'),
  });
  const slabs = Array.isArray(slabsData) ? slabsData : (slabsData as any)?.items ?? [];

  const watchAll = watch();

  // Standard deduction + rebates (FY 2024-25 approx logic)
  const standardDeduction = 50000;
  
  // OLD REGIME
  const oldTotalDeductions = standardDeduction + watchAll.section80C + watchAll.section80D + watchAll.hraExemption + watchAll.otherDeductions;
  const oldTaxable = Math.max(0, watchAll.grossSalary - oldTotalDeductions);
  
  let fallbackOldTax = 0;
  if (oldTaxable > 1000000) fallbackOldTax = 112500 + (oldTaxable - 1000000) * 0.3;
  else if (oldTaxable > 500000) fallbackOldTax = 12500 + (oldTaxable - 500000) * 0.2;
  else if (oldTaxable > 250000) fallbackOldTax = (oldTaxable - 250000) * 0.05;
  
  if (oldTaxable <= 500000) fallbackOldTax = 0; // 87A rebate
  fallbackOldTax = fallbackOldTax * 1.04; // Cess

  // NEW REGIME
  const newTaxable = Math.max(0, watchAll.grossSalary - standardDeduction);
  let fallbackNewTax = 0;
  if (newTaxable > 1500000) fallbackNewTax = 150000 + (newTaxable - 1500000) * 0.3;
  else if (newTaxable > 1200000) fallbackNewTax = 90000 + (newTaxable - 1200000) * 0.2;
  else if (newTaxable > 900000) fallbackNewTax = 45000 + (newTaxable - 900000) * 0.15;
  else if (newTaxable > 600000) fallbackNewTax = 15000 + (newTaxable - 600000) * 0.1;
  else if (newTaxable > 300000) fallbackNewTax = (newTaxable - 300000) * 0.05;

  if (newTaxable <= 700000) fallbackNewTax = 0; // 87A rebate under new regime
  fallbackNewTax = fallbackNewTax * 1.04; // Cess

  const oldTax = computeTaxFromSlabs(oldTaxable, slabs, 'Old') ?? fallbackOldTax;
  const newTax = computeTaxFromSlabs(newTaxable, slabs, 'New') ?? fallbackNewTax;

  const betterRegime = newTax <= oldTax ? 'New Regime' : 'Old Regime';
  const taxSavings = Math.abs(oldTax - newTax);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Income Tax Calculator</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Compare Old vs New Tax Regime based on your CTC and deductions.</p>
            <span className={`inline-block mt-2 text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${slabs.length ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-500 border-amber-500/20 bg-amber-500/10'}`}>
              {slabs.length ? 'Using configured TDS slabs' : 'Using built-in FY 2024-25 slabs'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm h-full">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
              <IndianRupee className="text-indigo-500" size={20} /> Income & Deductions
            </h3>
            
            <div className="space-y-5">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Gross Annual Salary (CTC)</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <span className="text-[var(--text-muted)] font-bold">₹</span>
                   </div>
                   <input type="number" {...register('grossSalary', { valueAsNumber: true })} className="w-full pl-8 pr-4 py-3 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-lg font-bold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-mono" />
                 </div>
               </div>

               <div className="pt-4 border-t border-[var(--border)]">
                 <h4 className="text-xs font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">Estimated Deductions (Old Regime)</h4>
                 
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex justify-between">
                       <span>Section 80C</span>
                       <span className="text-indigo-500">Max ₹1.5L</span>
                     </label>
                     <input type="number" {...register('section80C', { valueAsNumber: true })} className="w-full px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-bold font-mono focus:outline-none focus:border-indigo-500" />
                   </div>
                   
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Section 80D (Health Insurance)</label>
                     <input type="number" {...register('section80D', { valueAsNumber: true })} className="w-full px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-bold font-mono focus:outline-none focus:border-indigo-500" />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Estimated HRA Exemption</label>
                     <input type="number" {...register('hraExemption', { valueAsNumber: true })} className="w-full px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-bold font-mono focus:outline-none focus:border-indigo-500" />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Other Exemptions (LTA, Sec 24, etc)</label>
                     <input type="number" {...register('otherDeductions', { valueAsNumber: true })} className="w-full px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-bold font-mono focus:outline-none focus:border-indigo-500" />
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 text-center shadow-inner relative overflow-hidden group">
                  <div className={`absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity ${betterRegime === 'Old Regime' ? 'opacity-100 border-2 border-indigo-500' : ''}`}></div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 relative z-10">Old Regime Tax</h3>
                  <div className="text-4xl font-bold font-mono text-[var(--text-primary)] mb-4 relative z-10">₹{Math.round(oldTax).toLocaleString()}</div>
                  <div className="text-xs text-[var(--text-muted)] relative z-10 space-y-1">
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span>Standard Ded:</span><span className="font-mono">₹50,000</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span>Total Ded:</span><span className="font-mono">₹{oldTotalDeductions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxable:</span><span className="font-mono">₹{oldTaxable.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 text-center shadow-inner relative overflow-hidden group">
                  <div className={`absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity ${betterRegime === 'New Regime' ? 'opacity-100 border-2 border-emerald-500' : ''}`}></div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 relative z-10">New Regime Tax</h3>
                  <div className="text-4xl font-bold font-mono text-[var(--text-primary)] mb-4 relative z-10">₹{Math.round(newTax).toLocaleString()}</div>
                  <div className="text-xs text-[var(--text-muted)] relative z-10 space-y-1">
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span>Standard Ded:</span><span className="font-mono">₹50,000</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span>Total Ded:</span><span className="font-mono">₹50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxable:</span><span className="font-mono">₹{newTaxable.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="mt-8 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border border-[var(--border)] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Recommendation</h4>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    You should opt for <span className={betterRegime === 'New Regime' ? 'text-emerald-500' : 'text-indigo-500'}>{betterRegime}</span>.
                  </p>
                </div>
                <div className="bg-[var(--surface)] px-6 py-3 rounded-xl shadow-sm border border-[var(--border)] flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Tax Saved:</span>
                  <span className="text-xl font-bold font-mono text-emerald-500 flex items-center"><ArrowRight size={20} className="mr-1" /> ₹{Math.round(taxSavings).toLocaleString()}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
