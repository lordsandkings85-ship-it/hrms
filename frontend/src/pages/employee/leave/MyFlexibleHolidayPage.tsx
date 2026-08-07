import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Calendar, CheckCircle2, RefreshCw } from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { employeeServicesApi, leaveApi } from '../../../api/client';
import { Spinner } from '../../../components/ui/Spinner';

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function MyFlexibleHolidayPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const [selectedHolidayId, setSelectedHolidayId] = useState('');

  const { data: flexibleHolidays = [], isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['holidays-list'],
    queryFn: () => leaveApi.listHolidays(),
  });
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['flexible-holiday-mine', myEmpId],
    queryFn: () => employeeServicesApi.listFlexibleHolidays(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const applyMutation = useMutation({
    mutationFn: (data: { employeeId: string; date: string; holidayName?: string; reason?: string }) =>
      employeeServicesApi.createFlexibleHoliday(data),
    onSuccess: (_d, vars) => {
      const holiday = flexibleHolidays.find((h: any) => h.id === selectedHolidayId);
      success(`Flexible holiday request for "${holiday?.name || vars.holidayName}" submitted successfully!`);
      setSelectedHolidayId('');
      queryClient.invalidateQueries({ queryKey: ['flexible-holiday-mine', myEmpId] });
    },
    onError: (err: any) => error(err.message || 'Failed to submit flexible holiday request'),
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const holiday = flexibleHolidays.find((h: any) => h.id === selectedHolidayId);
    if (!holiday) {
      error('Please select a flexible holiday.');
      return;
    }
    applyMutation.mutate({
      employeeId: myEmpId,
      date: holiday.date,
      holidayName: holiday.name,
    });
  };

  return (
    <div className="page-container max-w-4xl space-y-6">
      <PageHeader
        title="Flexible / Optional Holidays"
        subtitle="Submit selection requests for restricted/optional holidays from the approved corporate schedule."
        icon={Calendar}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selection Form */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" /> Apply Restricted Holiday
          </h3>

          <form onSubmit={handleApply} className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Select Optional Holiday</label>
              <select
                value={selectedHolidayId}
                onChange={(e) => setSelectedHolidayId(e.target.value)}
                className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2.5 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                required
              >
                <option value="">Choose holiday option...</option>
                {isLoadingHolidays ? (
                  <option disabled>Loading holidays...</option>
                ) : (
                  flexibleHolidays
                    .filter((h: any) => h.type === 'restricted' || h.type === 'optional' || true)
                    .map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                      </option>
                    ))
                )}
              </select>
            </div>

            <button
              type="submit"
              disabled={applyMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-500/20 disabled:opacity-60"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Request Holiday Leave'}
            </button>
          </form>
        </div>

        {/* Status Tracker */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">
            Selection Status History
          </h3>

          <div className="divide-y divide-[var(--border)]">
            {isLoadingRequests ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : requests.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">No previous restriction selections recorded.</p>
            ) : (
              requests.map((r: any) => (
                <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{r.holidayName || 'Restricted holiday request'}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Date: {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_STYLES[r.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {r.status === 'approved' && <CheckCircle2 size={10} />}
                      {r.status === 'pending' && <RefreshCw size={10} />}
                      {r.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
