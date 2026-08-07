import { useQuery } from '@tanstack/react-query';
import { dashboardApi, employeesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { Spinner } from '../../../components/ui/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, Briefcase, TrendingDown, Target, Building } from 'lucide-react';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E', '#6366F1'];

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const emp = user?.employee as any;
  const empCode = emp?.employeeCode || '—';
  const hireDate = emp?.joiningDate
    ? new Date(emp.joiningDate).toLocaleDateString()
    : '—';
  const locationName = emp?.branch?.name || '—';
  const deptName = emp?.department?.name || '—';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });

  const totalEmployees = data?.widgets?.totalEmployees ?? 0;
  const maleCount = data?.genderDistribution?.find((g: any) => g.name?.toLowerCase() === 'male')?.value ?? 0;
  const femaleCount = data?.genderDistribution?.find((g: any) => g.name?.toLowerCase() === 'female')?.value ?? 0;
  const totalGender = maleCount + femaleCount || (totalEmployees > 0 ? totalEmployees : 1);
  const malePct = totalGender > 0 ? Math.round((maleCount / totalGender) * 100) : 0;
  const femalePct = totalGender > 0 ? Math.round((femaleCount / totalGender) * 100) : 0;

  // Outflow & Average Salary calculation from API or computed from active employees
  const apiCTC = (data?.widgets as any)?.totalAnnualCTC;
  const totalCostAnnual = typeof apiCTC === 'number' && apiCTC > 0
    ? apiCTC
    : (data?.monthlyPayrollCost
      ? data.monthlyPayrollCost.reduce((acc: number, curr: any) => acc + (curr.cost || 0), 0) * 2
      : 0);

  const avgMonthlySalary = totalEmployees > 0 ? Math.round((totalCostAnnual / 12) / totalEmployees) : 0;

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="page-container space-y-4 font-sans text-slate-800 dark:text-slate-200">

      {/* -- Breadcrumb Navigation ----------------------------------------- */}
      <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
        <span className="hover:text-slate-200 cursor-pointer">Home</span>
        <span>•</span>
        <span className="text-slate-500 font-semibold">Dashboard</span>
      </div>

      {/* -- Top Information Strip ------------------------------------------ */}
      <div className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs font-bold flex flex-wrap items-center gap-6 shadow-xs">
        <div>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">Employee#:</span>{' '}
          <span className="text-slate-600 dark:text-slate-400 font-normal">{empCode}</span>
        </div>
        <div>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">Hire Date:</span>{' '}
          <span className="text-slate-600 dark:text-slate-400 font-normal">{hireDate}</span>
        </div>
        <div>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">Work Location:</span>{' '}
          <span className="text-slate-600 dark:text-slate-400 font-normal">{locationName}</span>
        </div>
        <div>
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">Department:</span>{' '}
          <span className="text-slate-600 dark:text-slate-400 font-normal">{deptName}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* -- Top 4 Row Cards Grid matching exact screenshot --------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Card 1: NO OF EMPLOYEES */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between items-center text-center shadow-xs min-h-[140px]">
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                NO OF EMPLOYEES
              </div>
              <div className="text-4xl font-extrabold text-teal-500 dark:text-teal-400 my-auto">
                {totalEmployees}
              </div>
            </div>

            {/* Card 2: TOTAL SALARY OUTFLOW - CTC */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between items-center text-center shadow-xs min-h-[140px]">
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                TOTAL SALARY OUTFLOW - CTC
              </div>
              <div className="text-xl font-bold text-slate-700 dark:text-slate-200 my-auto">
                {fmtCurrency(totalCostAnnual)}
              </div>
            </div>

            {/* Card 3: AVG SALARY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between items-center text-center shadow-xs min-h-[140px]">
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                AVG SALARY
              </div>
              <div className="text-xl font-bold text-slate-700 dark:text-slate-200 my-auto">
                {fmtCurrency(avgMonthlySalary)} <span className="text-xs font-normal text-slate-400">/ mo</span>
              </div>
            </div>

            {/* Card 4: EMPLOYEE STRUCTURE (Male / Female Ratio) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between items-center text-center shadow-xs min-h-[140px]">
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                EMPLOYEE STRUCTURE
              </div>
              <div className="flex items-end justify-center gap-8 w-full my-auto px-4">

                {/* Male Figure */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{malePct}%</span>
                  <svg className="w-8 h-12 text-slate-900 dark:text-slate-100" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="4" r="3" />
                    <path d="M12 8c-3.3 0-6 1.8-6 4v5h3.5v7h5v-7H18v-5c0-2.2-2.7-4-6-4z" />
                  </svg>
                </div>

                {/* Female Figure */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{femalePct}%</span>
                  <svg className="w-8 h-12 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="4" r="3" />
                    <path d="M12 8c-2.8 0-5 1.8-5 4v3.5l2 1.5V24h6v-7l2-1.5V12c0-2.2-2.2-4-5-4z" />
                  </svg>
                </div>

              </div>
            </div>
          </div>

          {/* -- Additional Analytics ------------------------------------------ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Headcount Trend */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" /> Headcount Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.headcountTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="headcount" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Stats Column */}
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1">Attrition Rate</div>
                  <div className="text-3xl font-extrabold text-red-500">{data?.attritionRate?.[data.attritionRate.length - 1]?.rate || 0}%</div>
                </div>
                <TrendingDown className="w-10 h-10 text-red-100 dark:text-red-900/30" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1">Open Positions</div>
                  <div className="text-3xl font-extrabold text-indigo-500">{data?.widgets?.openPositions || 0}</div>
                </div>
                <Target className="w-10 h-10 text-indigo-100 dark:text-indigo-900/30" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1">Active Projects</div>
                  <div className="text-3xl font-extrabold text-emerald-500">{data?.widgets?.activeProjects || 0}</div>
                </div>
                <Briefcase className="w-10 h-10 text-emerald-100 dark:text-emerald-900/30" />
              </div>
            </div>

            {/* Department Mix */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" /> Department Mix
              </h3>
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.departmentMix || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(data?.departmentMix || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Payroll Cost */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" /> Monthly Payroll Cost
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.monthlyPayrollCost || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(value) => `${value >= 1000 ? (value / 1000) + 'k' : value}`} />
                    <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [fmtCurrency(value), 'Cost']} />
                    <Bar dataKey="cost" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
