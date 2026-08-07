import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { performanceApi, employeesApi } from '../../../api/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ViewPeriodicScorecardPage() {
  const [selectedEmp, setSelectedEmp] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: reviews } = useQuery({
    queryKey: ['performance-reviews', selectedEmp],
    queryFn: () => performanceApi.listReviews(selectedEmp),
    enabled: !!selectedEmp,
  });

  const chartData = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    
    // Group by cycle and average score
    const cycles: { [key: string]: { total: number; count: number } } = {};
    reviews.forEach((r: any) => {
      if (!cycles[r.cycle]) cycles[r.cycle] = { total: 0, count: 0 };
      cycles[r.cycle].total += r.score || 0;
      cycles[r.cycle].count += 1;
    });

    return Object.keys(cycles).map(cycle => ({
      name: cycle,
      score: cycles[cycle].total / cycles[cycle].count
    }));
  }, [reviews]);

  return (
    <div className="page-container max-w-6xl space-y-6">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <TrendingUp size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Periodic Scorecard</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Visualize performance trends over different cycles.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Users size={16} className="text-amber-500" /> Employee Context</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">Select an employee to view their periodic trends.</p>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors"
              >
                <option value="">-- Select Employee --</option>
                {employees?.items?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
           </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
               <Calendar size={20} className="text-[var(--text-muted)]" /> Performance Trend Analysis
             </h3>
             
             {selectedEmp ? (
               chartData.length > 0 ? (
                 <div className="h-[400px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                       <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                       <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 5]} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '12px' }}
                         itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                       />
                       <Bar dataKey="score" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="h-[400px] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">
                    No review history found for this employee to visualize.
                 </div>
               )
             ) : (
               <div className="h-[400px] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">
                  Select an employee to view their periodic scorecard.
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
