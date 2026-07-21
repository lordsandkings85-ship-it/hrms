import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi, employeesApi } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { StatCard } from '../ui/StatCard';
import { Spinner } from '../ui/Spinner';
import {
  Users, CheckCircle, AlertTriangle, Calendar, FileClock,
  Briefcase, FolderKanban, UserMinus, HandCoins, Calculator,
  ArrowRight, Plus, Banknote, Zap, PartyPopper, UserCheck, Target, ArrowUpRight,
  Clock, ClipboardList, CalendarClock, Wallet, UserPlus, CheckSquare, Coins, 
  Fingerprint, FileText, CalendarPlus, MonitorSmartphone, Megaphone, BarChart2, Bell, History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const WIDGET_META: Record<string, { label: string; accent: string; icon: React.ElementType; color: string }> = {
  totalEmployees:        { label: 'Total Employees', accent: 'var(--info)', icon: Users, color: '#3B82F6' },
  presentToday:          { label: 'Present Today', accent: 'var(--success)', icon: UserCheck, color: '#10B981' },
  absentToday:           { label: 'Absent', accent: 'var(--danger)', icon: UserMinus, color: '#EF4444' },
  onLeaveToday:          { label: 'On Leave', accent: 'var(--warning)', icon: Calendar, color: '#F97316' },
  lateArrivals:          { label: 'Late Arrivals', accent: 'var(--warning)', icon: Clock, color: '#EAB308' },
  pendingApprovals:      { label: 'Pending Leave', accent: 'var(--primary)', icon: ClipboardList, color: '#A855F7' },
  pendingRegularization: { label: 'Pending Regularization', accent: 'var(--danger)', icon: CalendarClock, color: '#EC4899' },
  pendingPayroll:        { label: 'Pending Payroll', accent: 'var(--success)', icon: Wallet, color: '#10B981' }
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E', '#6366F1'];
const GENDER_COLORS = ['#3B82F6', '#EC4899', '#9CA3AF'];

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const day = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{time}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{day}</div>
    </div>
  );
}

