import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, Loader2, UserMinus, ShieldAlert, Check } from 'lucide-react';
import { exitApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';
import { StatusBadge } from '../../../components/ui/Badge';
import { fmtDate } from '../../../utils/formatDate';

export default function EmployeeResignationPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: exitRequests = [], isLoading } = useQuery({
    queryKey: ['exit-requests-list'],
    queryFn: () => exitApi.list(),
  });

  const resigningEmployees = exitRequests.filter((req: any) =>
    ['initiated', 'notice_period', 'offboarding', 'fnf'].includes(req.status)
  );

  const filtered = resigningEmployees.filter((req: any) => {
    const emp = req.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`;
    return !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => exitApi.advance(id, 'offboarding'),
    onSuccess: () => {
      toastSuccess('Resignation accepted. Employee moved to Offboarding status.');
      queryClient.invalidateQueries({ queryKey: ['exit-requests-list'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to accept resignation'),
  });

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (row: any) => {
      const emp = row.employee || {};
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs uppercase border border-amber-500/20">
            {(emp.firstName || '?')[0]}{(emp.lastName || '?')[0]}
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</div>
            <div className="text-xs text-[var(--text-muted)] font-mono">{emp.employeeCode}</div>
          </div>
        </div>
      );
    }},
    { key: 'department', header: 'Department', render: (row: any) => <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{row.employee?.department?.name || 'N/A'}</span> },
    { key: 'resignationDate', header: 'Resignation Date', render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)] font-bold">{fmtDate(row.resignationDate || row.createdAt)}</span> },
    { key: 'lastWorkingDay', header: 'Last Working Day', render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)] font-bold">{row.lastWorkingDay ? new Date(row.lastWorkingDay).toLocaleDateString() : '—'}</span> },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        row.status === 'offboarding' || row.status === 'notice_period' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
      }`}>
        {row.status === 'offboarding' ? 'Offboarding' : row.status === 'fnf' ? 'F&F Pending' : 'Initiated'}
      </span>
    )},
    { key: 'actions', header: 'Actions', render: (row: any) => (
      row.status === 'initiated' ? (
        <button 
          onClick={() => acceptMutation.mutate(row.id)}
          disabled={acceptMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white transition-colors"
        >
          {acceptMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />} Accept & Offboard
        </button>
      ) : (
        <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1"><Check size={14} /> {row.status === 'offboarding' ? 'Offboarding' : 'In Progress'}</span>
      )
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <UserMinus size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Resignation Approvals</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review resignation requests, negotiate retention, or initiate offboarding.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
           <h3 className="text-lg font-bold text-[var(--text-primary)]">Pending Resignations</h3>
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
             <input
               type="text"
               placeholder="Search by name or ID..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500"
             />
           </div>
        </div>

        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          <DataTable columns={columns} data={filtered} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}
