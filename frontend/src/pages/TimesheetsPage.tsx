import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock3, Check, X, FolderKanban, Timer } from 'lucide-react';
import { timesheetsApi, employeesApi, projectsApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { PageHeader } from '../components/ui/PageHeader';

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const myEmpId = user?.employee?.id || '';

  const [selectedEmp, setSelectedEmp] = useState(myEmpId);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('8');

  // Sync selectedEmp with user structure data if non-admin
  useEffect(() => {
    if (!isAdmin && myEmpId) setSelectedEmp(myEmpId);
  }, [isAdmin, myEmpId]);

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
    enabled: !!isAdmin,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list(),
  });

  // Fetch timesheets for selected employee
  const { data: timesheets, refetch } = useQuery({
    queryKey: ['timesheets-list', selectedEmp],
    queryFn: () => timesheetsApi.listForEmployee(selectedEmp),
    enabled: !!selectedEmp,
  });

  // Submit Timesheet
  const submitTimesheetMutation = useMutation({
    mutationFn: timesheetsApi.submit,
    onSuccess: () => {
      alert('Timesheet logged successfully');
      setHours('8');
      setDate('');
      refetch();
    },
  });

  // Approve/Reject Mutations
  const approveMutation = useMutation({
    mutationFn: timesheetsApi.approve,
    onSuccess: () => {
      refetch();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: timesheetsApi.reject,
    onSuccess: () => {
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !date || !hours) return alert('Please enter all parameters');
    submitTimesheetMutation.mutate({
      employeeId: selectedEmp,
      projectId: projectId || undefined,
      date,
      hours: Number(hours),
    });
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Timesheets"
          subtitle="Track hours, manage approvals, and generate billing reports."
          icon={Timer}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submit Form */}
        <div className="section-card p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock3 className="text-ledger" size={18} /> Submit Hours Log
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">{isAdmin ? 'Employee Context' : 'Employee'}</label>
              {isAdmin ? (
                <select
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees?.items.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 rounded-md border border-line bg-gray-50 text-sm text-muted cursor-not-allowed">
                  {user?.employee?.firstName} {user?.employee?.lastName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Project Assignment</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
              >
                <option value="">-- General / Non-Project work --</option>
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Logged Hours</label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitTimesheetMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
            >
              Submit Timesheet Hour
            </button>
          </form>
        </div>

        {/* Timesheets list */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper/20">
            <h3 className="text-sm font-semibold">Timesheet Ledger</h3>
          </div>
          {selectedEmp ? (
            <div>
              {!timesheets || timesheets.length === 0 ? (
                <div className="p-6 text-sm text-muted text-center">No timesheet records submitted yet. Register hours on the left panel.</div>
              ) : (
                <div className="divide-y divide-line">
                  {timesheets.map((ts: any) => (
                    <div key={ts.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-paper rounded border border-line text-ledger">
                          <FolderKanban size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span>Project: {ts.project?.name || 'General / Overhead'}</span>
                            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                              ts.status === 'submitted'
                                ? 'bg-paper text-muted border border-line'
                                : ts.status === 'approved'
                                ? 'bg-ledger/10 text-ledger'
                                : 'bg-rust/10 text-rust'
                            }`}>
                              {ts.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted mt-1">
                            Date: <span className="font-mono text-ink">{new Date(ts.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right font-mono font-semibold text-sm text-ink">{ts.hours} hrs</div>
                        {isAdmin && ts.status === 'submitted' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => approveMutation.mutate(ts.id)}
                              className="p-1 rounded border border-ledger text-ledger hover:bg-ledger/5"
                              title="Approve"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(ts.id)}
                              className="p-1 rounded border border-rust text-rust hover:bg-rust/5"
                              title="Reject"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted text-center">Select an employee context to inspect timesheet registries.</div>
          )}
        </div>
      </div>
    </div>
  );
}

