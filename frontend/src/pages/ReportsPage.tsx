import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Calendar, Users, UserMinus } from 'lucide-react';
import { reportsApi, organizationApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

const COLORS = ['#071104', '#1F6F5C', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: departments } = useQuery({ queryKey: ['departments-list'], queryFn: () => organizationApi.listDepartments() });
  const { data: headcount }   = useQuery({ queryKey: ['report-headcount'], queryFn: () => reportsApi.headcount() });
  const { data: attrition }   = useQuery({ queryKey: ['report-attrition', selectedYear], queryFn: () => reportsApi.attrition(selectedYear) });
  const { data: payrollCost } = useQuery({ queryKey: ['report-payroll', selectedYear], queryFn: () => reportsApi.payrollCost(selectedYear) });
  const { data: leaves }      = useQuery({ queryKey: ['report-leaves', selectedYear], queryFn: () => reportsApi.leaveSummary(selectedYear) });

  const headcountData = headcount?.map((hc: any) => {
    const dept = departments?.find((d) => d.id === hc.departmentId);
    return { name: dept ? dept.name.slice(0, 12) : 'General', count: hc._count };
  }) || [];

  const baseCost = payrollCost?.totalNet || 0;
  const payrollCostTimeline = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2020, i).toLocaleString('default', { month: 'short' }),
    cost: baseCost > 0 ? Math.round(baseCost / 12) : 0,
  }));

  const totalHeadcount = headcountData.reduce((s, h) => s + h.count, 0);
  const attritionRate  = attrition ? (attrition.attritionRate * 100).toFixed(1) : '0.0';

  const KPI_CARDS = [
    { label: 'Total Headcount', value: `${totalHeadcount}`, icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Annual Attrition', value: `${attritionRate}%`, icon: UserMinus, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
    { label: 'Yearly Payroll', value: `₹${(baseCost / 100000).toFixed(1)}L`, icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Leave Records', value: `${leaves?.length ?? 0}`, icon: Calendar, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  ];

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <PageHeader
          title="Analytical Insights"
          subtitle="Payroll · Attrition · Headcount · Leave Analytics"
          icon={BarChart3}
          actions={
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="input h-9 text-sm w-28 font-mono"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          }
        />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slideUp" style={{ animationDelay: '0.15s' }}>
        {KPI_CARDS.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="section-card p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: k.bg }}>
                <Icon size={22} style={{ color: k.color }} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{k.label}</p>
                <p className="text-2xl font-black font-mono tracking-tight text-ink mt-0.5">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
        <div className="section-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-5 flex items-center gap-2">
            <Users size={14} className="text-info" /> Headcount by Division
          </h3>
          <div className="h-64">
            {headcountData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted">No division data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" fill="#071104" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-5 flex items-center gap-2">
            <DollarSign size={14} className="text-success" /> Monthly Payroll Cost (₹)
          </h3>
          <div className="h-64">
            {baseCost === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted">Run a payroll cycle to visualize monthly curves.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payrollCostTimeline}>
                  <defs>
                    <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
                  <Area type="monotone" dataKey="cost" name="Monthly Cost" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#payrollGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Leave Summary */}
      <div className="section-card overflow-hidden animate-slideUp" style={{ animationDelay: '0.25s' }}>
        <div className="px-6 py-4 border-b border-line flex items-center gap-3">
          <Calendar size={16} className="text-warning" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Annual Leave Balances & Usage</h3>
          <span className="ml-auto text-xs font-mono text-muted">{leaves?.length ?? 0} records</span>
        </div>
        <div className="p-6">
          {(!leaves || leaves.length === 0) && (
            <div className="text-sm text-muted text-center py-8">No leave balance sheets recorded for {selectedYear}.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaves?.map((b: any) => {
              const remaining = Math.max((b.allotted ?? b.leaveType?.daysPerYear ?? 0) - (b.used ?? 0), 0);
              const total = b.allotted ?? b.leaveType?.daysPerYear ?? 1;
              const pct = Math.round((remaining / total) * 100);
              return (
                <div key={b.id} className="section-card p-4 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-semibold text-ink">{b.employee?.firstName} {b.employee?.lastName}</div>
                      <div className="text-xs text-muted font-mono">{b.leaveType?.name}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(7,17,4,0.08)', color: '#071104' }}>{remaining} left</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-line">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct > 50 ? '#10B981' : pct > 25 ? '#F59E0B' : '#EF4444' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted mt-1.5">
                    <span>Used: {b.used ?? 0}</span>
                    <span>Total: {total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
