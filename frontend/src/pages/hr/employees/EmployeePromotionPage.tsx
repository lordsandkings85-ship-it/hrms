import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, ArrowUpCircle, Search, Loader2, TrendingUp, CheckCircle } from 'lucide-react';
import { employeesApi, payrollApi, employeeServicesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const promotionSchema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  newDesignation: z.string().min(1, 'New designation required'),
  newDepartment: z.string().optional(),
  salaryIncrementPercent: z.number().min(0).max(100),
  effectiveDate: z.string().min(1, 'Effective date required'),
  reason: z.string().min(10, 'Reason required'),
});

type PromotionData = z.infer<typeof promotionSchema>;

export default function EmployeePromotionPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [showModal, setShowModal] = useState(false);

  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees-promotion-list'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const employees = employeesResponse?.items || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PromotionData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: { employeeId: '', newDesignation: '', newDepartment: '', salaryIncrementPercent: 0, effectiveDate: '', reason: '' }
  });

  const promoteMutation = useMutation({
    mutationFn: async (data: PromotionData) => {
      const structure = await payrollApi.getSalaryStructure(data.employeeId).catch(() => null);
      const currentCtc = structure
        ? (structure.basic || 0) + (structure.hra || 0) + (structure.da || 0) + (structure.conveyance || 0) + (structure.medical || 0) + (structure.specialAllowance || 0)
        : 0;
      const revisedCtc = Math.round(currentCtc * (1 + data.salaryIncrementPercent / 100));
      await employeeServicesApi.createSalaryRevision({
        employeeId: data.employeeId,
        effectiveFrom: data.effectiveDate,
        revisedCtc,
        previousCtc: currentCtc,
        reason: 'promotion',
        remarks: `${data.reason} · New designation: ${data.newDesignation}`,
      });
      await employeesApi.update(data.employeeId, { grade: data.newDesignation } as any);
    },
    onSuccess: () => {
      toastSuccess('Promotion workflow initiated and sent for managerial approval!');
      setShowModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['employees-promotion-list'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to initiate promotion'),
  });

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (row: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs uppercase border border-emerald-500/20">
          {row.firstName[0]}{row.lastName[0]}
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--text-primary)]">{row.firstName} {row.lastName}</div>
          <div className="text-xs text-[var(--text-muted)] font-mono">{row.employeeCode}</div>
        </div>
      </div>
    )},
    { key: 'department', header: 'Department', render: (row: any) => <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{row.department?.name || 'N/A'}</span> },
    { key: 'designation', header: 'Current Designation', render: (row: any) => <span className="text-sm font-bold text-[var(--text-primary)]">{row.designation?.title || 'Employee'}</span> },
    { key: 'actions', header: 'Actions', render: (row: any) => (
      <button 
        onClick={() => { reset({ employeeId: row.id, newDesignation: '', newDepartment: '', salaryIncrementPercent: 0, effectiveDate: '', reason: '' }); setShowModal(true); }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
      >
        <ArrowUpCircle size={14} /> Promote
      </button>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
             <Award size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employee Promotions</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage career progressions, role updates, and compensation bumps.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="relative z-10 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors flex items-center gap-2">
          <TrendingUp size={18} /> Initiate Promotion
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Eligible Employees</h3>
        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          <DataTable columns={columns} data={employees} loading={isLoading} keyField="id" />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[var(--border)] bg-emerald-500/5 rounded-t-2xl">
              <h3 className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={20} /> Promote Employee
              </h3>
            </div>
            <form onSubmit={handleSubmit((d) => promoteMutation.mutate(d))} className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Select Employee <span className="text-rose-500">*</span></label>
                 <select {...register('employeeId')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-emerald-500">
                   <option value="">-- Choose Employee --</option>
                   {employees.map((e:any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
                 </select>
                 {errors.employeeId && <p className="text-xs text-rose-500">{errors.employeeId.message}</p>}
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">New Designation <span className="text-rose-500">*</span></label>
                   <input {...register('newDesignation')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Senior Dev" />
                   {errors.newDesignation && <p className="text-xs text-rose-500">{errors.newDesignation.message}</p>}
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">Salary Bump (%) <span className="text-rose-500">*</span></label>
                   <input type="number" {...register('salaryIncrementPercent', { valueAsNumber: true })} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                   {errors.salaryIncrementPercent && <p className="text-xs text-rose-500">{errors.salaryIncrementPercent.message}</p>}
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Effective Date <span className="text-rose-500">*</span></label>
                 <input type="date" {...register('effectiveDate')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-mono" />
                 {errors.effectiveDate && <p className="text-xs text-rose-500">{errors.effectiveDate.message}</p>}
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Performance Justification <span className="text-rose-500">*</span></label>
                 <textarea {...register('reason')} rows={3} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none" placeholder="Details of achievements justifying this promotion..." />
                 {errors.reason && <p className="text-xs text-rose-500">{errors.reason.message}</p>}
               </div>
               <div className="flex gap-4 pt-4 border-t border-[var(--border)] mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-[var(--surface-alt)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">Cancel</button>
                  <button type="submit" disabled={promoteMutation.isPending} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20">
                    {promoteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Submit Request
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
