import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi, employeesApi } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { StatCard } from '../ui/StatCard';
import { Spinner } from '../ui/Spinner';
import {
  Users, CheckCircle, AlertTriangle, Calendar, FileClock,
  Briefcase, FolderKanban, UserMinus, HandCoins, Calculator,
  ArrowRight, Plus, Banknote, Zap, PartyPopper, UserCheck, Target,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const WIDGET_META: Record<string, { label: string; accent: string; icon: React.ElementType }> = {
  totalEmployees:   { label: 'Total Employees',    accent: '#1F6F5C', icon: Users },
  presentToday:     { label: 'Present Today',      accent: '#10B981', icon: CheckCircle },
  absentToday:      { label: 'Absent Today',       accent: '#EF4444', icon: AlertTriangle },
  onLeaveToday:     { label: 'On Leave',           accent: '#8A7B4E', icon: Calendar },
  pendingApprovals: { label: 'Pending Approvals',  accent: '#F59E0B', icon: FileClock },
  openPositions:    { label: 'Open Positions',     accent: '#1F6F5C', icon: Briefcase },
  activeProjects:   { label: 'Active Projects',    accent: '#3B82F6', icon: FolderKanban },
};



function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const day = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-bold text-white tabular-nums">{time}</div>
      <div className="text-xs text-white/50 mt-0.5">{day}</div>
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
    <div className="page-container space-y-7">

      {/* ── Hero Header ──────────────────────────────── */}
      <div className="bg-gradient-to-r from-ink via-ink2 to-ledgerDark rounded-2xl p-7 relative overflow-hidden flex justify-between items-start gap-4">
        {/* Decorative */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #1F6F5C 0%, transparent 60%)' }} />

        <div className="relative z-10">
          <p className="text-white/50 text-sm mb-1">Welcome to the HR Portal, Good {getGreeting()}</p>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">{name}</h1>
          <p className="text-white/55 text-sm mt-2 max-w-md">
            Here's your workforce overview for today. Everything looks operational.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link to="/employees" className="btn-primary text-xs px-3 py-1.5 gap-1.5">
              <Plus size={13} /> Add Employee
            </Link>
            <Link to="/payroll" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">
              <Banknote size={13} /> Run Payroll
            </Link>
            <Link to="/leave" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">
              <FileClock size={13} /> Approvals
            </Link>
          </div>
        </div>
        <div className="relative z-10 hidden md:block">
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
        <div className="flex items-center gap-3 p-4 bg-danger-light border border-danger/20 rounded-xl text-sm text-danger-dark">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <div>
            <p className="font-semibold">Cannot connect to API</p>
            <p className="text-xs opacity-80 mt-0.5">Ensure the NestJS backend is running on port 3000.</p>
          </div>
        </div>
      )}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(data.widgets).map(([key, value]) => {
            const meta = WIDGET_META[key] ?? { label: key, accent: '#1F6F5C', icon: Users };
            return (
              <StatCard
                key={key}
                label={meta.label}
                value={value}
                icon={meta.icon}
                accent={meta.accent}
              />
            );
          })}
        </div>
      )}

      {/* ── Attendance Trend Chart + Recent Employees ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Chart */}
        <div className="section-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-ink">Attendance Trend</h2>
              <p className="text-xs text-muted mt-0.5">Last 6 months overview</p>
            </div>
            <Zap size={16} className="text-ledger" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.attendanceTrend ?? []} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6A63' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B6A63' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E1D8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                cursor={{ fill: '#F6F5F1' }}
              />
              <Bar dataKey="present" name="Present" fill="#1F6F5C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leave"   name="On Leave" fill="#E8F2EF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#FDEAEA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Employees */}
        <div className="section-card p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">Recent Employees</h2>
            <Link to="/employees" className="text-xs text-ledger font-semibold flex items-center gap-1 hover:text-ledgerDark">
              All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5 flex-1">
            {recentEmployees.length === 0 && (
              <p className="text-xs text-muted py-4 text-center">No employees found.</p>
            )}
            {recentEmployees.map(emp => {
              const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
              return (
                <Link
                  key={emp.id}
                  to={`/employees/${emp.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-paperDim transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-ledger/15 text-ledgerDark text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate group-hover:text-ledger transition-colors">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-muted truncate">{emp.department?.name ?? emp.employeeCode}</div>
                  </div>
                  <ArrowRight size={13} className="text-muted/40 group-hover:text-ledger transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Quick Access Modules ──────────────────────── */}
      <div className="section-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Exit Clearance', desc: 'Structured exit checklists & timelines.', to: '/exit', icon: UserMinus, color: 'text-rust bg-rustLight border-rust/20' },
            { title: 'FnF Settlement', desc: 'Automated gratuity & final payroll.', to: '/fnf', icon: HandCoins, color: 'text-ledger bg-ledgerLight border-ledger/20' },
            { title: 'Tax Calculator', desc: 'Old & New regime slab calculator.', to: '/tax-calculator', icon: Calculator, color: 'text-info bg-info-light border-info/20' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`border rounded-xl p-4 flex flex-col justify-between hover:shadow-raised transition-all ${card.color}`}>
                <div>
                  <div className={`p-2.5 rounded-lg w-fit mb-3 bg-white/60`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-sm font-semibold">{card.title}</h3>
                  <p className="text-xs opacity-70 mt-1 leading-relaxed">{card.desc}</p>
                </div>
                <Link to={card.to} className="flex items-center gap-1 text-xs font-bold mt-4 hover:gap-2 transition-all w-fit">
                  Open <ArrowRight size={11} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recruitment Pipeline & Milestones ─────────── */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recruitment Pipeline */}
          <div className="section-card p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-ink">Recruitment Pipeline</h2>
              <Target size={16} className="text-muted" />
            </div>
            <div className="flex items-center justify-between gap-2">
              {[
                { label: 'Applied', count: data.recruitmentPipeline?.applied || 0, color: 'bg-paperDim text-muted' },
                { label: 'Interview', count: data.recruitmentPipeline?.interview || 0, color: 'bg-info-light text-info-dark border border-info/20' },
                { label: 'Offered', count: data.recruitmentPipeline?.offer || 0, color: 'bg-warning-light text-warning-dark border border-warning/20' },
                { label: 'Hired', count: data.recruitmentPipeline?.hired || 0, color: 'bg-success-light text-success-dark border border-success/20' },
              ].map((stage, i) => (
                <div key={stage.label} className="flex-1 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg mb-2 ${stage.color}`}>
                    {stage.count}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Celebrations & Milestones */}
          <div className="section-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">Celebrations & Milestones</h2>
              <PartyPopper size={16} className="text-muted" />
            </div>
            
            <div className="space-y-4">
              {/* Anniversaries */}
              {data.milestones?.anniversaries?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-ledger mb-2">Work Anniversaries</h3>
                  <div className="space-y-2">
                    {data.milestones.anniversaries.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-ledgerLight/50">
                        <div className="w-8 h-8 rounded-full bg-ledger text-white flex items-center justify-center text-xs font-bold">
                          {e.years}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ink">{e.name}</p>
                          <p className="text-[10px] text-muted">{e.years} Year Anniversary</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Joiners */}
              {data.milestones?.newJoiners?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-info mb-2">Recent Joiners (Last 30 Days)</h3>
                  <div className="space-y-2">
                    {data.milestones.newJoiners.slice(0, 3).map((e: any) => (
                      <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-info-light/50">
                        <UserCheck size={16} className="text-info-dark" />
                        <div>
                          <p className="text-xs font-semibold text-ink">{e.name}</p>
                          <p className="text-[10px] text-muted">Joined {new Date(e.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!data.milestones?.anniversaries?.length && !data.milestones?.newJoiners?.length && (
                <p className="text-xs text-muted text-center py-4">No upcoming milestones this month.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
