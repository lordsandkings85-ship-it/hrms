import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogOut, AlertTriangle, FileText, MessageSquare, CheckCircle,
  Clock, ChevronRight, Loader2, ArrowLeft, Shield, Users,
  Calendar, Send, Download
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../components/ui/ToastProvider';
import { exitApi } from '../../../api/client';
import { Spinner } from '../../../components/ui/Spinner';

type TabKey = 'request' | 'clearance' | 'interview';

const EXIT_QUESTIONS = [
  { id: 'q1', question: 'What is your primary reason for leaving?', type: 'select', options: ['Better opportunity', 'Compensation', 'Work environment', 'Personal reasons', 'Career growth', 'Relocation', 'Other'] },
  { id: 'q2', question: 'How would you rate your overall experience at the company?', type: 'rating' },
  { id: 'q3', question: 'How was your relationship with your immediate manager?', type: 'rating' },
  { id: 'q4', question: 'What did you enjoy most about working here?', type: 'text' },
  { id: 'q5', question: 'What could we have done differently to retain you?', type: 'text' },
  { id: 'q6', question: 'Would you recommend this company to others?', type: 'select', options: ['Definitely yes', 'Probably yes', 'Not sure', 'Probably no', 'Definitely no'] },
  { id: 'q7', question: 'Any other feedback or suggestions?', type: 'text' },
];

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}
          className={`w-9 h-9 rounded-xl border text-sm font-semibold transition-all ${
            value >= i
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-indigo-500/50'
          }`}>
          {i}
        </button>
      ))}
      <span className="text-xs text-[var(--text-muted)] ml-2">
        {value === 0 ? '' : ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][value]}
      </span>
    </div>
  );
}

