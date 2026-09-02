import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CalendarDays, Calendar, FileText, CalendarPlus, CheckCircle2, Clock, XCircle, Send, Award
} from 'lucide-react';
import { leaveApi, employeeServicesApi } from '../../../api/client';
import { fmtDate, fmtDateFull } from '../../../utils/formatDate';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/ToastProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isHalfDay: z.boolean().default(false),
  reason: z.string().optional(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

type LeaveFormData = z.infer<typeof schema>;

type TabKey = 'apply' | 'history' | 'balances' | 'holidays';

const SUB_TO_TAB: Record<string, TabKey> = {
  apply: 'apply',
  requests: 'history',
  balances: 'balances',
  holidays: 'holidays'
};

const TAB_TO_SUB: Record<TabKey, string> = {
  apply: 'apply',
  history: 'requests',
  balances: 'balances',
  holidays: 'holidays'
};

export default function MyLeavePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const myEmpId = user?.employee?.id || '';
  const initialTab = sub ? SUB_TO_TAB[sub] || 'apply' : 'apply';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (sub && SUB_TO_TAB[sub]) {
      setTab(SUB_TO_TAB[sub]);
    }
  }, [sub]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/leave/${TAB_TO_SUB[t]}`);
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<LeaveFormData>({
    resolver: zodResolver(schema),
    defaultValues: { isHalfDay: false, reason: '' }
  });

  // Fetching
  const { data: leaveTypes } = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.listTypes() });
  const { data: myLeaveHistory, isLoading: isLoadingHistory } = useQuery({ 
    queryKey: ['leave-history', myEmpId], 
    queryFn: () => leaveApi.listForEmployee(myEmpId), 
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });
  const { data: balances, isLoading: isLoadingBalances } = useQuery({ 
    queryKey: ['leave-balances', myEmpId], 
    queryFn: () => leaveApi.balances(myEmpId), 
    enabled: !!myEmpId 
  });
  const { data: holidays } = useQuery({ queryKey: ['holidays-list'], queryFn: () => leaveApi.listHolidays() });
  const { data: monthlyCL, isLoading: isLoadingMonthlyCL } = useQuery({
    queryKey: ['leave-monthly-mine', myEmpId],
    queryFn: () => leaveApi.monthlyBalances(myEmpId),
    enabled: !!myEmpId,
  });
  const { data: compOffBalance, isLoading: isLoadingCompOff } = useQuery({
    queryKey: ['comp-off-balance-mine', myEmpId],
    queryFn: () => employeeServicesApi.listCompOffBalances(myEmpId),
    enabled: !!myEmpId,
  });

  // Mutations
  const applyLeaveMutation = useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => {
      toastSuccess('Leave applied successfully!');
      reset();
      queryClient.invalidateQueries({ queryKey: ['leave-history', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances', myEmpId] });
      handleTabChange('history');
    },
    onError: (err: any) => toastError(err.message || 'Failed to apply leave'),
  });

  const cancelLeaveMutation = useMutation({
    mutationFn: ({ id }: { id: string; isApproved: boolean }) => leaveApi.cancel(id),
    onSuccess: (_data, vars) => {
      toastSuccess(vars.isApproved ? 'Cancellation requested! Awaiting approval.' : 'Leave cancelled successfully!');
      queryClient.invalidateQueries({ queryKey: ['leave-history', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['cancel-leave-approvals'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to cancel leave'),
  });

  const onSubmit = (data: LeaveFormData) => {
    applyLeaveMutation.mutate({
      employeeId: myEmpId,
      ...data,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Leaves & Time Off" 
        subtitle="Manage your leave applications, check balances, and view scheduled holidays."
        icon={CalendarDays}
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-alt)] rounded-xl w-fit flex-wrap">
        {([
          ['apply', 'Apply Leave', CalendarPlus],
          ['history', 'Leave History', FileText],
          ['balances', 'My Balance', CalendarDays],
          ['holidays', 'Holidays', Calendar]
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Apply Leave */}
        {tab === 'apply' && (
          <div className="max-w-xl mx-auto w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <CalendarPlus size={16} className="text-indigo-500" /> New Leave Application
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Leave Type</label>
                <select
                  {...register('leaveTypeId')}
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} {lt.paid ? '(Paid)' : '(Unpaid)'}
                    </option>
                  ))}
                </select>
                {errors.leaveTypeId && <p className="text-xs text-red-500 mt-1">{errors.leaveTypeId.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Start Date</label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                  />
                  {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">End Date</label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                  />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfday"
                  {...register('isHalfDay')}
                  className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="halfday" className="text-xs font-semibold text-[var(--text-muted)] select-none">
                  Apply as Half Day Leave
                </label>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Reason (Optional)</label>
                <textarea
                  rows={3}
                  {...register('reason')}
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none resize-none"
                  placeholder="Provide reason for leave request..."
                />
                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
              </div>

              <button
                type="submit"
                disabled={applyLeaveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={15} /> {applyLeaveMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" /> My Leave Requests
            </h3>
            {isLoadingHistory ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : !myLeaveHistory || myLeaveHistory.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">No leave requests found.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {myLeaveHistory.map((row: any) => {
                  const statusColors: Record<string, { badge: string, icon: React.ElementType }> = {
                    pending: { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
                    approved: { badge: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
                    rejected: { badge: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
                    cancelled: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle }
                  };
                  const cfg = statusColors[row.status] || { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Clock };
                  const Icon = cfg.icon;
                  return (
                    <div key={row.id} className="py-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="font-semibold text-sm text-[var(--text-primary)]">
                          {row.leaveType?.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {fmtDate(row.startDate)} to {fmtDate(row.endDate)}
                          {row.isHalfDay && ' (Half Day)'}
                        </div>
                        {row.reason && (
                          <div className="text-xs text-[var(--text-muted)] italic mt-1 font-mono">
                            "{row.reason}"
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
                          <Icon size={11} />
                          {row.status}
                        </span>
                        {row.status === 'pending' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this leave application?')) {
                                cancelLeaveMutation.mutate({ id: row.id, isApproved: false });
                              }
                            }}
                            disabled={cancelLeaveMutation.isPending}
                            className="text-xs text-rose-500 hover:text-rose-600 font-bold transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        {row.status === 'approved' && row.cancellationPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <Clock size={11} /> Cancellation Pending
                          </span>
                        )}
                        {row.status === 'approved' && !row.cancellationPending && (
                          <button
                            onClick={() => {
                              if (window.confirm('Request cancellation of this approved leave? HR approval is required.')) {
                                cancelLeaveMutation.mutate({ id: row.id, isApproved: true });
                              }
                            }}
                            disabled={cancelLeaveMutation.isPending}
                            className="text-xs text-indigo-500 hover:text-indigo-600 font-bold transition-colors disabled:opacity-50"
                          >
                            Request Cancellation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Balances */}
        {tab === 'balances' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-indigo-500" /> Leave Balance
            </h3>

            {(monthlyCL && monthlyCL.length > 0 || compOffBalance != null) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {monthlyCL && monthlyCL.length > 0 && (
                  <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-[var(--text-primary)]">Monthly Casual Leave</p>
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Ledger</span>
                    </div>
                    {isLoadingMonthlyCL ? (
                      <div className="flex justify-center py-4"><Spinner /></div>
                    ) : (
                      <div className="space-y-2">
                        {[...monthlyCL].reverse().slice(0, 4).map((row: any) => (
                          <div key={`${row.leaveTypeId}-${row.year}-${row.month}`} className="flex items-center justify-between text-xs rounded-lg px-3 py-2 border border-[var(--border)] bg-[var(--surface-alt)]">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {new Date(row.year, row.month - 1, 1).toLocaleString('en-IN', { month: 'short' })} {row.year}
                            </span>
                            <span className="text-[var(--text-muted)]">
                              {row.allocated > 0 ? `+${row.allocated} credited` : 'no credit'}
                              {row.taken > 0 ? ` · ${row.taken} taken` : ''}
                              {row.pending > 0 ? ` · ${row.pending} pending` : ''}
                            </span>
                            <span className="font-mono font-bold text-indigo-400">{row.remaining} left</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {compOffBalance != null && (
                  <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Award size={15} className="text-emerald-500" /> Comp Off Balance
                      </p>
                      <span className="font-mono text-2xl font-black text-emerald-400">{compOffBalance.available ?? 0}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Earned from second-Saturday / weekend work. Available to apply as a compensated day off.
                    </p>
                    {!isLoadingCompOff && Array.isArray(compOffBalance.credits) && compOffBalance.credits.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {compOffBalance.credits.slice(0, 3).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)]">
                            <span className="text-[var(--text-secondary)]">
                              {c.attendanceLog?.date ? fmtDate(c.attendanceLog.date) : 'Weekend work'}
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {c.creditAmount - c.consumedAmount} day(s)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoadingBalances ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : !balances || balances.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">No leave balance metrics found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {balances.map((bal: any) => {
                  const used = bal.used ?? 0;
                  const allotted = bal.allotted ?? 0;
                  const carriedOver = bal.carriedOver ?? 0;
                  const remaining = bal.remaining ?? Math.max(0, allotted + carriedOver - used);
                  const total = allotted + carriedOver;
                  const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
                  return (
                    <div key={bal.id} className="p-4 border border-[var(--border)] rounded-2xl bg-[var(--surface-alt)] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{bal.leaveType?.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-0.5">Year: {bal.year}</p>
                        </div>
                        <span className="text-2xl font-black text-indigo-400 font-mono">{remaining}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                          <span>{used} Used</span>
                          <span>{total} Available</span>
                        </div>
                      </div>
                      <div className="flex gap-3 text-[10px] font-bold">
                        <span className="text-[var(--text-muted)]">Allocated: <span className="text-[var(--text-primary)]">{allotted}</span></span>
                        {carriedOver > 0 && <span className="text-sky-500">Carry Fwd: {carriedOver}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Holidays */}
        {tab === 'holidays' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" /> Holiday Calendar
            </h3>
            {!holidays || holidays.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">No holidays declared yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {holidays.map((h: any) => (
                  <div key={h.id} className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[var(--text-primary)]">{h.name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {fmtDateFull(h.date)}
                      </div>
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
