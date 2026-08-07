import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search, Filter, Check, X } from 'lucide-react';
import { attendanceApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';

export default function GeoAttendanceApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance-geo'],
    queryFn: async () => {
      const res = await attendanceApi.listToday();
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 30000,
  });

  const filteredLogs = (logs || []).filter((log: any) => {
    const name = (log.employee?.firstName + ' ' + log.employee?.lastName).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (log: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
            {log.employee?.firstName?.[0] || 'E'}{log.employee?.lastName?.[0] || ''}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{log.employee?.firstName} {log.employee?.lastName}</div>
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{log.employee?.employeeCode}</div>
          </div>
        </div>
      )
    },
    {
      key: 'method',
      header: 'Method',
      render: (log: any) => (
        <div className="text-xs">
          <span className="capitalize block font-semibold text-[var(--text-primary)]">{log.method}</span>
          {log.isWithinGeofence === true && <span className="text-emerald-500 block mt-0.5 font-bold">✅ In-zone</span>}
          {log.isWithinGeofence === false && <span className="text-amber-500 block mt-0.5 font-bold">⚠️ Out-zone</span>}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (log: any) => {
        const map: Record<string, string> = {
          present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          absent: 'bg-red-500/10 text-red-500 border-red-500/20',
          half_day: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          on_leave: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        };
        const statusClass = map[log.status] || 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]';
        return <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${statusClass}`}>{log.status?.replace('_', ' ')}</span>;
      }
    },
    {
      key: 'time',
      header: 'Check In/Out',
      render: (log: any) => (
        <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
          <div><span className="text-[var(--text-primary)]">In:</span> {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</div>
          <div><span className="text-[var(--text-primary)]">Out:</span> {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}</div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
            <Check size={12} /> Approve
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
            <X size={12} /> Reject
          </button>
        </div>
      ),
    }
  ].filter(Boolean) as Column<any>[];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
             <MapPin size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Geo Attendance Approval</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review and take action on attendance records.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
             <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
               Active Records
             </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors w-64"
              />
            </div>
            <button aria-label="Filter" className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-blue-500 hover:border-blue-500/30 transition-colors bg-[var(--surface-alt)]">
               <Filter size={16} />
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
          <DataTable columns={columns} data={filteredLogs} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}