export default function HrDashboard() {
  const { user } = useAuthStore();
  const name = user?.employee ? user.employee.firstName : user?.email?.split('@')[0] ?? 'HR';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 300000 // Refresh every 5 mins
  });

  return (
    <div className="page-container space-y-6">

      {/* ── Header with Sticky Controls ──────────────────────────────── */}
      <div className="sticky top-0 z-40 section-card p-6 flex justify-between items-center gap-4 glass shadow-sm" style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Dashboard Overview</h1>
          <p className="text-xs text-muted mt-1">Welcome back, {name}. Here's your complete HR overview.</p>
        </div>
        <div className="hidden md:block">
          <LiveClock />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64 section-card">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
          <AlertTriangle size={18} className="flex-shrink-0" />
          <div>
            <p className="font-semibold">Cannot connect to API</p>
            <p className="text-xs mt-0.5 opacity-90">Ensure the NestJS backend is running.</p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* ── 8 Overview Cards ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {Object.keys(WIDGET_META).map((key, idx) => {
              const meta = WIDGET_META[key];
              const value = data.widgets[key as keyof typeof data.widgets] ?? 0;
              const Icon = meta.icon;
              return (
                <div key={key} className="section-card p-5 animate-slideUp flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">{meta.label}</p>
                    <p className="text-2xl font-bold font-display mt-0.5 text-ink">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>



          {/* ── 8 Charts (2 Rows of 4 or 4 Rows of 2) ──────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            
            {/* 1. Attendance Trend */}
            <div className="section-card p-5 xl:col-span-2 min-h-[300px] flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2"><Zap size={16} className="text-warning"/> Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.attendanceTrend || []} barSize={12} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--surface-active)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                  <Bar dataKey="present" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leave" name="Leave" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Employee Growth */}
            <div className="section-card p-5 xl:col-span-2 min-h-[300px] flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2"><Users size={16} className="text-info"/> Employee Growth</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.headcountTrend || []}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                  <Area type="monotone" dataKey="headcount" name="Headcount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Department Distribution */}
            <div className="section-card p-5 flex flex-col items-center min-h-[300px]">
              <h2 className="text-sm font-semibold mb-4 text-ink w-full">Department Mix</h2>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.departmentMix || []} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                    {(data.departmentMix || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {(data.departmentMix || []).slice(0,3).map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center gap-1 text-[10px] text-muted">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                    {d.name}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Leave Statistics */}
            <div className="section-card p-5 flex flex-col items-center min-h-[300px]">
              <h2 className="text-sm font-semibold mb-4 text-ink w-full">Leave Statistics</h2>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.leaveStatistics || []} innerRadius={0} outerRadius={70} dataKey="value">
                    {(data.leaveStatistics || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {(data.leaveStatistics || []).map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center gap-1 text-[10px] text-muted">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[(i + 3) % CHART_COLORS.length] }}></div>
                    {d.name}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Monthly Payroll Cost */}
            <div className="section-card p-5 xl:col-span-2 min-h-[300px] flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2"><Wallet size={16} className="text-success"/> Payroll Cost (Last 6 Months)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlyPayrollCost || []}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                  <Area type="monotone" dataKey="cost" name="Cost" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 6. Recruitment Pipeline */}
            <div className="section-card p-5 min-h-[300px] flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink">Recruitment Funnel</h2>
              <div className="flex-1 flex flex-col justify-center gap-3">
                {[
                  { label: 'Applied', count: data.recruitmentPipeline?.applied || 0, color: '#6B7280' },
                  { label: 'Interview', count: data.recruitmentPipeline?.interview || 0, color: '#3B82F6' },
                  { label: 'Offered', count: data.recruitmentPipeline?.offer || 0, color: '#F59E0B' },
                  { label: 'Hired', count: data.recruitmentPipeline?.hired || 0, color: '#10B981' },
                ].map((stage, i) => {
                  const max = Math.max(1, data.recruitmentPipeline?.applied || 1);
                  const w = Math.max(10, (stage.count / max) * 100);
                  return (
                    <div key={stage.label}>
                      <div className="flex justify-between text-[11px] mb-1 text-muted">
                        <span>{stage.label}</span>
                        <span className="font-bold text-ink">{stage.count}</span>
                      </div>
                      <div className="h-4 rounded-full bg-surface-active overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${w}%`, backgroundColor: stage.color }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 7. Attrition Rate */}
            <div className="section-card p-5 xl:col-span-2 min-h-[300px] flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2"><UserMinus size={16} className="text-danger"/> Attrition Rate (%)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.attritionRate || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                  <Line type="monotone" dataKey="rate" name="Attrition Rate" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 8. Gender Distribution */}
            <div className="section-card p-5 flex flex-col items-center min-h-[300px]">
              <h2 className="text-sm font-semibold mb-4 text-ink w-full">Diversity</h2>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.genderDistribution || []} innerRadius={60} outerRadius={75} paddingAngle={5} dataKey="value">
                    {(data.genderDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-popover)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {(data.genderDistribution || []).map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center gap-1 text-[11px] text-muted">
                    <div className="w-3 h-3 rounded-md" style={{ backgroundColor: GENDER_COLORS[i % GENDER_COLORS.length] }}></div>
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Activity Feeds ──────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Recent Activities */}
            <div className="section-card p-5 h-96 flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2"><History size={16} /> Recent Activities</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {(data.recentActivities || []).map((act: any, i: number) => (
                  <div key={act.id} className="flex gap-3 relative">
                    {i !== (data.recentActivities || []).length - 1 && <div className="absolute top-6 left-2 w-px h-full bg-border -ml-px"></div>}
                    <div className="w-4 h-4 mt-1 rounded-full border-2 border-surface bg-info z-10"></div>
                    <div>
                      <p className="text-[13px] text-ink font-medium">{act.title}</p>
                      <p className="text-[10px] text-muted">{new Date(act.time).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="section-card p-5 h-96 flex flex-col">
              <h2 className="text-sm font-semibold mb-4 text-ink flex items-center gap-2"><Bell size={16} /> Notifications & Alerts</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {(data.notifications || []).map((notif: any) => {
                  let badge = 'bg-info/10 text-info border-info/20';
                  if (notif.type === 'warning') badge = 'bg-warning/10 text-warning border-warning/20';
                  if (notif.type === 'urgent') badge = 'bg-danger/10 text-danger border-danger/20';
                  
                  return (
                    <div key={notif.id} className="p-3 rounded-lg border bg-surface-active border-border flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${notif.type === 'urgent' ? 'bg-danger animate-ping' : notif.type === 'warning' ? 'bg-warning' : 'bg-info'}`}></div>
                      <div>
                        <p className="text-[13px] text-ink font-medium leading-snug">{notif.title}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${badge}`}>
                          {notif.type}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {data.milestones?.newJoiners && data.milestones.newJoiners.length > 0 ? (
                  <div className="p-3 rounded-lg border bg-success/5 border-success/20">
                    <p className="text-[12px] font-bold text-success mb-1">🎉 New Joiners</p>
                    <p className="text-[11px] text-muted">{data.milestones.newJoiners.length} new employee(s) joined this month. Welcome them!</p>
                  </div>
                ) : null}
                {data.milestones?.anniversaries && data.milestones.anniversaries.length > 0 ? (
                  <div className="p-3 rounded-lg border bg-info/5 border-info/20">
                    <p className="text-[12px] font-bold text-info mb-1">🎂 Work Anniversaries</p>
                    <p className="text-[11px] text-muted">{data.milestones.anniversaries.length} employee(s) have work anniversaries this month.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
