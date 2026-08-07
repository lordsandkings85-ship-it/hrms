import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, CheckCircle2, XCircle, Search, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { exitApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useToast } from '../../../components/ui/ToastProvider';

export default function EmployeeOffboardingPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: exitRequests = [], isLoading } = useQuery({
    queryKey: ['exit-requests-list'],
    queryFn: () => exitApi.list(),
  });

  const offboardingEmployees = exitRequests.filter((req: any) =>
    ['notice_period', 'offboarding', 'fnf', 'initiated'].includes(req.status)
  );

  const filtered = offboardingEmployees.filter((req: any) => {
    const emp = req.employee || {};
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`;
    return !searchTerm ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => exitApi.advance(id, 'fnf'),
    onSuccess: () => {
      toastSuccess('Offboarding checklist initiated and IT assets marked for recovery.');
      queryClient.invalidateQueries({ queryKey: ['exit-requests-list'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to process F&F'),
  });

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (row: any) => {
      const emp = row.employee || {};
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs uppercase border border-rose-500/20">
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
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        row.status === 'fnf' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      }`}>
        {row.status.replace('_', ' ')}
      </span>
    )},
    { key: 'fnf', header: 'Full & Final', render: (row: any) => <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">{row.status === 'fnf' ? 'In Progress' : 'Pending Recovery'}</span> },
    { key: 'actions', header: 'Actions', render: (row: any) => (
      row.status !== 'fnf' ? (
        <button 
          onClick={() => processMutation.mutate(row.id)}
          disabled={processMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold text-[var(--text-primary)] hover:text-rose-500 hover:border-rose-500/30 transition-colors"
        >
          {processMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />} Process F&F
        </button>
      ) : (
        <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><CheckCircle2 size={14} /> F&F Started</span>
      )
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-rose-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
             <LogOut size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employee Offboarding Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage final settlements, asset recovery, and exit interviews.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total in Notice', value: offboardingEmployees.filter((e:any) => e.status === 'notice_period' || e.status === 'initiated').length, color: 'text-rose-500' },
          { label: 'F&F Pending', value: offboardingEmployees.filter((e:any) => e.status !== 'fnf').length, color: 'text-amber-500' },
          { label: 'F&F In Progress', value: offboardingEmployees.filter((e:any) => e.status === 'fnf').length, color: 'text-sky-500' },
          { label: 'Total Offboarding', value: offboardingEmployees.length, color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</div>
            <div className={`text-2xl font-bold mt-2 font-mono ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
           <h3 className="text-lg font-bold text-[var(--text-primary)]">Offboarding Pipeline</h3>
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
             <input
               type="text"
               placeholder="Search by name or ID..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-rose-500"
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
