import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Award, CheckCircle2, ChevronRight } from 'lucide-react';
import { performanceApi, employeesApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

export default function PerformancePage() {
  const queryClient = useQueryClient();
  const [selectedEmp, setSelectedEmp] = useState('');

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalDueDate, setGoalDueDate] = useState('');

  // Review Form State
  const [cycle, setCycle] = useState('H1-2026');
  const [reviewType, setReviewType] = useState('manager');
  const [score, setScore] = useState(4);
  const [comments, setComments] = useState('');

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  // Fetch goals
  const { data: goals, refetch: refetchGoals } = useQuery({
    queryKey: ['performance-goals', selectedEmp],
    queryFn: () => performanceApi.listGoals(selectedEmp),
    enabled: !!selectedEmp,
  });

  // Fetch reviews
  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['performance-reviews', selectedEmp],
    queryFn: () => performanceApi.listReviews(selectedEmp),
    enabled: !!selectedEmp,
  });

  // Create Goal
  const createGoalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.createGoal(selectedEmp, data),
    onSuccess: () => {
      alert('Goal set!');
      setGoalTitle('');
      setGoalDesc('');
      setGoalDueDate('');
      refetchGoals();
    },
  });

  // Update Progress
  const updateProgressMutation = useMutation({
    mutationFn: (data: { goalId: string; progress: number }) =>
      performanceApi.updateProgress(data.goalId, data.progress),
    onSuccess: () => {
      refetchGoals();
    },
  });

  // Submit Review
  const submitReviewMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitReview(selectedEmp, data),
    onSuccess: () => {
      alert('Review submitted!');
      setComments('');
      refetchReviews();
    },
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !goalTitle.trim()) return;
    createGoalMutation.mutate({ title: goalTitle, description: goalDesc, dueDate: goalDueDate });
  };

  const handleProgressChange = (goalId: string, val: string) => {
    updateProgressMutation.mutate({ goalId, progress: Number(val) });
  };

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    submitReviewMutation.mutate({
      cycle,
      type: reviewType,
      score: Number(score),
      comments,
    });
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Performance Management"
          subtitle="Set goals, track OKRs, and run 360-degree review cycles."
          icon={TrendingUp}
        />
      </div>

      <div className="mb-6 max-w-sm">
        <label className="block text-xs text-muted mb-1">Select Employee context</label>
        <select
          value={selectedEmp}
          onChange={(e) => setSelectedEmp(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
        >
          <option value="">-- Choose Employee --</option>
          {employees?.items.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.firstName} {emp.lastName}
            </option>
          ))}
        </select>
      </div>

      {selectedEmp ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Target Goals */}
          <div className="space-y-8">
            <div className="section-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-ledger" size={18} /> Set Employee Goal
              </h2>
              <form onSubmit={handleCreateGoal} className="space-y-3">
                <div>
                  <label className="block text-xs text-muted mb-0.5">Title</label>
                  <input type="text" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required className="w-full border border-line px-2 py-1.5 rounded text-sm" placeholder="e.g. Achieve 99.9% Server Uptime" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Due Date</label>
                    <input type="date" value={goalDueDate} onChange={(e) => setGoalDueDate(e.target.value)} className="w-full border border-line px-2 py-1 rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Description</label>
                    <input type="text" value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} className="w-full border border-line px-2 py-1 rounded text-xs" placeholder="Deliverables..." />
                  </div>
                </div>
                <button type="submit" className="w-full bg-ledger text-paper rounded py-2 text-xs font-semibold">Assign Goal KRA</button>
              </form>
            </div>

            {/* Goals list */}
            <div className="section-card overflow-hidden">
              <div className="px-6 py-4 border-b border-line bg-paper/20">
                <h3 className="text-sm font-semibold">Assigned OKRs &amp; Goals</h3>
              </div>
              <div className="divide-y divide-line p-4 space-y-4">
                {(!goals || goals.length === 0) && (
                  <div className="text-xs text-muted text-center py-4">No active performance goals mapped to this employee.</div>
                )}
                {goals?.map((g: any) => (
                  <div key={g.id} className="pb-3 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-ink">{g.title}</div>
                        {g.description && <div className="text-xs text-muted">{g.description}</div>}
                        {g.dueDate && <div className="text-[10px] text-rust mt-0.5">Due: {new Date(g.dueDate).toLocaleDateString()}</div>}
                      </div>
                      <span className="font-mono text-xs font-semibold">{g.progress}%</span>
                    </div>
                    {/* Range progress selector */}
                    <div className="mt-2 flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={g.progress}
                        onChange={(e) => handleProgressChange(g.id, e.target.value)}
                        className="flex-1 accent-ledger h-1.5 bg-paper rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Performance Appraisal Reviews */}
          <div className="space-y-8">
            <div className="section-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="text-ledger" size={18} /> Submit Review Appraisal
              </h2>
              <form onSubmit={handleCreateReview} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Cycle</label>
                    <input type="text" value={cycle} onChange={(e) => setCycle(e.target.value)} required className="w-full border border-line px-2 py-1 rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Type</label>
                    <select value={reviewType} onChange={(e) => setReviewType(e.target.value)} className="w-full border border-line px-2 py-1 rounded text-xs">
                      <option value="self">Self Evaluation</option>
                      <option value="manager">Manager Audit</option>
                      <option value="peer">Peer Review</option>
                      <option value="360">360 Degree</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-0.5">Score (1-5)</label>
                    <input type="number" min="1" max="5" value={score} onChange={(e) => setScore(Number(e.target.value))} required className="w-full border border-line px-2 py-1 rounded text-xs font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">Comments &amp; Summary</label>
                  <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} required className="w-full border border-line px-2 py-1 rounded text-xs" placeholder="Qualitative summary of strengths and core feedback targets..." />
                </div>
                <button type="submit" className="w-full bg-ink text-paper rounded py-2 text-xs font-semibold hover:bg-ink/90">Record Review</button>
              </form>
            </div>

            {/* Appraisal Logs */}
            <div className="section-card overflow-hidden">
              <div className="px-6 py-4 border-b border-line bg-paper/20">
                <h3 className="text-sm font-semibold">Review Logs</h3>
              </div>
              <div className="divide-y divide-line">
                {(!reviews || reviews.length === 0) && (
                  <div className="p-6 text-xs text-muted text-center">No reviews submitted yet for this cycle.</div>
                )}
                {reviews?.map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-paper/40">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs text-muted">
                        <span className="font-semibold text-ink uppercase">{r.cycle}</span> &bull; <span className="capitalize">{r.type} Appraisal</span>
                      </div>
                      <span className="bg-ledger/10 text-ledger px-2 py-0.5 rounded text-xs font-bold font-mono">Score: {r.score} / 5</span>
                    </div>
                    <p className="text-xs text-ink mt-1.5 italic font-body">"{r.comments}"</p>
                    <div className="text-[10px] text-muted mt-2">Recorded on {new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="section-card p-8 text-center text-sm text-muted">
          Please select an employee profile to inspect goal indices and appraisal metrics.
        </div>
      )}
    </div>
  );
}

