import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X, Search, Filter } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';

export function ApprovalQueue({
  title,
  queryKey,
  queryFn,
  onApprove,
  onReject,
  icon: Icon,
}: {
  title: string;
  queryKey: string[];
  queryFn: () => Promise<any>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  icon: React.ElementType;
}) {
  const { data, isLoading } = useQuery({ queryKey, queryFn });
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const all = Array.isArray(data) ? data : (data?.data ?? []);
  const pending = all.filter((r: any) => r.status === 'pending' || r.status === 'submitted');
  const approved = all.filter((r: any) => r.status === 'approved' || r.status === 'rejected');

  const active = filter === 'pending' ? pending : approved;
  const typeOptions: string[] = Array.from(new Set<string>(active.map((r: any) => String(r.leaveType || r.type || '')).filter(Boolean)));
  const filtered = active.filter((r: any) => {
    if (typeFilter && (r.leaveType || r.type) !== typeFilter) return false;
    const name = (r.employee?.firstName + ' ' + r.employee?.lastName).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const columns: Column<any>[] = [
    { key: 'employeeName', header: 'Employee', render: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs border border-indigo-500/20">
          {(row.employee?.firstName?.[0] || 'E') + (row.employee?.lastName?.[0] || '')}
        </div>
        <span className="font-bold text-[var(--text-primary)]">{row.employee?.firstName} {row.employee?.lastName}</span>
      </div>
    )},
    { key: 'type', header: 'Type', render: (row) => <span className="text-[var(--text-muted)] font-medium bg-[var(--surface-alt)] px-2 py-1 rounded-md border border-[var(--border)]">{row.leaveType || row.type || '—'}</span> },
    { key: 'startDate', header: 'Start Date', render: (row) => <span className="font-mono text-[var(--text-primary)]">{row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN') : '—'}</span> },
    { key: 'endDate', header: 'End Date', render: (row) => <span className="font-mono text-[var(--text-primary)]">{row.endDate ? new Date(row.endDate).toLocaleDateString('en-IN') : '—'}</span> },
    { key: 'days', header: 'Days', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.days || row.totalDays || '—'}</span> },
    { key: 'reason', header: 'Reason', render: (row) => <span className="max-w-[180px] truncate block text-xs text-[var(--text-muted)]">{row.reason || '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => onApprove(row.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
            <Check size={12} /> Approve
          </button>
          <button onClick={() => onReject(row.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
            <X size={12} /> Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <Icon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{title} Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and take action on pending requests.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
           <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase border border-indigo-500/20">{filter}</span>
                Requests
                <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20">{filtered.length}</span>
              </h3>
           </div>
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-[var(--surface-alt)] rounded-xl p-1 border border-[var(--border)]">
               <button
                 onClick={() => setFilter('pending')}
                 className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'pending' ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                 aria-pressed={filter === 'pending'}
               >
                 Pending
               </button>
               <button
                 onClick={() => setFilter('approved')}
                 className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'approved' ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                 aria-pressed={filter === 'approved'}
               >
                 Approved
               </button>
             </div>
             <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
               <input 
                type="text" 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors w-64"
              />
            </div>
             <div className="relative">
               <button
                 aria-label="Filter"
                 aria-expanded={filterOpen}
                 onClick={() => setFilterOpen(o => !o)}
                 className={`p-2 border border-[var(--border)] rounded-xl transition-colors bg-[var(--surface-alt)] ${typeFilter ? 'text-indigo-500 border-indigo-500/30' : 'text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30'}`}
               >
                 <Filter size={16} />
               </button>
               {filterOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                   <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-[var(--surface)] z-50 shadow-xl p-2 space-y-1" style={{ borderColor: 'var(--border)' }}>
                     <button
                       onClick={() => { setTypeFilter(null); setFilterOpen(false); }}
                       className={`w-full text-left px-3 py-1.5 text-xs rounded-lg ${typeFilter === null ? 'bg-indigo-500 text-white font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'}`}
                     >
                       All types
                     </button>
                     {typeOptions.map(t => (
                       <button
                         key={t}
                         onClick={() => { setTypeFilter(t); setFilterOpen(false); }}
                         className={`w-full text-left px-3 py-1.5 text-xs rounded-lg ${typeFilter === t ? 'bg-indigo-500 text-white font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'}`}
                       >
                         {t}
                       </button>
                     ))}
                   </div>
                 </>
               )}
             </div>
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
