import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plane, PlaneTakeoff } from 'lucide-react';
import { travelApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/ToastProvider';

export default function MyTravelPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const myEmpId = user?.employee?.id || '';

  const [purpose, setPurpose] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [advance, setAdvance] = useState('');

  // Fetch travel requests for this employee
  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-travel-requests', myEmpId],
    queryFn: () => travelApi.listForEmployee(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  // Submit Travel Request
  const submitTravelMutation = useMutation({
    mutationFn: travelApi.request,
    onSuccess: () => {
      toastSuccess('Travel request submitted successfully!');
      setPurpose('');
      setFromDate('');
      setToDate('');
      setAdvance('');
      queryClient.invalidateQueries({ queryKey: ['my-travel-requests', myEmpId] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit travel request'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) return toastError('Please select dates');
    submitTravelMutation.mutate({
      employeeId: myEmpId,
      fromDate,
      toDate,
      purpose,
      advance: Number(advance) || 0,
    });
  };

  return (
    <div className="page-container max-w-6xl space-y-6">
      <PageHeader
        title="My Travel Requests"
        subtitle="Log corporate business trips, request advance payments, and review trip statuses."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Travel Request Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-fit shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <PlaneTakeoff className="text-indigo-500" size={16} /> Request Travel
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">Cash Advance (₹)</label>
              <input
                type="number"
                placeholder="₹0.00"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-200 px-3 py-2 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">Purpose / Details</label>
              <textarea
                placeholder="Details of the client site trip, event details, or conference..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 mt-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitTravelMutation.isPending}
              className="btn-primary w-full text-sm font-semibold hover:scale-[1.02] transition-transform duration-300"
            >
              {submitTravelMutation.isPending ? 'Submitting request...' : 'Request Travel'}
            </button>
          </form>
        </div>

        {/* Travel Requests List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs h-fit">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Plane className="text-indigo-500" size={16} /> Travel History
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : !requests || requests.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No travel records found.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {requests.map((req: any) => (
                <div key={req.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/5 dark:bg-indigo-900/10 rounded-lg text-indigo-500 shrink-0">
                      <Plane size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-250 flex items-center gap-2">
                        <span>Trip Itinerary</span>
                        <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${
                          req.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : req.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Duration: <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{new Date(req.fromDate).toLocaleDateString('en-IN')}</span> to <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{new Date(req.toDate).toLocaleDateString('en-IN')}</span>
                        {req.advance > 0 && <span className="text-indigo-500 ml-2 font-mono font-bold">Advance: ₹{req.advance.toLocaleString('en-IN')}</span>}
                      </div>
                      {req.purpose && <p className="text-xs text-slate-400 italic mt-1 font-medium">"{req.purpose}"</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
