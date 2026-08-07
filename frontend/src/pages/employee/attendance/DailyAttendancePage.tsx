import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { attendanceApi } from '../../../api/client';
import { Clock, Fingerprint, Calendar as CalendarIcon, LogIn, LogOut, MapPin } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastProvider';

export default function DailyAttendancePage() {
  const { user } = useAuthStore();
  const empId = user?.employee?.id;
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance', empId, selectedDate],
    queryFn: () => attendanceApi.list(empId!, selectedDate, selectedDate),
    enabled: !!empId && !!selectedDate,
  });

  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn({ employeeId: empId!, method: 'WEB' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', empId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-dash'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: (err: any) => toastError(err.message || 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (logId: string) => attendanceApi.checkOut(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', empId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: (err: any) => toastError(err.message || 'Check-out failed'),
  });

  const activeLog = logs?.find((l: any) => !l.checkOut);

  const columns: Column<any>[] = [
    { 
      key: 'date', 
      header: 'Date', 
      render: (row) => <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(row.date).toLocaleDateString()}</span> 
    },
    { 
      key: 'checkIn', 
      header: 'Check In', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <LogIn size={14} className="text-emerald-500" />
          <span className="font-mono text-sm">{row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : '—'}</span>
        </div>
      ) 
    },
    { 
      key: 'checkOut', 
      header: 'Check Out', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <LogOut size={14} className="text-rose-500" />
          <span className="font-mono text-sm">{row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : '—'}</span>
        </div>
      ) 
    },
    { 
      key: 'method', 
      header: 'Method', 
      render: (row) => <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">{row.method || 'WEB'}</span> 
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row) => <StatusBadge status={row.status || 'present'} /> 
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade">
      
      {/* Premium Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-5 w-full">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner shrink-0">
             <Clock size={28} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">Daily Attendance</h1>
            <p className="text-sm text-slate-500 font-medium">Record and track your daily work hours.</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => checkInMutation.mutate()} 
              disabled={checkInMutation.isPending || !!activeLog}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm shadow-indigo-600/20 transition-all"
            >
              <Fingerprint size={16} /> 
              {checkInMutation.isPending ? 'Logging...' : 'Web Check-In'}
            </button>
            <button 
              onClick={() => activeLog && checkOutMutation.mutate(activeLog.id)} 
              disabled={checkOutMutation.isPending || !activeLog}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 dark:border-rose-500/20 rounded-xl font-bold transition-all"
            >
              <LogOut size={16} /> 
              {checkOutMutation.isPending ? 'Logging...' : 'Web Check-Out'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <CalendarIcon size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium bg-transparent border-none focus:ring-0 p-0 w-32 text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>

        {/* Premium Datatable Styling wrapper */}
        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; padding: 0 16px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 800; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>
          
          <DataTable 
            columns={columns} 
            data={logs || []} 
            loading={isLoading} 
            keyField="id" 
          />
        </div>

      </div>
    </div>
  );
}
