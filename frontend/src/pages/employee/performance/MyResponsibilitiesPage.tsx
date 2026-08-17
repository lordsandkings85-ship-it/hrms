import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target, Star, Award, TrendingUp, BarChart2, CheckCircle,
  Clock, Plus, Edit3, ChevronRight, Loader2, Trophy, Activity
} from 'lucide-react';
import { performanceApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastProvider';

type TabKey = 'kpis' | 'kras' | 'evaluate' | 'scorecard';

const SCORE_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500'];

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[var(--surface-alt)] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{score}/{max}</span>
    </div>
  );
}

function RatingStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className={`transition-transform hover:scale-110 ${onChange ? 'cursor-pointer' : 'cursor-default'}`}>
          <Star size={20} fill={(hover || value) >= i ? '#f59e0b' : 'none'}
            className={(hover || value) >= i ? 'text-amber-400' : 'text-slate-600'} />
        </button>
      ))}
    </div>
  );
}

export default function MyResponsibilitiesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const myEmpId = user?.employee?.id || '';

  const subToTab: Record<string, TabKey> = {
    kpi: 'kpis', kra: 'kras', evaluation: 'evaluate', scorecard: 'scorecard'
  };
  const initialTab: TabKey = sub ? subToTab[sub] || 'kpis' : 'kpis';
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Self-evaluation state
  const [evalCycle, setEvalCycle] = useState('H1-2026');
  const [evalScore, setEvalScore] = useState(3);
  const [evalComments, setEvalComments] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');

  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['my-goals', myEmpId],
    queryFn: () => performanceApi.listGoals(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['my-reviews', myEmpId],
    queryFn: () => performanceApi.listReviews(myEmpId),
    enabled: !!myEmpId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ goalId, progress }: { goalId: string; progress: number }) =>
      performanceApi.updateProgress(goalId, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goals', myEmpId] });
      toastSuccess('Progress updated!');
    },
    onError: (err: any) => toastError(err.message || 'Failed to update'),
  });

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', dueDate: '' });
  const createGoalMutation = useMutation({
    mutationFn: () => performanceApi.createGoal(myEmpId, {
      title: goalForm.title,
      ...(goalForm.description ? { description: goalForm.description } : {}),
      ...(goalForm.dueDate ? { dueDate: goalForm.dueDate } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goals', myEmpId] });
      toastSuccess('KPI added');
      setGoalModalOpen(false);
      setGoalForm({ title: '', description: '', dueDate: '' });
    },
    onError: (err: any) => toastError(err.message || 'Failed to create KPI'),
  });

  const submitEvalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitReview(myEmpId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews', myEmpId] });
      toastSuccess('Self-evaluation submitted!');
      setEvalComments(''); setStrengths(''); setImprovements('');
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit'),
  });

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    const tabToSub: Record<TabKey, string> = { kpis: 'kpi', kras: 'kra', evaluate: 'evaluation', scorecard: 'scorecard' };
    navigate(`/performance/${tabToSub[t]}`);
  };

  const goalList: any[] = Array.isArray(goals) ? goals : [];
  const reviewList: any[] = Array.isArray(reviews) ? reviews : [];

  // Computed scorecard
  const avgScore = reviewList.length > 0
    ? (reviewList.reduce((sum, r) => sum + (r.score || 0), 0) / reviewList.length).toFixed(1)
    : '–';

  const TABS = [
    { key: 'kpis' as TabKey, label: 'KPIs', icon: Target },
    { key: 'kras' as TabKey, label: 'KRAs', icon: Activity },
    { key: 'evaluate' as TabKey, label: 'Self Appraisal', icon: Edit3 },
    { key: 'scorecard' as TabKey, label: 'My Scorecard', icon: Trophy },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Responsibilities & Performance"
        subtitle="Track your KPIs, KRAs, and complete self-appraisal evaluations"
        icon={Target}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active KPIs', value: goalList.filter(g => g.type === 'kpi').length || goalList.length, icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/5' },
          { label: 'Active KRAs', value: goalList.filter(g => g.type === 'kra').length || 0, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/5' },
          { label: 'Appraisal Cycles', value: reviewList.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/5' },
          { label: 'Avg. Score', value: avgScore, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/5' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-xl bg-[var(--surface)] ${c.color}`}><c.icon size={18} /></div>
            <div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-alt)] rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* KPIs Tab */}
      {tab === 'kpis' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">KPI Goals</h3>
            <button
              onClick={() => setGoalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors"
            >
              <Plus size={14} /> Add KPI
            </button>
          </div>
          {loadingGoals ? <Spinner /> : goalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[var(--text-muted)]">
              <Target size={32} className="opacity-30" />
              <p className="text-sm">No KPIs yet. Add your first KPI to start tracking progress.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {goalList.map((goal: any) => (
                <div key={goal.id} className="border border-[var(--border)] rounded-2xl p-5 bg-[var(--surface)] hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">{goal.title || goal.name || 'KPI Goal'}</h4>
                      <p className="text-sm text-[var(--text-muted)] mt-1">{goal.description || 'No description provided'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        goal.progress >= 100 ? 'bg-green-500/10 text-green-400' :
                        goal.progress >= 50 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {goal.progress >= 100 ? 'Completed' : goal.progress >= 50 ? 'On Track' : 'Behind'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>Progress</span>
                      <span>{goal.progress ?? 0}%</span>
                    </div>
                    <div className="h-2 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${goal.progress ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <input type="range" min={0} max={100} step={5}
                      defaultValue={goal.progress ?? 0}
                      onChange={e => updateProgressMutation.mutate({ goalId: goal.id, progress: parseInt(e.target.value) })}
                      className="flex-1 accent-indigo-500" />
                    <span className="text-xs text-[var(--text-muted)]">Update progress</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KRAs Tab */}
      {tab === 'kras' && (
        <div className="space-y-4">
          {loadingGoals ? <Spinner /> : goalList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[var(--text-muted)]">
              <Activity size={32} className="opacity-30" />
              <p className="text-sm">No KRAs assigned. Your manager will assign key result areas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goalList.map((goal: any, idx: number) => (
                <div key={goal.id} className="border border-[var(--border)] rounded-2xl p-5 bg-[var(--surface)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] text-sm">{goal.title || goal.name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">Weight: {goal.weight || 10}%</p>
                    </div>
                  </div>
                  <ScoreBar score={goal.score || 0} max={5} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Self-Evaluation Tab */}
      {tab === 'evaluate' && (
        <div className="max-w-2xl">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/5 to-transparent">
              <h3 className="font-semibold text-[var(--text-primary)]">Self-Appraisal Submission</h3>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">Evaluate your own performance for the current appraisal cycle</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); submitEvalMutation.mutate({ cycle: evalCycle, score: evalScore, comments: evalComments, strengths, improvements }); }}
              className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Appraisal Cycle</label>
                <select value={evalCycle} onChange={e => setEvalCycle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                  {['H1-2026', 'H2-2025', 'Annual 2025', 'Q1-2026', 'Q2-2026'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Overall Self-Rating</label>
                <RatingStars value={evalScore} onChange={setEvalScore} />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {['', 'Needs Improvement', 'Below Expectations', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'][evalScore]}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Key Strengths</label>
                <textarea value={strengths} onChange={e => setStrengths(e.target.value)} rows={3}
                  placeholder="Describe your key achievements and strengths this period..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Areas for Improvement</label>
                <textarea value={improvements} onChange={e => setImprovements(e.target.value)} rows={3}
                  placeholder="What areas would you like to develop in the next cycle?"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Additional Comments</label>
                <textarea value={evalComments} onChange={e => setEvalComments(e.target.value)} rows={3}
                  placeholder="Any other comments for your manager..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
              </div>
              <button type="submit" disabled={submitEvalMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                {submitEvalMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                {submitEvalMutation.isPending ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scorecard Tab */}
      {tab === 'scorecard' && (
        <div className="space-y-4">
          {loadingReviews ? <Spinner /> : reviewList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[var(--text-muted)]">
              <Trophy size={32} className="opacity-30" />
              <p className="text-sm">No appraisal cycles completed yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reviewList.map((review: any) => (
                <div key={review.id} className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--surface)]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">{review.cycle || 'Appraisal Review'}</h4>
                      <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        {review.reviewedAt ? `Reviewed: ${new Date(review.reviewedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : 'Pending review'}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-indigo-400">{review.score || 0}</div>
                      <div className="text-xs text-[var(--text-muted)]">/ 5</div>
                    </div>
                  </div>
                  <ScoreBar score={review.score || 0} />
                  {review.comments && (
                    <div className="mt-4 p-3 rounded-xl bg-[var(--surface-alt)] text-sm text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-primary)]">Manager Feedback: </span>
                      {review.comments}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Add KPI Goal" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Title</label>
            <input
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              placeholder="e.g. Achieve 95% attendance this quarter"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
            <textarea
              value={goalForm.description}
              onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              rows={3}
              placeholder="Optional — add context or expected outcome..."
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Due Date</label>
            <input
              type="date"
              value={goalForm.dueDate}
              onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <button
            onClick={() => createGoalMutation.mutate()}
            disabled={!goalForm.title.trim() || createGoalMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            {createGoalMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {createGoalMutation.isPending ? 'Adding...' : 'Add KPI'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
