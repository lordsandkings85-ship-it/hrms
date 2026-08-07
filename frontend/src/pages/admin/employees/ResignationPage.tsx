import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserMinus, Search, Filter , Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';

export default function ResignationPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({}),
  });

  const empList = Array.isArray(employees) ? employees : (employees as any)?.items ?? [];

  const columns: Column<any>[] = [
    { key: 'name', header: 'Employee Name', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.firstName} {row.lastName}</span> },
    { key: 'empId', header: 'Employee ID', render: (row: any) => <span className="font-mono text-xs uppercase text-[var(--text-muted)] tracking-wider">{row.employeeId || 'N/A'}</span> },
    { key: 'dept', header: 'Department', render: (row: any) => <span className="text-[var(--text-primary)] text-xs font-semibold">{row.department?.name || '—'}</span> },
    { key: 'designation', header: 'Designation', render: (row: any) => <span className="text-[var(--text-muted)] text-xs">{row.designation?.name || '—'}</span> },
    { key: 'status', header: 'Status', render: (row: any) => <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-bold uppercase tracking-wider">Active</span> },
    { 
      key: 'actions', 
      header: '', 
      render: (row: any) => (
        <div className="flex items-center justify-end gap-2">
          <button aria-label="Edit" className="p-1.5 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button aria-label="Delete" className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
          <button aria-label="Row actions" className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <UserMinus size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Resigned/Separation</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage employee resignations and separation workflows.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
               Resigned/Separation Database
             </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors w-64"
              />
            </div>
            <button aria-label="Filter" className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 transition-colors bg-[var(--surface-alt)]">
               <Filter size={16} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm text-xs font-bold uppercase tracking-wider">
              <Plus size={16} />
              <span>Add Resignation</span>
            </button>
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
          
          <DataTable columns={columns} data={empList} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}
