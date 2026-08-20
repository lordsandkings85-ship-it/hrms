import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Search, Loader2, Send, Star, CheckCircle, Clock } from 'lucide-react';
import { recruitmentApi } from '../../../api/client';
import { fmtDateTime } from '../../../utils/formatDate';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';

const feedbackSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  feedback: z.string().min(5, 'Feedback is required (min 5 chars)'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function InterviewFeedbackPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackFor, setFeedbackFor] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['recruitment-interviews'],
    queryFn: () => recruitmentApi.listInterviews(),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 0, feedback: '' }
  });

  const currentRating = watch('rating');

  const feedbackMutation = useMutation({
    mutationFn: (data: FeedbackFormData) => recruitmentApi.submitFeedback(feedbackFor.id, data),
    onSuccess: () => {
      toastSuccess('Feedback submitted successfully!');
      reset();
      setFeedbackFor(null);
      queryClient.invalidateQueries({ queryKey: ['recruitment-interviews'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit feedback'),
  });

  const evaluateMutation = useMutation({
    mutationFn: (candidateId: string) => recruitmentApi.evaluateCandidate(candidateId),
    onSuccess: (res: any) => {
      toastSuccess(res.message || 'Candidate evaluated successfully!');
      queryClient.invalidateQueries({ queryKey: ['recruitment-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to evaluate candidate'),
  });

  const onSubmit = (data: FeedbackFormData) => {
    feedbackMutation.mutate(data);
  };

  const columns: Column<any>[] = [
    { key: 'candidate', header: 'Candidate', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.candidate?.name}</span> },
    { key: 'jobTitle', header: 'Applied For', render: (row: any) => <span className="text-[var(--text-primary)] text-sm">{row.candidate?.job?.title}</span> },
    { key: 'scheduledAt', header: 'Date', render: (row: any) => <span className="text-sm text-[var(--text-muted)]">{fmtDateTime(row.scheduledAt)}</span> },
    { key: 'interviewer', header: 'Interviewer', render: (row: any) => <span className="text-sm font-medium">{row.interviewer}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      row.rating ? (
        <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded font-bold flex items-center w-max gap-1">
          <CheckCircle size={12} /> Feedback Submitted
        </span>
      ) : (
        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 rounded font-bold flex items-center w-max gap-1">
          <Clock size={12} /> Pending Feedback
        </span>
      )
    )},
    { key: 'rating', header: 'Rating', render: (row: any) => (
      row.rating ? (
        <div className="flex items-center gap-1 text-amber-500">
          <Star size={14} fill="currentColor" />
          <span className="font-bold text-sm">{row.rating}/5</span>
        </div>
      ) : <span className="text-[var(--text-muted)]">-</span>
    )},
    { key: 'actions', header: 'Actions', render: (row: any) => (
      <div className="flex items-center gap-2">
        {!row.rating ? (
          <button 
            onClick={() => { setFeedbackFor(row); reset(); }}
            className="text-xs px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded font-bold flex items-center gap-1 transition-colors"
          >
            <MessageSquare size={12} /> Submit
          </button>
        ) : (
          <button 
            onClick={() => evaluateMutation.mutate(row.candidateId)}
            disabled={evaluateMutation.isPending}
            className="text-xs px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded font-bold flex items-center gap-1 transition-colors"
          >
             Evaluate Output
          </button>
        )}
      </div>
    )},
  ];

  const filteredInterviews = interviews?.filter((i: any) => i.candidate?.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container max-w-6xl space-y-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <MessageSquare size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Interview Feedback</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Submit ratings and evaluate candidates based on interviews.</p>
          </div>
        </div>
      </div>

      {feedbackFor && (
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-amber-500" /> 
            Submit Feedback: {feedbackFor.candidate?.name}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Rating <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(num => (
                  <button 
                    key={num}
                    type="button"
                    onClick={() => setValue('rating', num, { shouldValidate: true })}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                      currentRating >= num 
                        ? 'bg-amber-500 text-white border-amber-500' 
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/50'
                    }`}
                  >
                    <Star size={18} fill={currentRating >= num ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              {errors.rating && <p className="text-xs text-rose-500">{errors.rating.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">Detailed Feedback <span className="text-rose-500">*</span></label>
              <textarea 
                {...register('feedback')}
                rows={4}
                placeholder="Write your feedback..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500 resize-none"
              />
              {errors.feedback && <p className="text-xs text-rose-500">{errors.feedback.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setFeedbackFor(null)}
                className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={feedbackMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {feedbackMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {feedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">Scheduled Interviews</h3>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="text" placeholder="Search by candidate..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors w-64" />
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
          
          <DataTable columns={columns} data={filteredInterviews || []} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}
