import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  FileText, CalendarDays, Sparkles 
} from 'lucide-react';
import { attendanceApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner as CustomSpinner } from '../../../components/ui/Spinner';

export default function MyViewAttendancePage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  const { data: historyLogs, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['attendance-history-view', myEmpId, currentYear, currentMonth],
    queryFn: async () => {
      const firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      return await attendanceApi.list(myEmpId, firstDay, lastDay) || [];
    },
    enabled: !!myEmpId
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="View Attendance" 
        subtitle="Review your monthly attendance roster and detailed ledger sheet."
        icon={CalendarDays}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar View Panel */}
        <div className="xl:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-indigo-500/5 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" /> Attendance Roster Calendar
            </h3>
            
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm fullcalendar-dark-theme mt-4">
              <style>{`
                .fullcalendar-dark-theme .fc {
                  --fc-border-color: #334155;
                  --fc-daygrid-event-dot-width: 8px;
                  background: transparent;
                  font-family: inherit;
                }
                .fullcalendar-dark-theme .fc-toolbar-title {
                  font-size: 1.1rem !important;
                  font-weight: 700;
                  color: #f8fafc;
                }
                .fullcalendar-dark-theme .fc-button {
                  background-color: #1e293b !important;
                  border-color: #334155 !important;
                  color: #cbd5e1 !important;
                  font-size: 0.8rem !important;
                  text-transform: capitalize;
                }
                .fullcalendar-dark-theme .fc-button-primary:not(:disabled).fc-button-active,
                .fullcalendar-dark-theme .fc-button-primary:not(:disabled):active {
                  background-color: #4f46e5 !important;
                  border-color: #4f46e5 !important;
                  color: #ffffff !important;
                }
                .fullcalendar-dark-theme .fc-col-header-cell {
                  background-color: #0f172a;
                  padding: 8px 0;
                }
                .fullcalendar-dark-theme .fc-col-header-cell-cushion {
                  color: #94a3b8 !important;
                  font-size: 0.75rem;
                  font-weight: 600;
                  text-transform: uppercase;
                }
                .fullcalendar-dark-theme .fc-daygrid-day-number {
                  color: #cbd5e1 !important;
                  font-size: 0.8rem;
                  font-weight: 600;
                  padding: 4px 8px !important;
                }
                .fullcalendar-dark-theme .fc-day-today {
                  background: rgba(79, 70, 229, 0.15) !important;
                }
                .fullcalendar-dark-theme .fc-event {
                  border: none !important;
                  padding: 2px 4px;
                  border-radius: 4px;
                  font-size: 0.7rem !important;
                  font-weight: 700;
                }
              `}</style>
              <FullCalendar
                plugins={[dayGridPlugin as any, interactionPlugin as any]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'title',
                  right: 'prev,next today'
                }}
                events={[
                  ...(Object.values(
                    (historyLogs || []).reduce((acc: any, row: any) => {
                      const dateStr = row.date.split('T')[0];
                      if (!acc[dateStr]) {
                        let title = 'Present';
                        let color = '#10b981'; // Green
                        if (row.status === 'late') {
                          title = 'Late';
                          color = '#f59e0b'; // Amber
                        } else if (row.status === 'half_day') {
                          title = 'Half Day';
                          color = '#3b82f6'; // Blue
                        } else if (row.status === 'on_leave') {
                          title = 'Leave';
                          color = '#8b5cf6'; // Purple
                        } else if (row.status === 'absent') {
                          title = 'Absent';
                          color = '#ef4444'; // Red
                        }
                        acc[dateStr] = {
                          id: row.id,
                          title,
                          date: dateStr,
                          backgroundColor: color,
                          textColor: '#ffffff'
                        };
                      }
                      return acc;
                    }, {})
                  ) as any[])
                ]}
                datesSet={(arg) => {
                  setCurrentYear(arg.view.currentStart.getFullYear());
                  setCurrentMonth(arg.view.currentStart.getMonth() + 1);
                }}
                height="auto"
              />
            </div>
          </div>
        </div>

        {/* List Ledger Panel */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-sm flex flex-col h-full">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" /> Ledger Sheet
          </h3>
          {isLoadingHistory ? (
            <div className="flex-1 flex justify-center items-center py-6"><CustomSpinner /></div>
          ) : !historyLogs || historyLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 opacity-60">
               <FileText size={40} className="text-slate-500 mb-2" />
               <p className="text-xs text-[var(--text-muted)] text-center">No attendance logs found for this period.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto pr-1 flex-1">
              {historyLogs.map((row: any) => (
                <div key={row.id} className="py-3 flex items-center justify-between text-xs hover:bg-[var(--surface-alt)] px-2 rounded-lg transition-colors">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
                      <span>In: {row.checkIn ? new Date(row.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      <span>Out: {row.checkOut ? new Date(row.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {row.regularizationNote ? (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                        Regularized
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                        {row.status === 'late' ? 'Late' : 'Regular'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
