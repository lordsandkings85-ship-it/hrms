import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../../components/ui/PageHeader';
import { CalendarDays, AlertTriangle, Send, History, Clock } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { employeeServicesApi } from '../../../api/client';
import { Spinner } from '../../../components/ui/Spinner';
import { fmtDateCompact } from '../../../utils/formatDate';

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function MyCompOffPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['comp-off-mine', myEmpId],
    queryFn: () => employeeServicesApi.listCompOff(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const applyMutation = useMutation({
    mutationFn: (data: { employeeId: string; date: string; reason?: string }) =>
      employeeServicesApi.createCompOff(data),
    onSuccess: () => {
      success('Comp-Off (COFF) application submitted successfully!');
      setDate('');
      setReason('');
      setActiveTab('history');
      queryClient.invalidateQueries({ queryKey: ['comp-off-mine', myEmpId] });
    },
    onError: (err: any) => error(err.message || 'Failed to submit comp-off request'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason) {
      error('Please complete all form fields.');
      return;
    }
    applyMutation.mutate({ employeeId: myEmpId, date, reason });
  };

  return (
    <div className="page-container max-w-4xl space-y-6">
      <PageHeader
        title="Compensatory Off (COL/COFF)"
        subtitle="Claim credit for working on weekly-offs or holidays, and track compensatory time balances."
        icon={CalendarDays}
      />

      <div className="flex gap-1.5 p-1 bg-[var(--surface-alt)] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('apply')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'apply'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Send size={14} /> Apply COFF Credit
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History size={14} /> Application History
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'apply' && (
          <div className="max-w-xl mx-auto w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-indigo-500" /> Apply Compensatory Off Credit
            </h3>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-xs text-amber-500 leading-relaxed">
              <AlertTriangle className="shrink-0 mt-0.5" size={14} />
              <div>
                Comp-Off requests should be submitted within 7 days of working on a holiday/weekly-off. All applications are routed to your direct reporting manager for review.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Worked Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Justification & Work Details</label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the tasks completed and state why holiday/weekly-off working was required..."
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={applyMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-500/20 disabled:opacity-60"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Claim Request'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">
              COL/COFF Requests Log
            </h3>

            {isLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">No comp-off applications yet.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {history.map((row: any) => (
                  <div key={row.id} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text-primary)]">
                        {fmtDateCompact(row.date)}
                      </div>
                      {row.reason && (
                        <div className="text-[var(--text-muted)] mt-1 font-medium flex items-center gap-1.5">
                          <Clock size={12} /> {row.reason}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[row.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
