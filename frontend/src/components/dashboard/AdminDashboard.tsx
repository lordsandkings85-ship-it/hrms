import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi, employeesApi } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { StatCard } from '../ui/StatCard';
import { Spinner } from '../ui/Spinner';
import {
  Users, CheckCircle, AlertTriangle, Calendar, FileClock,
  Briefcase, FolderKanban, UserMinus, HandCoins, Calculator,
  ArrowRight, Plus, Banknote, Zap, ArrowUpRight, TrendingUp, Building2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';

const WIDGET_META: Record<string, { label: string; accent: string; icon: React.ElementType }> = {
  totalEmployees:   { label: 'Total Employees',    accent: 'var(--info)', icon: Users },
  presentToday:     { label: 'Present Today',      accent: 'var(--success)', icon: CheckCircle },
  absentToday:      { label: 'Absent Today',       accent: 'var(--danger)', icon: AlertTriangle },
  onLeaveToday:     { label: 'On Leave',           accent: 'var(--warning)', icon: Calendar },
  pendingApprovals: { label: 'Pending Approvals',  accent: 'var(--warning)', icon: FileClock },
  openPositions:    { label: 'Open Positions',     accent: 'var(--info)', icon: Briefcase },
  activeProjects:   { label: 'Active Projects',    accent: 'var(--success)', icon: FolderKanban },
};

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

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const name = user?.employee ? user.employee.firstName : user?.email?.split('@')[0] ?? 'Admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-list-dash'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const recentEmployees = empData?.items?.slice(0, 4) ?? [];

  return (
    <div className="page-container space-y-6">

      {/* ── Hero Header ──────────────────────────────── */}
      <div className="section-card p-8 flex justify-between items-start gap-4 relative overflow-hidden glass animate-slideDown shadow-lg">
        {/* Abstract animated background element */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-ledger/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        <div className="relative z-10">
          <p className="text-sm font-medium mb-1 text-muted">Good {getGreeting()},</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink drop-shadow-sm">{name}</h1>
          <p className="text-sm mt-3 max-w-md leading-relaxed text-muted">
            Here's your workforce overview for today. Everything looks operational. 
            You have <strong className="text-ink font-semibold">{data?.widgets.pendingApprovals ?? 0} pending approvals</strong>.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/employees" className="btn-primary text-xs px-4 py-2 hover:scale-105 transition-transform duration-300">
              <Plus size={14} /> Add Employee
            </Link>
            <Link to="/payroll" className="btn-secondary text-xs px-4 py-2 hover:scale-105 transition-transform duration-300">
              <Banknote size={14} /> Run Payroll
            </Link>
            <Link to="/leave" className="btn-secondary text-xs px-4 py-2 hover:scale-105 transition-transform duration-300">
              <FileClock size={14} /> Approvals
            </Link>
          </div>
        </div>
        <div className="relative z-10 hidden md:block mt-2">
          <LiveClock />
        </div>
      </div>

      {/* ── Metric Cards ─────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center h-36 section-card">
          <Spinner size="md" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
          <AlertTriangle size={18} className="flex-shrink-0" />
          <div>
            <p className="font-semibold">Cannot connect to API</p>
            <p className="text-xs mt-0.5 opacity-90">Ensure the NestJS backend is running on port 3000.</p>
          </div>
        </div>
      )}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Object.entries(data.widgets).slice(0, 4).map(([key, value], idx) => {
            const meta = WIDGET_META[key] ?? { label: key, accent: 'var(--info)', icon: Users };
            // Mocking trend data for enterprise feel
            const trends = [
              { value: 4.2, label: 'vs last month' },
              { value: 1.5, label: 'vs yesterday' },
              { value: -0.8, label: 'vs yesterday' },
              { value: 12.5, label: 'vs last week' },
            ];
            return (
              <div key={key} className="animate-slideUp" style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'both' }}>
                <StatCard
                  label={meta.label}
                  value={value}
                  icon={meta.icon}
                  accent={meta.accent}
                  trend={trends[idx]}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Charts & Analytics ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Headcount Trend Chart (Recharts AreaChart) */}
        <div className="section-card p-6 lg:col-span-2 flex flex-col animate-slideUp hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <TrendingUp size={16} style={{ color: 'var(--info)' }} /> Headcount Trend
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>6-month trailing active employee count</p>
            </div>
          </div>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.headcountTrend ?? []} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-popover)', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--info)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="headcount" name="Employees" stroke="var(--info)" strokeWidth={2} fillOpacity={1} fill="url(#colorHeadcount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution (Recharts PieChart) */}
        <div className="section-card p-6 flex flex-col animate-slideUp hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Building2 size={16} style={{ color: 'var(--warning)' }} /> Department Mix
            </h2>
          </div>
          <div className="h-[200px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.departmentMix ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {(data?.departmentMix ?? []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-popover)', color: 'var(--text-primary)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {(data?.departmentMix ?? []).slice(0,4).map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Recent Employees & Quick Links ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Employees */}
        <div className="section-card p-6 flex flex-col animate-slideUp" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Hires</h2>
            <Link to="/employees" className="text-xs font-semibold flex items-center gap-1 transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="space-y-3 flex-1">
            {recentEmployees.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No recent employees found.</p>
            )}
            {recentEmployees.map(emp => {
              const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
              return (
                <Link
                  key={emp.id}
                  to={`/employees/${emp.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors group"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div className="w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{emp.department?.name ?? emp.employeeCode}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions (Admin Tools) */}
        <div className="section-card p-6 animate-slideUp" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Admin Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Exit Clearance', desc: 'Manage resignations.', to: '/exit', icon: UserMinus, color: 'var(--danger)' },
              { title: 'FnF Settlement', desc: 'Process gratuity & fnf.', to: '/fnf', icon: HandCoins, color: 'var(--warning)' },
              { title: 'Tax Calculator', desc: 'Old & New regime.', to: '/tax-calculator', icon: Calculator, color: 'var(--info)' },
              { title: 'Helpdesk', desc: 'Resolve IT/HR tickets.', to: '/helpdesk', icon: AlertTriangle, color: 'var(--success)' },
            ].map(card => {
              const Icon = card.icon;
              return (
                <Link key={card.title} to={card.to} className="border rounded-xl p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform" style={{ borderColor: 'var(--border)', background: 'var(--surface-hover)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface)', color: card.color, boxShadow: 'var(--shadow-card)' }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
