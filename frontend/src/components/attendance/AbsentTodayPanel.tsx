import { useQuery } from '@tanstack/react-query';
import { UserX, Clock, CalendarOff } from 'lucide-react';
import { attendanceApi } from '../../api/client';
import { Spinner } from '../ui/Spinner';

export default function AbsentTodayPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-absent-today'],
    queryFn: async () => attendanceApi.listAbsent(),
    refetchInterval: 30000,
  });

  const employees = Array.isArray(data) ? data : data?.employees || [];
  const count = Array.isArray(data) ? employees.length : data?.count ?? employees.length;
  const onLeaveToday = Array.isArray(data) ? 0 : data?.onLeaveToday ?? 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
            <UserX size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Absent Today (No Check-In)</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Employees not checked in yet — excludes approved leave & non-working days.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onLeaveToday > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
              <CalendarOff size={12} /> On leave today: {onLeaveToday}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
            <UserX size={13} /> {count}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 flex justify-center"><Spinner /></div>
      ) : employees.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Clock size={20} />
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">All employees have checked in</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">No absent employees for today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-active)] border border-[var(--border)]">
              <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                {e.name?.[0] || 'E'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[var(--text-primary)] truncate">{e.name}</div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono truncate">
                  {e.employeeCode}{e.department ? ` · ${e.department}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Shift</div>
                <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                  {e.shiftStart ? `${String(e.shiftStart).slice(0, 5)}–${String(e.shiftEnd).slice(0, 5)}` : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}