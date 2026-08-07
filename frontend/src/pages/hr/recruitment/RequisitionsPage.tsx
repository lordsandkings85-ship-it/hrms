import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Search, Plus, Loader2, Send } from 'lucide-react';
import { recruitmentApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';

const jobSchema = z.object({
  title: z.string().min(3, 'Job title is required (min 3 chars)'),
  description: z.string().optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

export default function RequisitionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['recruitment-jobs'],
    queryFn: () => recruitmentApi.listJobs(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: JobFormData) => recruitmentApi.createJob(data),
    onSuccess: () => {
      toastSuccess('Job Requisition created successfully!');
      reset();
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to create job'),
  });

  const onSubmit = (data: JobFormData) => {
    createMutation.mutate(data);
  };

  const jobColumns: Column<any>[] = [
    { key: 'title', header: 'Job Title', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.title}</span> },
    { key: 'description', header: 'Description', render: (row: any) => <span className="text-[var(--text-muted)] text-xs truncate max-w-[200px] block">{row.description || '-'}</span> },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status || 'open'} /> },
    { key: 'candidates', header: 'Candidates', render: (row: any) => <span className="font-mono font-bold text-[var(--text-primary)]">{row.candidates?.length || 0} Applied</span> },
    { key: 'date', header: 'Posted Date', render: (row: any) => <span className="font-mono text-xs">{new Date(row.createdAt).toLocaleDateString()}</span> },
  ];

  const filteredJobs = jobs?.filter((j: any) => j.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container max-w-6xl space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
             <ClipboardCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Requisitions</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage and create job requisitions.</p>
          </div>
        </div>
        <div className="relative z-10">
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-emerald-600/20"
          >
            <Plus size={16} /> {isCreating ? 'Cancel' : 'Create Requisition'}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2">New Job Requisition</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Job Title <span className="text-rose-500">*</span></label>
              <input 
                {...register('title')}
                type="text" 
                placeholder="e.g. Senior Frontend Developer"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
              {errors.title && <p className="text-xs text-rose-500">{errors.title.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Job Description</label>
              <textarea 
                {...register('description')}
                rows={3} 
                placeholder="Brief description of the role..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {createMutation.isPending ? 'Publishing...' : 'Publish Job'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">Active Requisitions</h3>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors w-64" />
          </div>
        </div>

        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          
          <DataTable columns={jobColumns} data={filteredJobs || []} loading={isLoadingJobs} keyField="id" />
        </div>
      </div>
    </div>
  );
}
