import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Calendar, Plus, Loader2, Search, Send, Clock, CheckCircle } from 'lucide-react';
import { recruitmentApi } from '../../../api/client';
import { fmtDateTime } from '../../../utils/formatDate';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';

const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, 'Date & Time is required'),
  interviewer: z.string().min(2, 'Interviewer name is required'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export default function InterviewSchedulePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [schedulingFor, setSchedulingFor] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['recruitment-jobs'],
    queryFn: () => recruitmentApi.listJobs(),
  });

  const interviewingCandidates = useMemo(() => {
    if (!jobs) return [];
    return jobs.flatMap((j: any) => 
      j.candidates?.filter((c: any) => c.stage === 'interviewing').map((c: any) => ({ ...c, jobTitle: j.title })) || []
    );
  }, [jobs]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: ScheduleFormData) => recruitmentApi.scheduleInterview(schedulingFor.id, data),
    onSuccess: () => {
      toastSuccess('Interview scheduled successfully!');
      reset();
      setSchedulingFor(null);
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-interviews'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to schedule interview'),
  });

  const onSubmit = (data: ScheduleFormData) => {
    scheduleMutation.mutate(data);
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Candidate', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.name}</span> },
    { key: 'jobTitle', header: 'Applied For', render: (row: any) => <span className="text-[var(--text-primary)] text-sm">{row.jobTitle}</span> },
    { key: 'status', header: 'Interview Status', render: (row: any) => (
      row.interview?.length > 0 ? (
        <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded font-bold flex items-center w-max gap-1">
          <CheckCircle size={12} /> Scheduled
        </span>
      ) : (
        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 rounded font-bold flex items-center w-max gap-1">
          <Clock size={12} /> Pending Schedule
        </span>
      )
    )},
    { key: 'interviews', header: 'Details', render: (row: any) => {
      if (!row.interview || row.interview.length === 0) return <span className="text-[var(--text-muted)] text-xs">-</span>;
      const latest = row.interview[row.interview.length - 1];
      return (
        <div className="text-xs space-y-0.5">
          <div className="text-[var(--text-primary)] font-medium">{fmtDateTime(latest.scheduledAt)}</div>
          <div className="text-[var(--text-muted)]">With: {latest.interviewer}</div>
        </div>
      );
    }},
    { key: 'actions', header: 'Actions', render: (row: any) => (
      <button 
        onClick={() => { setSchedulingFor(row); reset(); }}
        className="text-xs px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded font-bold flex items-center gap-1 transition-colors"
      >
        <Calendar size={12} /> Schedule
      </button>
    )},
  ];

  const filteredCandidates = interviewingCandidates.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container max-w-6xl space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Interview Scheduling</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Schedule interviews for candidates in the interviewing stage.</p>
          </div>
        </div>
      </div>

      {schedulingFor && (
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" /> 
            Schedule Interview: {schedulingFor.name}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Date & Time <span className="text-rose-500">*</span></label>
                <input 
                  {...register('scheduledAt')}
                  type="datetime-local" 
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                {errors.scheduledAt && <p className="text-xs text-rose-500">{errors.scheduledAt.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Interviewer <span className="text-rose-500">*</span></label>
                <input 
                  {...register('interviewer')}
                  type="text" 
                  placeholder="e.g. Jane Smith"
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                {errors.interviewer && <p className="text-xs text-rose-500">{errors.interviewer.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setSchedulingFor(null)}
                className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={scheduleMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {scheduleMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">Candidates for Interview</h3>
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
          
          <DataTable columns={columns} data={filteredCandidates} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}
