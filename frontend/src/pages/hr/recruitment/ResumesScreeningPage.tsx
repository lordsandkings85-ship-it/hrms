import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, Plus, Send, Loader2, ArrowRight } from 'lucide-react';
import { recruitmentApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';

const candidateSchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Invalid email address'),
  resumeUrl: z.string().optional(),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

export default function ResumesScreeningPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['recruitment-jobs'],
    queryFn: () => recruitmentApi.listJobs(),
  });

  const candidates = useMemo(() => {
    if (!jobs) return [];
    return jobs.flatMap((j: any) => j.candidates?.map((c: any) => ({ ...c, jobTitle: j.title })) || []);
  }, [jobs]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CandidateFormData) => recruitmentApi.addCandidate(data.jobId, { name: data.name, email: data.email, resumeUrl: data.resumeUrl }),
    onSuccess: () => {
      toastSuccess('Candidate added successfully!');
      reset();
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to add candidate'),
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => recruitmentApi.moveStage(id, stage),
    onSuccess: () => {
      toastSuccess('Candidate stage updated!');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
  });

  const onSubmit = (data: CandidateFormData) => {
    createMutation.mutate(data);
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Candidate Name', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.name}</span> },
    { key: 'jobTitle', header: 'Applied For', render: (row: any) => <span className="text-[var(--text-primary)] text-sm">{row.jobTitle}</span> },
    { key: 'email', header: 'Email', render: (row: any) => <span className="text-[var(--text-muted)] text-sm">{row.email}</span> },
    { key: 'stage', header: 'Stage', render: (row: any) => <StatusBadge status={row.stage || 'applied'} /> },
    { 
      key: 'actions', header: 'Actions', render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.stage === 'applied' && (
            <button 
              onClick={() => moveStageMutation.mutate({ id: row.id, stage: 'screening' })}
              className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded font-bold hover:bg-indigo-500/20"
            >
              Start Screening
            </button>
          )}
          {row.stage === 'screening' && (
            <button 
              onClick={() => moveStageMutation.mutate({ id: row.id, stage: 'interviewing' })}
              className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded font-bold hover:bg-emerald-500/20"
            >
              Move to Interview
            </button>
          )}
          {row.stage !== 'rejected' && row.stage !== 'hired' && (
            <button 
              onClick={() => moveStageMutation.mutate({ id: row.id, stage: 'rejected' })}
              className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded font-bold hover:bg-red-500/20"
            >
              Reject
            </button>
          )}
        </div>
      ) 
    },
  ];

  const filteredCandidates = candidates.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container max-w-6xl space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Resumes & Screening</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage candidates and track their application stages.</p>
          </div>
        </div>
        <div className="relative z-10">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-indigo-600/20"
          >
            <Plus size={16} /> {isAdding ? 'Cancel' : 'Add Candidate'}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2">Manually Add Candidate</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Job Requisition <span className="text-rose-500">*</span></label>
              <select 
                {...register('jobId')}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Job...</option>
                {jobs?.map((j: any) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              {errors.jobId && <p className="text-xs text-rose-500">{errors.jobId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Candidate Name <span className="text-rose-500">*</span></label>
                <input 
                  {...register('name')}
                  type="text" 
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Candidate Email <span className="text-rose-500">*</span></label>
                <input 
                  {...register('email')}
                  type="email" 
                  placeholder="e.g. john@example.com"
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {createMutation.isPending ? 'Adding...' : 'Add Candidate'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">Candidates Pipeline</h3>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search candidates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors w-64" />
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
          
          <DataTable columns={columns} data={filteredCandidates} loading={isLoadingJobs} keyField="id" />
        </div>
      </div>
    </div>
  );
}