export default function MySeparationPage() {
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const myEmpId = user?.employee?.id || '';

  const subToTab: Record<string, TabKey> = {
    exit: 'request', clearance: 'clearance', interview: 'interview'
  };
  const [tab, setTab] = useState<TabKey>(sub ? subToTab[sub] || 'request' : 'request');

  // Request form state
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [resignReason, setResignReason] = useState('');
  const [resignNotes, setResignNotes] = useState('');

  // Exit interview state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [interviewSubmitted, setInterviewSubmitted] = useState(false);

  // Fetch active separation request
  const { data: request, isLoading } = useQuery({
    queryKey: ['my-separation-request', myEmpId],
    queryFn: () => exitApi.get(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 30_000
  });

  const initiateMutation = useMutation({
    mutationFn: (data: { employeeId: string; resignationDate: string; lastWorkingDay: string; reason?: string }) => 
      exitApi.initiate(data),
    onSuccess: () => {
      toastSuccess('Resignation request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['my-separation-request', myEmpId] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to submit resignation');
    }
  });

  const saveInterviewMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => exitApi.saveInterview(id, note),
    onSuccess: () => {
      setInterviewSubmitted(true);
      toastSuccess('Exit interview submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['my-separation-request', myEmpId] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to submit interview');
    }
  });

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    const map: Record<TabKey, string> = { request: 'exit', clearance: 'exit/clearance', interview: 'exit/interview' };
    navigate(`/${map[t]}`);
  };

  const handleResignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resignReason || !lastWorkingDay) { toastError('Please fill all required fields'); return; }
    initiateMutation.mutate({
      employeeId: myEmpId,
      resignationDate: new Date().toISOString().split('T')[0],
      lastWorkingDay,
      reason: resignReason + (resignNotes ? `: ${resignNotes}` : '')
    });
  };

  const handleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request?.id) {
      toastError('No active separation record found to attach interview');
      return;
    }
    const noteText = JSON.stringify(answers);
    saveInterviewMutation.mutate({ id: request.id, note: noteText });
  };

  const TABS = [
    { key: 'request' as TabKey, label: 'Resignation Request', icon: LogOut },
    { key: 'clearance' as TabKey, label: 'Department Clearance', icon: Shield },
    { key: 'interview' as TabKey, label: 'Exit Interview', icon: MessageSquare },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center"><Spinner /></div>
    );
  }

  const checklistItems = request?.checklists || [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Separation Management"
        subtitle="Manage your offboarding process, clearance, and exit interview"
        icon={LogOut}
      />

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-400">Important Notice</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Once a resignation is submitted, HR will review and process your request. Please ensure you complete all steps in the offboarding checklist.</p>
        </div>
      </div>

      {/* Process Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { step: 1, label: 'Submit Request', done: !!request },
          { step: 2, label: 'Manager Approval', done: request?.status === 'approved' || request?.status === 'clearance' },
          { step: 3, label: 'HR Processing', done: request?.status === 'clearance' },
          { step: 4, label: 'Dept. Clearance', done: checklistItems.length > 0 && checklistItems.every((c: any) => !!c.completedAt) },
          { step: 5, label: 'Exit Interview', done: interviewSubmitted || !!request?.exitInterviewNote },
          { step: 6, label: 'FnF Settlement', done: request?.status === 'settled' },
        ].map((s, idx, arr) => (
          <div key={s.step} className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s.done ? 'bg-green-500 text-white' : 'bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text-muted)]'
              }`}>
                {s.done ? <CheckCircle size={14} /> : s.step}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1 whitespace-nowrap">{s.label}</div>
            </div>
            {idx < arr.length - 1 && <div className="w-8 h-px bg-[var(--border)] mb-4" />}
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

      {/* Request Tab */}
      {tab === 'request' && (
        <div className="max-w-2xl">
          {request ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Resignation Request Submitted</h3>
              <p className="text-sm text-[var(--text-muted)]">Your request is currently under review by your Manager and HR.</p>
              <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)] inline-block text-left text-xs space-y-2">
                <div><strong>Submission Date:</strong> {new Date(request.resignationDate).toLocaleDateString('en-IN')}</div>
                <div><strong>Requested LWD:</strong> {new Date(request.lastWorkingDay).toLocaleDateString('en-IN')}</div>
                <div><strong>Reason:</strong> {request.reason || '—'}</div>
                <div><strong>Status:</strong> <span className="capitalize font-semibold text-indigo-400">{request.status}</span></div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/5 to-transparent">
                <h3 className="font-semibold text-[var(--text-primary)]">Submit Resignation</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Please fill details to initiate separation process</p>
              </div>
              <form onSubmit={handleResignSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Notice Period (Days)</label>
                    <input type="number" value={30} disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Last Working Day <span className="text-red-400">*</span></label>
                    <input type="date" value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Primary Reason <span className="text-red-400">*</span></label>
                  <select value={resignReason} onChange={e => setResignReason(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                    <option value="">Select reason...</option>
                    {['Better opportunity', 'Higher compensation elsewhere', 'Personal reasons', 'Career change', 'Relocation', 'Health reasons', 'Higher studies', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Additional Notes</label>
                  <textarea value={resignNotes} onChange={e => setResignNotes(e.target.value)} rows={4}
                    placeholder="Any additional information you'd like to share with HR..."
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
                </div>
                <button type="submit" disabled={initiateMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-rose-500/20">
                  {initiateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Submit Resignation
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Clearance Tab */}
      {tab === 'clearance' && (
        <div className="max-w-2xl space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
            <Shield size={16} className="flex-shrink-0 mt-0.5" />
            Clearance checklist and status items for your exit process.
          </div>
          {checklistItems.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-center">
              <Shield size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-sm font-medium text-[var(--text-primary)]">No clearance checklist yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Submit a resignation request to generate your department clearance checklist.</p>
            </div>
          ) : (
            checklistItems.map((item: any, idx: number) => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-[var(--text-primary)]">{item.task}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  item.completedAt
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {item.completedAt ? 'completed' : 'pending'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Exit Interview Tab */}
      {tab === 'interview' && (
        <div className="max-w-2xl">
          {interviewSubmitted || request?.exitInterviewNote ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Exit Interview Submitted</h3>
              <p className="text-sm text-[var(--text-muted)]">Thank you for your valuable feedback. Your responses will help us improve.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/5 to-transparent">
                <h3 className="font-semibold text-[var(--text-primary)]">Exit Interview</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Your feedback helps us create a better workplace for everyone</p>
              </div>
              <form onSubmit={handleInterviewSubmit} className="p-6 space-y-6">
                {EXIT_QUESTIONS.map((q, idx) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      <span className="text-indigo-400 mr-2">{idx + 1}.</span>{q.question}
                    </label>
                    {q.type === 'select' && (
                      <select value={answers[q.id] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                        <option value="">Select an option...</option>
                        {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}
                    {q.type === 'rating' && (
                      <RatingInput value={answers[q.id] || 0} onChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))} />
                    )}
                    {q.type === 'text' && (
                      <textarea value={answers[q.id] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={3}
                        placeholder="Share your thoughts..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
                    )}
                  </div>
                ))}
                <button type="submit" disabled={saveInterviewMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                  {saveInterviewMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Submit Exit Interview
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
