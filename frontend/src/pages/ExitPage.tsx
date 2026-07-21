import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exitApi, employeesApi } from '../api/client';
import { LogOut, CheckCircle2, Circle, ClipboardList, UserMinus, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

const STATUS_STEPS = ['initiated', 'clearance', 'fnf', 'completed'];

const statusColor: Record<string, string> = {
  initiated: 'bg-blue-100 text-blue-700',
  clearance: 'bg-amber-100 text-amber-700',
  fnf: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
};

export default function ExitPage() {
  const qc = useQueryClient();
  const [selectedEmp, setSelectedEmp] = useState('');
  const [resignation, setResignation] = useState('');
  const [lwd, setLwd] = useState('');
  const [reason, setReason] = useState('');
  const [interviewNote, setInterviewNote] = useState('');
  const [activeExitId, setActiveExitId] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: exitList } = useQuery({
    queryKey: ['exit-list'],
    queryFn: exitApi.list,
  });

  const { data: exitDetail } = useQuery({
    queryKey: ['exit-detail', activeExitId],
    queryFn: () => exitApi.get(activeExitId),
    enabled: !!activeExitId,
  });

  const initiateMutation = useMutation({
    mutationFn: exitApi.initiate,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exit-list'] });
      setActiveExitId(data.employeeId);
    },
  });

  const checklistMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      done ? exitApi.completeChecklist(id) : exitApi.uncompleteChecklist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exit-detail', activeExitId] }),
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => exitApi.saveInterview(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exit-detail', activeExitId] });
      qc.invalidateQueries({ queryKey: ['exit-list'] });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => exitApi.advance(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exit-detail', activeExitId] });
      qc.invalidateQueries({ queryKey: ['exit-list'] });
    },
  });

  const completedTasks = exitDetail?.checklists?.filter((c: any) => !!c.completedAt).length || 0;
  const totalTasks = exitDetail?.checklists?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="page-container max-w-7xl space-y-6">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold flex items-center gap-3">
          <UserMinus size={24} className="text-rust" /> Exit Management
        </h1>
        <p className="text-sm text-muted mt-1">
          Structured offboarding: initiate resignation, track clearances, conduct exit interview, trigger FnF.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Initiate Exit Form */}
        <div className="space-y-6">
          <div className="section-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Initiate Exit</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-1">Employee</label>
                <select
                  value={selectedEmp}
                  onChange={e => setSelectedEmp(e.target.value)}
                  className="w-full border border-line rounded px-3 py-2 text-sm"
                >
                  <option value="">-- Select employee --</option>
                  {employees?.items.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Resignation Date</label>
                <input type="date" value={resignation} onChange={e => setResignation(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Last Working Day</label>
                <input type="date" value={lwd} onChange={e => setLwd(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Reason (optional)</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full border border-line rounded px-3 py-2 text-sm resize-none"
                  placeholder="Better opportunity, personal reasons…"
                />
              </div>
              <button
                onClick={() => {
                  if (!selectedEmp || !resignation || !lwd) return alert('Fill all required fields');
                  initiateMutation.mutate({ employeeId: selectedEmp, resignationDate: resignation, lastWorkingDay: lwd, reason });
                }}
                disabled={initiateMutation.isPending}
                className="w-full bg-rust text-white rounded-md py-2.5 text-sm font-medium hover:bg-rust/90 disabled:opacity-50"
              >
                {initiateMutation.isPending ? 'Initiating…' : 'Initiate Exit Process'}
              </button>
            </div>
          </div>

          {/* Exit List */}
          <div className="section-card overflow-hidden">
            <div className="px-4 py-3 border-b border-line">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Active Exits</h3>
            </div>
            {!exitList || exitList.length === 0 ? (
              <div className="p-4 text-sm text-muted text-center">No exits in progress</div>
            ) : (
              <div className="divide-y divide-line">
                {exitList.map((ex: any) => (
                  <button
                    key={ex.id}
                    onClick={() => setActiveExitId(ex.employeeId)}
                    className={`w-full flex items-center justify-between p-4 text-left hover:bg-paper/50 ${activeExitId === ex.employeeId ? 'bg-ledger/5' : ''}`}
                  >
                    <div>
                      <div className="text-sm font-medium">{ex.employee?.firstName} {ex.employee?.lastName}</div>
                      <div className="text-xs text-muted">LWD: {new Date(ex.lastWorkingDay).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[ex.status] || ''}`}>{ex.status}</span>
                      <ChevronRight size={14} className="text-muted" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Exit Detail / Checklist */}
        <div className="lg:col-span-2 space-y-5">
          {!activeExitId ? (
            <div className="section-card flex flex-col items-center justify-center h-64 text-muted">
              <LogOut size={40} className="mb-3 opacity-20" />
              <p className="text-sm">Select an exit process to view details and checklist</p>
            </div>
          ) : exitDetail ? (
            <>
              {/* Status Timeline */}
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">
                    {exitDetail.employee?.firstName} {exitDetail.employee?.lastName} — Exit Timeline
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[exitDetail.status] || ''}`}>
                    {exitDetail.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_STEPS.map((step, idx) => {
                    const currentIdx = STATUS_STEPS.indexOf(exitDetail.status);
                    const done = idx <= currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-ledger text-paper' : 'bg-line text-muted'}`}>
                          {idx + 1}
                        </div>
                        <span className={`text-xs capitalize ${done ? 'text-ink font-medium' : 'text-muted'}`}>{step}</span>
                        {idx < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${done ? 'bg-ledger' : 'bg-line'}`} />}
                      </div>
                    );
                  })}
                </div>
                {exitDetail.status !== 'completed' && (
                  <button
                    onClick={() => {
                      const next = STATUS_STEPS[STATUS_STEPS.indexOf(exitDetail.status) + 1];
                      if (next) advanceMutation.mutate({ id: exitDetail.id, status: next });
                    }}
                    className="mt-4 text-xs bg-ledger/10 text-ledger px-3 py-1.5 rounded hover:bg-ledger/20 font-medium"
                  >
                    Advance to next stage →
                  </button>
                )}
              </div>

              {/* Checklist */}
              <div className="section-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardList size={16} /> Clearance Checklist
                  </h3>
                  <div className="text-xs text-muted">{completedTasks}/{totalTasks} done</div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-line rounded-full h-1.5 mb-4">
                  <div className="bg-ledger h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="space-y-2">
                  {exitDetail.checklists?.map((item: any) => (
                    <label key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-paper/50 cursor-pointer group">
                      <button
                        onClick={() => checklistMutation.mutate({ id: item.id, done: !item.completedAt })}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {item.completedAt ? (
                          <CheckCircle2 size={18} className="text-ledger" />
                        ) : (
                          <Circle size={18} className="text-line group-hover:text-muted" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${item.completedAt ? 'line-through text-muted' : 'text-ink'}`}>{item.task}</p>
                        {item.completedAt && (
                          <p className="text-xs text-ledger">Done by {item.completedBy} · {new Date(item.completedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Exit Interview */}
              <div className="section-card p-5">
                <h3 className="text-sm font-semibold mb-3">Exit Interview Notes</h3>
                <textarea
                  rows={4}
                  value={interviewNote || exitDetail.exitInterviewNote || ''}
                  onChange={e => setInterviewNote(e.target.value)}
                  className="w-full border border-line rounded px-3 py-2 text-sm resize-none"
                  placeholder="Capture feedback, suggestions, and reason for exit…"
                />
                <button
                  onClick={() => interviewMutation.mutate({ id: exitDetail.id, note: interviewNote })}
                  disabled={interviewMutation.isPending}
                  className="mt-2 bg-ink text-paper px-4 py-2 rounded text-sm font-medium hover:bg-ink/90 disabled:opacity-50"
                >
                  {interviewMutation.isPending ? 'Saving…' : 'Save Interview Notes'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


