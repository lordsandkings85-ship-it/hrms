import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { reportsApi, organizationApi } from '../api/client';

const COLORS = ['#1F6F5C', '#154F42', '#8A7B4E', '#B5522E', '#6B6A63', '#12181B'];

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch departments list for names mapping
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => organizationApi.listDepartments(),
  });

  // Fetch headcount report
  const { data: headcount } = useQuery({
    queryKey: ['report-headcount'],
    queryFn: () => reportsApi.headcount(),
  });

  // Fetch attrition report
  const { data: attrition } = useQuery({
    queryKey: ['report-attrition', selectedYear],
    queryFn: () => reportsApi.attrition(selectedYear),
  });

  // Fetch payroll cost report
  const { data: payrollCost } = useQuery({
    queryKey: ['report-payroll', selectedYear],
    queryFn: () => reportsApi.payrollCost(selectedYear),
  });

  // Fetch leave summary report
  const { data: leaves } = useQuery({
    queryKey: ['report-leaves', selectedYear],
    queryFn: () => reportsApi.leaveSummary(selectedYear),
  });

  // Map headcount ids to names
  const headcountData = headcount?.map((hc: any) => {
    const dept = departments?.find((d) => d.id === hc.departmentId);
    return {
      name: dept ? dept.name.slice(0, 10) : 'General',
      count: hc._count,
    };
  }) || [];

  // Monthly payroll cost dataset visualization (based on backend annual value)
  const baseCost = payrollCost?.totalNet || 0;
  const payrollCostTimeline = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(2020, i).toLocaleString('default', { month: 'short' });
    return {
      month: monthName,
      cost: baseCost > 0 ? Math.round(baseCost / 12) : 0,
    };
  });

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Analytical Insights</h1>
          <p className="text-sm text-muted mt-1">Audit company operations, payroll budget distributions, attrition, and attendance data.</p>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1 text-right">Accounting Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-md border border-line bg-white text-sm"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </header>

      {/* Roster widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-line rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-ledger/10 text-ledger rounded">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Headcount Segments</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{headcountData.reduce((sum, h) => sum + h.count, 0)} employees</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-rust/10 text-rust rounded">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Annual Attrition Rate</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{attrition ? (attrition.attritionRate * 100).toFixed(1) : '0.0'}%</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-ledger/10 text-ledger rounded">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Yearly Payroll Budget</div>
            <div className="text-2xl font-bold font-mono mt-0.5">₹{baseCost.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Headcount Chart */}
        <div className="bg-white border border-line rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-ink">Headcount by Division</h3>
          <div className="h-64">
            {headcountData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted">No division data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcountData}>
                  <XAxis dataKey="name" stroke="#6B6A63" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6B6A63" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" fill="#1F6F5C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Payroll Cost Chart */}
        <div className="bg-white border border-line rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-ink">Monthly Payroll Cost (₹)</h3>
          <div className="h-64">
            {baseCost === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted">Run a payroll cycle to visualize monthly curves.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={payrollCostTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
                  <XAxis dataKey="month" stroke="#6B6A63" fontSize={11} />
                  <YAxis stroke="#6B6A63" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cost" stroke="#1F6F5C" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Leave Summary */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center gap-2 bg-paper/20">
          <Calendar size={16} /> Annual Leave Balances &amp; Usage
        </div>
        <div className="p-6">
          {(!leaves || leaves.length === 0) && (
            <div className="text-xs text-muted text-center py-6">No leave balance sheets recorded for {selectedYear}.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaves?.map((b: any) => (
              <div key={b.id} className="border border-line rounded p-4 bg-paper/20 hover:bg-paper/40">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">{b.employee?.firstName} {b.employee?.lastName}</div>
                  <span className="text-xs text-ledger bg-ledger/10 px-2 py-0.5 rounded font-mono">{b.leaveType?.name}</span>
                </div>
                <div className="text-xs text-muted space-y-1">
                  <div>Allotted quota: <span className="font-semibold text-ink font-mono">{b.allotted}</span></div>
                  <div>Used quota: <span className="font-semibold text-ink font-mono">{b.used}</span></div>
                  <div>Remaining quota: <span className="font-semibold text-ledger font-mono">{Math.max(b.allotted - b.used, 0)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
