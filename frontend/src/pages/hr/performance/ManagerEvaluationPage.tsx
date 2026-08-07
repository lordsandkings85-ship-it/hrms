import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Users, Target, Loader2, Send } from 'lucide-react';
import { performanceApi, employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';

const reviewSchema = z.object({
  cycle: z.string().min(1, 'Review cycle is required'),
  type: z.string().min(1, 'Review type is required'),
  score: z.number().min(1).max(5),
  comments: z.string().min(5, 'Comments are required'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export default function ManagerEvaluationPage() {
  const [selectedEmp, setSelectedEmp] = useState('');
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['performance-goals', selectedEmp],
    queryFn: () => performanceApi.listGoals(selectedEmp),
    enabled: !!selectedEmp,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['performance-reviews', selectedEmp],
    queryFn: () => performanceApi.listReviews(selectedEmp),
    enabled: !!selectedEmp,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { cycle: 'H1 2026', type: 'Manager Evaluation', score: 0, comments: '' }
  });

  const currentScore = watch('score');

  const reviewMutation = useMutation({
    mutationFn: (data: ReviewFormData) => performanceApi.submitReview(selectedEmp, data),
    onSuccess: () => {
      toastSuccess('Evaluation submitted successfully!');
      reset({ cycle: 'H1 2026', type: 'Manager Evaluation', score: 0, comments: '' });
      queryClient.invalidateQueries({ queryKey: ['performance-reviews', selectedEmp] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit evaluation'),
  });

  const onSubmit = (data: ReviewFormData) => {
    reviewMutation.mutate(data);
  };

  const goalColumns: Column<any>[] = [
    { key: 'title', header: 'Goal Title', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.title}</span> },
    { key: 'description', header: 'Description', render: (row: any) => <span className="text-[var(--text-muted)] text-xs truncate max-w-[200px] block">{row.description}</span> },
    { key: 'dueDate', header: 'Due Date', render: (row: any) => <span className="font-mono text-xs">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}</span> },
    { 
      key: 'progress', 
      header: 'Progress', 
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden border border-[var(--border)]">
             <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.progress}%` }}></div>
          </div>
          <span className="text-[10px] font-bold text-[var(--text-muted)]">{row.progress}%</span>
        </div>
      ) 
    },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status || (row.progress === 100 ? 'completed' : 'in_progress')} /> },
  ];

  const reviewColumns: Column<any>[] = [
    { key: 'cycle', header: 'Cycle', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.cycle}</span> },
    { key: 'type', header: 'Type', render: (row: any) => <span className="text-xs uppercase tracking-wider font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{row.type}</span> },
    { 
      key: 'score', 
      header: 'Score', 
      render: (row: any) => (
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
             <Star key={s} size={12} className={s <= row.score ? "text-amber-500 fill-amber-500" : "text-[var(--border)]"} />
          ))}
          <span className="ml-1 text-xs font-bold">{row.score}/5</span>
        </div>
      ) 
    },
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs text-[var(--text-muted)]">{new Date(row.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div className="page-container max-w-6xl space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <Star size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Manager Evaluation</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Evaluate direct reports and submit performance reviews.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Users size={16} className="text-amber-500" /> Employee Context</h3>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors"
              >
                <option value="">-- Select Employee --</option>
                {employees?.items?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
           </div>

           {selectedEmp && (
             <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-xs animate-in fade-in zoom-in-95">
               <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
                 <Target size={16} className="text-amber-500" />
                 Submit Evaluation
               </h3>
               <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">Review Cycle <span className="text-rose-500">*</span></label>
                   <select {...register('cycle')} className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500">
                     <option value="H1 2026">H1 2026</option>
                     <option value="H2 2025">H2 2025</option>
                     <option value="Annual 2025">Annual 2025</option>
                   </select>
                   {errors.cycle && <p className="text-xs text-rose-500">{errors.cycle.message}</p>}
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">Score <span className="text-rose-500">*</span></label>
                   <div className="flex gap-2">
                     {[1,2,3,4,5].map(num => (
                       <button 
                         key={num}
                         type="button"
                         onClick={() => setValue('score', num, { shouldValidate: true })}
                         className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                           currentScore >= num 
                             ? 'bg-amber-500 text-white border-amber-500' 
                             : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/50'
                         }`}
                       >
                         <Star size={14} fill={currentScore >= num ? 'currentColor' : 'none'} />
                       </button>
                     ))}
                   </div>
                   {errors.score && <p className="text-xs text-rose-500">{errors.score.message}</p>}
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-bold text-[var(--text-primary)]">Comments <span className="text-rose-500">*</span></label>
                   <textarea 
                     {...register('comments')}
                     rows={3}
                     placeholder="Performance feedback..."
                     className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500 resize-none"
                   />
                   {errors.comments && <p className="text-xs text-rose-500">{errors.comments.message}</p>}
                 </div>

                 <button 
                   type="submit" 
                   disabled={reviewMutation.isPending}
                   className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                 >
                   {reviewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                   {reviewMutation.isPending ? 'Submitting...' : 'Submit Evaluation'}
                 </button>
               </form>
             </div>
           )}
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">Goals Progress</h3>
             <div className="premium-datatable">
               <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
               `}</style>
               {selectedEmp ? (
                 <DataTable columns={goalColumns} data={goals || []} loading={goalsLoading} keyField="id" />
               ) : (
                 <div className="h-32 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">Select an employee to view goals.</div>
               )}
             </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">Evaluation History</h3>
             <div className="premium-datatable">
               {selectedEmp ? (
                 <DataTable columns={reviewColumns} data={reviews || []} loading={reviewsLoading} keyField="id" />
               ) : (
                 <div className="h-32 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">Select an employee to view history.</div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
