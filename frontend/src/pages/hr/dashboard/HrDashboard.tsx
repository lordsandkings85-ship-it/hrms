import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, leaveApi, shiftsApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { Spinner } from '../../../components/ui/Spinner';
import {
  Users, AlertTriangle, Calendar, FileClock,
  Briefcase, HandCoins,
  ArrowRight, CheckSquare,
  Clock, ClipboardList, CalendarClock, Wallet, Target,
  Fingerprint, FileText, MonitorSmartphone, Megaphone, Bell, History, Search,
  TrendingUp, Sparkles, UserCheck, UserMinus, ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#3b82f6'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#9ca3af'];

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const day = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">{time}</div>
      <div className="text-xs mt-0.5 text-[var(--text-muted)] font-medium uppercase tracking-wider">{day}</div>
    </div>
  );
}

export default function HrDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const name = user?.employee ? user.employee.firstName : user?.email?.split('@')[0] ?? 'HR';
  const emp = user?.employee as any;
  const empCode = emp?.employeeCode || 'SYS-ADMIN';
  const hireDate = emp?.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A';
  const locationName = emp?.branch?.name || 'Headquarters';
  const deptName = emp?.department?.name || 'Human Resources';

  const [dirSearch, setDirSearch] = useState('');

  const approveMutation = useMutation({
    mutationFn: leaveApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['leave-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances-dash'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: leaveApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['leave-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances-dash'] });
    }
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 300000 // Refresh every 5 mins
  });

  const empId = user?.employee?.id;
  const { data: leaveBalances } = useQuery({
    queryKey: ['my-leave-balances', empId],
    queryFn: () => (empId ? leaveApi.balances(empId) : Promise.resolve([])),
    enabled: !!empId,
    retry: false
  });

  const { data: holidays } = useQuery({
    queryKey: ['holidays-list'],
    queryFn: () => shiftsApi.listHolidays(),
  });

  const casualLeave = leaveBalances?.find((b: any) => b.leaveType?.code === 'CL' || b.leaveType?.name?.includes('Casual'));
  const earnedLeave = leaveBalances?.find((b: any) => b.leaveType?.code === 'EL' || b.leaveType?.name?.includes('Earned'));
  const sickLeave = leaveBalances?.find((b: any) => b.leaveType?.code === 'SL' || b.leaveType?.name?.includes('Sick'));
  const clBalance = casualLeave ? (casualLeave.allotted ?? 0) - (casualLeave.used ?? 0) : 0;
  const elBalance = earnedLeave ? (earnedLeave.allotted ?? 0) - (earnedLeave.used ?? 0) : 0;
  const slBalance = sickLeave ? (sickLeave.allotted ?? 0) - (sickLeave.used ?? 0) : 0;

  const calendarEvents = (holidays || []).map((h: any) => ({
    title: h.name,
    start: h.date,
    allDay: true,
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    textColor: '#ffffff'
  }));

  const leaveEvents = (data?.pendingLeaveRequests || [])
    .filter((r: any) => r.status === 'approved')
    .map((r: any) => ({
      title: `${r.employee?.firstName || 'Emp'} Leave`,
      start: r.startDate,
      end: new Date(new Date(r.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      allDay: true,
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
      textColor: '#ffffff'
    }));

  const allEvents = [...calendarEvents, ...leaveEvents];

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-24 bg-indigo-500/10 rounded-bl-full -z-0"></div>
        <div className="absolute bottom-0 left-0 p-16 bg-blue-500/5 rounded-tr-full -z-0"></div>
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back, {name}!</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-lg leading-relaxed">
              Here is what's happening across the organization today. You have <strong className="text-indigo-400">{data?.widgets?.pendingApprovals ?? 0} pending actions</strong> requiring your attention.
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden lg:flex items-center gap-6">
           <div className="h-10 w-px bg-[var(--border)]"></div>
           <LiveClock />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <div>
            <p className="font-bold text-sm">Connection Error</p>
            <p className="text-xs mt-0.5">Could not reach the server to fetch dashboard metrics.</p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* ── Top Metrics Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Widget 1: Workforce */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-indigo-500/30 transition-all">
              <div className="absolute -right-4 -top-4 text-[var(--border)] group-hover:text-indigo-500/5 transition-colors"><Users size={80} /></div>
              <div className="relative z-10">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Total Workforce</div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono mt-1 mb-3">{data.widgets?.totalEmployees ?? 0}</div>
                <div className="flex gap-4">
                  <div className="text-xs font-semibold flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {data.widgets?.presentToday ?? 0} Present</div>
                  <div className="text-xs font-semibold flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> {data.widgets?.absentToday ?? 0} Absent</div>
                </div>
              </div>
            </div>

            {/* Widget 2: Action Items */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-all">
               <div className="absolute -right-4 -top-4 text-[var(--border)] group-hover:text-amber-500/5 transition-colors"><Bell size={80} /></div>
               <div className="relative z-10">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Pending Approvals</div>
                <div className="text-3xl font-extrabold text-amber-500 font-mono mt-1 mb-3">{data.widgets?.pendingApprovals ?? 0}</div>
                <Link to="/leave/requests" className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-colors inline-flex items-center gap-1">
                  Review Leaves <ArrowRight size={10} />
                </Link>
              </div>
            </div>

            {/* Widget 3: Regularizations */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
               <div className="absolute -right-4 -top-4 text-[var(--border)] group-hover:text-blue-500/5 transition-colors"><CalendarClock size={80} /></div>
               <div className="relative z-10">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Pending Regularization</div>
                <div className="text-3xl font-extrabold text-blue-500 font-mono mt-1 mb-3">{(data.widgets as any)?.pendingRegularization ?? 0}</div>
                <Link to="/attendance/regularization" className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors inline-flex items-center gap-1">
                  Review Regularizations <ArrowRight size={10} />
                </Link>
              </div>
            </div>

            {/* Widget 4: Directory Search */}
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-inner flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2 flex items-center gap-2">
                <Search size={12} className="text-indigo-500" /> Employee Directory
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (dirSearch.trim()) {
                  navigate(`/employees?search=${encodeURIComponent(dirSearch.trim())}`);
                } else {
                  navigate('/employees');
                }
              }} className="relative">
                <input
                  type="text"
                  placeholder="Search by ID, Name, Email..."
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                  className="w-full bg-[var(--surface)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] pr-9 pl-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:border-indigo-500/50 transition-colors shadow-sm"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-indigo-500 transition-colors">
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>

          </div>

          {/* ── Main Dashboard Grids ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Calendar & Feeds */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Calendar Box */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-indigo-500" /> Organizational Calendar
                </h3>
                <div className="bg-[var(--surface-alt)] rounded-xl p-3 border border-[var(--border)]">
                  <style>{`
                    .fc { font-family: inherit; --fc-border-color: var(--border); background: transparent; color: var(--text-primary); }
                    .fc-toolbar-title { font-size: 1.1rem !important; font-weight: 700; color: var(--text-primary); }
                    .fc-button { background-color: var(--surface) !important; border-color: var(--border) !important; color: var(--text-primary) !important; font-size: 0.75rem !important; font-weight: 600 !important; text-transform: capitalize !important; border-radius: 8px !important; }
                    .fc-button-primary:not(:disabled).fc-button-active, .fc-button-primary:not(:disabled):active { background-color: #6366f1 !important; border-color: #6366f1 !important; color: #fff !important; }
                    .fc-col-header-cell { background-color: var(--surface); padding: 8px 0; border-bottom: 1px solid var(--border) !important; }
                    .fc-col-header-cell-cushion { color: var(--text-muted) !important; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
                    .fc-daygrid-day-number { color: var(--text-muted) !important; font-size: 0.8rem; font-weight: 600; padding: 4px 8px !important; }
                    .fc-day-today { background-color: rgba(99, 102, 241, 0.05) !important; }
                    .fc-event { border: none !important; font-size: 0.7rem !important; font-weight: 700; padding: 2px 4px !important; border-radius: 4px !important; cursor: pointer; transition: opacity 0.2s; }
                    .fc-event:hover { opacity: 0.8; }
                  `}</style>
                  <FullCalendar
                    plugins={[dayGridPlugin as any, interactionPlugin as any]}
                    initialView="dayGridMonth"
                    events={allEvents}
                    headerToolbar={{
                      left: 'title',
                      right: 'prev,next today'
                    }}
                    height={400}
                    editable={false}
                    selectable={false}
                  />
                </div>
              </div>

              {/* Notice Board & Birthdays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col h-[320px] shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white flex justify-between items-center">
                    <span className="font-bold text-sm flex items-center gap-2"><Megaphone size={16}/> Notice Board</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">{(data.notifications || []).length}</span>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-[var(--surface-alt)]">
                    {(data.notifications || []).length > 0 ? (
                      (data.notifications || []).map((notif: any) => (
                        <div key={notif.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-3 shadow-sm hover:border-indigo-500/30 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0"><FileText size={14}/></div>
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">{notif.title}</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-1">{notif.message || 'Official company announcement.'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">No active notices.</div>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col h-[320px] shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-3 text-white flex justify-between items-center">
                    <span className="font-bold text-sm flex items-center gap-2"><Sparkles size={16}/> Celebrations</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {(data.milestones?.newJoiners?.length || 0) + (data.milestones?.anniversaries?.length || 0)}
                    </span>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-[var(--surface-alt)]">
                    {data.milestones?.newJoiners && data.milestones.newJoiners.length > 0 && (
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 text-emerald-500/10"><UserCheck size={64}/></div>
                        <p className="text-xs font-bold text-emerald-500 mb-1 relative z-10">New Joiners</p>
                        <p className="text-[11px] text-[var(--text-muted)] relative z-10">{data.milestones.newJoiners.length} new employee(s) joined this month!</p>
                      </div>
                    )}
                    {data.milestones?.anniversaries && data.milestones.anniversaries.length > 0 && (
                      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-sm relative overflow-hidden mt-3">
                        <div className="absolute -right-4 -bottom-4 text-amber-500/10"><Sparkles size={64}/></div>
                        <p className="text-xs font-bold text-amber-500 mb-1 relative z-10">Anniversaries</p>
                        <p className="text-[11px] text-[var(--text-muted)] relative z-10">{data.milestones.anniversaries.length} employee(s) celebrating this month!</p>
                      </div>
                    )}
                    {(!data.milestones?.newJoiners?.length && !data.milestones?.anniversaries?.length) && (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">No upcoming celebrations.</div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: Alerts & Action Items */}
            <div className="space-y-6">
              
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col h-[755px]">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2 mb-4">
                  <CheckSquare size={16} className="text-amber-500" /> Action Items & Approvals
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  
                  {data.pendingLeaveRequests && data.pendingLeaveRequests.length > 0 ? (
                    data.pendingLeaveRequests.map((req: any) => (
                      <div key={req.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] shadow-sm hover:border-amber-500/30 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[13px] text-[var(--text-primary)] font-bold">{req.employeeName}</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5 bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)] inline-block">{req.leaveType} Request</p>
                          </div>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-3 flex items-center gap-2 font-medium">
                          <Calendar size={12} className="text-indigo-400"/>
                          {new Date(req.startDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} - {new Date(req.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}
                        </div>
                        <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border)]">
                          <button
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                            className="flex-1 text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(req.id)}
                            disabled={rejectMutation.isPending}
                            className="flex-1 text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <Link to="/leave/requests" className="flex-1 text-center text-[10px] bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-active)] py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors">Details</Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center opacity-50">
                      <CheckSquare size={40} className="text-[var(--text-muted)] mb-3" />
                      <p className="text-xs text-[var(--text-muted)] font-medium">Inbox zero! No pending approvals.</p>
                    </div>
                  )}

                  {(data.notifications || []).map((notif: any) => {
                    let badge = 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
                    let Icon = Bell;
                    if (notif.type === 'warning') { badge = 'bg-amber-500/10 text-amber-500 border-amber-500/20'; Icon = AlertTriangle; }
                    if (notif.type === 'urgent') { badge = 'bg-red-500/10 text-red-500 border-red-500/20'; Icon = Target; }
                    
                    return (
                      <div key={notif.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] flex items-start gap-3 hover:border-indigo-500/30 transition-colors">
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${badge}`}><Icon size={14}/></div>
                        <div>
                          <p className="text-[13px] text-[var(--text-primary)] font-bold leading-snug">{notif.title}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">{new Date(notif.time || Date.now()).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ── Visual Analytics (Charts) ────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Trend Chart */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm xl:col-span-2 h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-indigo-500" /> Attendance Trends
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.attendanceTrend || []} barSize={12} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--surface-active)' }} contentStyle={{ backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="present" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leave" name="Leave" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dept Mix Chart */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                <Briefcase size={16} className="text-indigo-500" /> Department Mix
              </h3>
              <div className="flex-1 min-h-0 flex flex-col items-center">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={data.departmentMix || []} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                      {(data.departmentMix || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {(data.departmentMix || []).slice(0,4).map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded border border-[var(--border)]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Funnel */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm h-[320px] flex flex-col">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                <Target size={16} className="text-indigo-500" /> Hiring Pipeline
              </h3>
              <div className="flex-1 flex flex-col justify-center gap-4">
                {[
                  { label: 'Applied', count: data.recruitmentPipeline?.applied || 0, color: 'bg-slate-400' },
                  { label: 'Interviewed', count: data.recruitmentPipeline?.interview || 0, color: 'bg-indigo-400' },
                  { label: 'Offered', count: data.recruitmentPipeline?.offer || 0, color: 'bg-amber-400' },
                  { label: 'Hired', count: data.recruitmentPipeline?.hired || 0, color: 'bg-emerald-400' },
                ].map((stage, i) => {
                  const max = Math.max(1, data.recruitmentPipeline?.applied || 1);
                  const w = Math.max(15, (stage.count / max) * 100);
                  return (
                    <div key={stage.label}>
                      <div className="flex justify-between text-[11px] mb-1.5 text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        <span>{stage.label}</span>
                        <span className="text-[var(--text-primary)]">{stage.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[var(--surface-alt)] overflow-hidden border border-[var(--border)]">
                        <div className={`h-full rounded-full transition-all duration-1000 ${stage.color}`} style={{ width: `${w}%` }}>
                           <div className="w-full h-full bg-white/20"></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </>
      )}
    </div>
  );
}
