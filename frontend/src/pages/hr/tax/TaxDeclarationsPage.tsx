import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileText, Loader2, Save, UploadCloud, Receipt, FileCheck, X } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';
import { taxApi, documentsApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';

const declarationSchema = z.object({
  financialYear: z.string(),
  regime: z.enum(['old', 'new']),
  section80C: z.object({
    lic: z.number().min(0).default(0),
    ppf: z.number().min(0).default(0),
    epf: z.number().min(0).default(0),
    elss: z.number().min(0).default(0),
    tuitionFee: z.number().min(0).default(0),
    homeLoanPrincipal: z.number().min(0).default(0),
  }),
  section80D: z.object({
    selfFamily: z.number().min(0).default(0),
    parents: z.number().min(0).default(0),
    preventiveHealthCheckup: z.number().min(0).max(5000).default(0),
  }),
  hra: z.object({
    annualRentPaid: z.number().min(0).default(0),
    metroCity: z.boolean().default(false),
    landlordPan: z.string().optional(),
  }),
  homeLoanInterest: z.number().min(0).max(200000).default(0),
  otherDeductions: z.array(z.object({
    section: z.string().min(1, 'Section required'),
    amount: z.number().min(1, 'Amount required'),
    description: z.string().optional(),
  })),
});

type DeclarationData = z.infer<typeof declarationSchema>;

function amountLines(data: DeclarationData) {
  const lines: Array<{ section: string; description: string; amount: number }> = [];
  const push = (section: string, description: string, amount: number) => {
    if (amount > 0) lines.push({ section, description, amount });
  };
  push('80C', 'Life Insurance (LIC)', data.section80C.lic);
  push('80C', 'Public Provident Fund (PPF)', data.section80C.ppf);
  push('80C', 'Voluntary EPF (VPF)', data.section80C.epf);
  push('80C', 'Mutual Funds (ELSS)', data.section80C.elss);
  push('80C', 'Children Tuition Fees', data.section80C.tuitionFee);
  push('80C', 'Home Loan Principal', data.section80C.homeLoanPrincipal);
  push('80D', 'Self, Spouse & Children (Medical)', data.section80D.selfFamily);
  push('80D', 'Parents (Senior Citizens)', data.section80D.parents);
  push('80D', 'Preventive Health Checkup', data.section80D.preventiveHealthCheckup);
  push('HRA', `Rent paid (${data.hra.metroCity ? 'Metro City' : 'Non-Metro'})`, data.hra.annualRentPaid);
  push('24B', 'Home Loan Interest', data.homeLoanInterest);
  data.otherDeductions.forEach((d) => push(`80${d.section}`, d.description || `Section ${d.section}`, d.amount));
  return lines;
}

export default function TaxDeclarationsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existing, setExisting] = useState<any[]>([]);
  const [financialYear, setFinancialYear] = useState('FY 2025-26');
  const [proofs, setProofs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProofFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        await documentsApi.upload({ employeeId: myEmpId, type: 'tax-proof', fileUrl: file.name });
        setProofs(p => [...p, file.name]);
      }
      toastSuccess(`${files.length} proof document${files.length > 1 ? 's' : ''} uploaded.`);
    } catch {
      toastError('Failed to upload proof documents.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<DeclarationData>({
    resolver: zodResolver(declarationSchema),
    defaultValues: {
      financialYear: 'FY 2025-26',
      regime: 'old',
      section80C: { lic: 0, ppf: 0, epf: 0, elss: 0, tuitionFee: 0, homeLoanPrincipal: 0 },
      section80D: { selfFamily: 0, parents: 0, preventiveHealthCheckup: 0 },
      hra: { annualRentPaid: 0, metroCity: false, landlordPan: '' },
      homeLoanInterest: 0,
      otherDeductions: [],
    }
  });

  useEffect(() => {
    if (!myEmpId) return;
    taxApi.getDeclarations(myEmpId)
      .then((rows: any[]) => {
        setExisting(Array.isArray(rows) ? rows : []);
        if (Array.isArray(rows) && rows.length) setFinancialYear(rows[0].financialYear || 'FY 2025-26');
      })
      .catch(() => setExisting([]));
  }, [myEmpId]);

  const { fields, append, remove } = useFieldArray({ control, name: 'otherDeductions' });
  
  const selectedRegime = watch('regime');
  
  const sec80CVals = watch('section80C');
  const total80C = Object.values(sec80CVals).reduce((a,b) => a + (Number(b) || 0), 0);
  const eligible80C = Math.min(total80C, 150000);

  const onSubmit = async (data: DeclarationData) => {
    setIsSubmitting(true);
    try {
      const lines = amountLines(data);
      if (!lines.length) { toastError('Please enter at least one declaration amount.'); setIsSubmitting(false); return; }
      const fy = data.financialYear || financialYear;
      for (const line of lines) {
        await taxApi.submitDeclaration({ employeeId: myEmpId, financialYear: fy, section: line.section, description: line.description, declaredAmount: line.amount });
      }
      const rows = await taxApi.getDeclarations(myEmpId).catch(() => []);
      setExisting(Array.isArray(rows) ? rows : []);
      reset();
      toastSuccess('Tax Declarations saved and submitted for approval successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to submit tax declarations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shadow-inner">
             <Receipt size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Tax Declarations (IT)</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Declare your planned investments for TDS calculation (FY 2025-26).</p>
          </div>
        </div>
      </div>

      {existing.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Recent Declarations ({financialYear})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4 text-right">Approved</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {existing.map((d: any) => (
                  <tr key={d.id} className="border-b border-[var(--border)]/50 last:border-0">
                    <td className="py-2.5 pr-4 font-bold text-[var(--text-primary)]">{d.section}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-muted)]">{d.description || '—'}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[var(--text-primary)]">₹{(d.declaredAmount || 0).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[var(--text-primary)]">₹{(d.approvedAmount || 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : d.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-600'}`}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4">
           <div>
             <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Tax Regime Preference</h3>
             <p className="text-xs text-[var(--text-muted)] mt-1">Select your preferred tax regime for TDS deductions.</p>
           </div>
           <div className="flex bg-[var(--surface-alt)] p-1.5 rounded-xl border border-[var(--border)]">
             <label className={`px-6 py-2.5 text-sm font-bold rounded-lg cursor-pointer transition-colors ${selectedRegime === 'old' ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
               <input type="radio" value="old" {...register('regime')} className="hidden" />
               Old Regime
             </label>
             <label className={`px-6 py-2.5 text-sm font-bold rounded-lg cursor-pointer transition-colors ${selectedRegime === 'new' ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
               <input type="radio" value="new" {...register('regime')} className="hidden" />
               New Regime
             </label>
           </div>
        </div>

        {selectedRegime === 'new' && (
           <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 shadow-sm text-center">
             <div className="text-amber-600 font-bold text-lg mb-2">New Tax Regime Selected</div>
             <p className="text-sm text-amber-600/80 max-w-2xl mx-auto">
               Under the new tax regime, most deductions (including Section 80C, 80D, HRA) are not applicable. 
               You do not need to declare these investments unless you switch back to the old regime.
             </p>
           </div>
        )}

        <div className={`space-y-6 transition-opacity duration-300 ${selectedRegime === 'new' ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
           {/* Section 80C */}
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                 <FileText className="text-sky-500" size={20} /> Section 80C Deductions
               </h3>
               <div className="text-right">
                 <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Eligible 80C Deduction</div>
                 <div className={`text-lg font-bold font-mono ${eligible80C >= 150000 ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>₹{eligible80C.toLocaleString()} <span className="text-xs text-[var(--text-muted)] font-sans font-medium">/ 1,50,000 Max</span></div>
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'lic', label: 'Life Insurance (LIC)' },
                  { id: 'ppf', label: 'Public Provident Fund (PPF)' },
                  { id: 'epf', label: 'Voluntary EPF (VPF)' },
                  { id: 'elss', label: 'Mutual Funds (ELSS)' },
                  { id: 'tuitionFee', label: 'Children Tuition Fees' },
                  { id: 'homeLoanPrincipal', label: 'Home Loan Principal' },
                ].map((item) => (
                  <div key={item.id} className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{item.label}</label>
                    <input type="number" {...register(`section80C.${item.id as keyof DeclarationData['section80C']}`, { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                ))}
             </div>
           </div>

           {/* Section 80D & HRA */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   Section 80D (Medical)
                 </h3>
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Self, Spouse, Children</label>
                     <input type="number" {...register('section80D.selfFamily', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Parents (Senior Citizens)</label>
                     <input type="number" {...register('section80D.parents', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Preventive Health Checkup (Max 5K)</label>
                     <input type="number" {...register('section80D.preventiveHealthCheckup', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                   </div>
                 </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   House Rent Allowance (HRA)
                 </h3>
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Annual Rent Paid (₹)</label>
                     <input type="number" {...register('hra.annualRentPaid', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Landlord PAN (If Rent &gt; 1L/yr)</label>
                     <input type="text" {...register('hra.landlordPan')} placeholder="ABCDE1234F" className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500 uppercase" />
                   </div>
                   <label className="flex items-center gap-3 pt-2 cursor-pointer">
                     <input type="checkbox" {...register('hra.metroCity')} className="w-5 h-5 rounded text-sky-500 focus:ring-sky-500 bg-[var(--surface-alt)] border-[var(--border)]" />
                     <span className="text-sm font-bold text-[var(--text-primary)]">Residing in Metro City (50% Basic HRA Rule)</span>
                   </label>
                 </div>
              </div>
           </div>

           {/* Other Deductions */}
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-[var(--text-primary)]">Other Section Deductions</h3>
               <button type="button" onClick={() => append({ section: '', amount: 0, description: '' })} className="text-xs font-bold text-sky-500 hover:text-sky-600 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 transition-colors">
                 + Add Deduction
               </button>
             </div>
             
             {fields.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm font-medium border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-alt)]">
                  No other deductions added. Click '+ Add Deduction' to include Section 80E, 80G, etc.
                </div>
             ) : (
               <div className="space-y-3">
                 {fields.map((field, index) => (
                   <div key={field.id} className="flex items-start gap-4 bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border)]">
                     <div className="w-32 space-y-1">
                       <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Section</label>
                       <select {...register(`otherDeductions.${index}.section`)} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none font-bold">
                         <option value="">Select...</option>
                         <option value="80E">80E (Edu Loan)</option>
                         <option value="80G">80G (Donations)</option>
                         <option value="80TTA">80TTA (Interest)</option>
                       </select>
                     </div>
                     <div className="w-40 space-y-1">
                       <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Amount (₹)</label>
                       <input type="number" {...register(`otherDeductions.${index}.amount`, { valueAsNumber: true })} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                     </div>
                     <div className="flex-1 space-y-1">
                       <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Description</label>
                       <input type="text" {...register(`otherDeductions.${index}.description`)} placeholder="Optional details..." className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-xs focus:outline-none" />
                     </div>
                     <button type="button" onClick={() => remove(index)} className="mt-6 text-rose-500 hover:text-rose-600 p-1.5 rounded hover:bg-rose-500/10">×</button>
                   </div>
                 ))}
               </div>
             )}
           </div>
           
            <div className="bg-[var(--surface-alt)] border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center">
              <UploadCloud className="text-[var(--text-muted)] mx-auto mb-3" size={32} />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Upload Proof Documents</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Attach receipts, premium certificates, and landlord PAN copies.</p>
              {proofs.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {proofs.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] font-bold text-[var(--text-primary)]">
                      <FileCheck size={13} className="text-emerald-500" /> {name}
                      <button type="button" onClick={() => setProofs(p => p.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-rose-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleProofFiles} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-xs font-bold text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-lg shadow-sm hover:border-sky-500 transition-colors disabled:opacity-60">
                {isUploading ? 'Uploading...' : 'Browse Files'}
              </button>
            </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSubmitting} className="py-3 px-8 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition-all shadow-md shadow-sky-500/20 flex justify-center items-center gap-2">
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Submit Tax Declarations
          </button>
        </div>
      </form>
    </div>
  );
}
