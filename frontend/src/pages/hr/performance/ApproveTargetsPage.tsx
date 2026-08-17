import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Users, Target, Search, Check, X, Star } from 'lucide-react';
import { performanceApi, employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastProvider';

export default function ApproveTargetsPage() {
  const [selectedEmp, setSelectedEmp] = useState('');
  const queryClient = useQueryClient();
  const { success: toastSuccess } = useToast();

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['performance-goals', selectedEmp],
    queryFn: () => performanceApi.listGoals(selectedEmp),
    enabled: !!selectedEmp,
  });

  const approveMutation = useMutation({
    mutationFn: (goalId: string) => performanceApi.approveGoal(goalId),
    onSuccess: () => {
      toastSuccess('Target approved successfully!');
      queryClient.invalidateQueries({ queryKey: ['performance-goals', selectedEmp] });
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (goalId: string) => performanceApi.rejectGoal(goalId),
    onSuccess: () => {
      toastSuccess('Target rejected');
      queryClient.invalidateQueries({ queryKey: ['performance-goals', selectedEmp] });
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    },
  });

  const pendingCount = (goals ?? []).filter((g: any) => g.status !== 'approved').length;

  const columns: Column<any>[] = [
    { key: 'title', header: 'Goal Title', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.title}</span> },
    { key: 'description', header: 'Description', render: (row: any) => <span className="text-[var(--text-muted)] text-xs truncate max-w-[200px] block">{row.description || '—'}</span> },
    { key: 'dueDate', header: 'Due Date', render: (row: any) => <span className="font-mono text-xs">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}</span> },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row: any) => {
        if (row.status === 'approved') return <StatusBadge status="completed" />;
        if (row.status === 'rejected') return <StatusBadge status="rejected" />;
        if (row.progress === 100) return <StatusBadge status="completed" />;
        if (row.progress > 0) return <StatusBadge status="in_progress" />;
        return <StatusBadge status="pending" />;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' ? (
            <>
              <button 
                onClick={() => approveMutation.mutate(row.id)}
                disabled={approveMutation.isPending}
                className="text-xs px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Check size={12} /> Approve
              </button>
              <button 
                onClick={() => rejectMutation.mutate(row.id)}
                disabled={rejectMutation.isPending}
                className="text-xs px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <X size={12} /> Reject
              </button>
            </>
          ) : (
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <CheckCircle2 size={12} /> {row.status === 'approved' ? 'Approved' : 'Rejected'}
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-container max-w-6xl space-y-6">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
             <CheckCircle2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Approve Targets</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and approve targets set by employees.</p>
          </div>
        </div>
        <div className="relative z-10 text-center">
          <p className="text-2xl font-bold text-amber-500">{selectedEmp ? pendingCount : '—'}</p>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Awaiting Approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Context Selector Sidebar */}
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Users size={16} className="text-emerald-500" /> Employee Context</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">Select an employee to view their targets awaiting approval.</p>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="">-- Select Employee --</option>
                {employees?.items?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
           </div>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">Targets Awaiting Approval</h3>
             
             <div className="premium-datatable">
               <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
               `}</style>
               
               {selectedEmp ? (
                 <DataTable columns={columns} data={goals || []} loading={goalsLoading} keyField="id" />
               ) : (
                 <div className="h-32 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">
                    Select an employee to view their targets.
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
