import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Star, Award, TrendingUp } from 'lucide-react';
import { performanceApi, employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { fmtDate } from '../../../utils/formatDate';

export default function ViewScorecardPage() {
  const [selectedEmp, setSelectedEmp] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['performance-reviews', selectedEmp],
    queryFn: () => performanceApi.listReviews(selectedEmp),
    enabled: !!selectedEmp,
  });

  const { data: aggregate, isLoading: aggregateLoading } = useQuery({
    queryKey: ['performance-aggregate', selectedEmp],
    queryFn: () => performanceApi.getAggregatedScore(selectedEmp),
    enabled: !!selectedEmp,
  });

  const reviewColumns: Column<any>[] = [
    { key: 'cycle', header: 'Cycle', render: (row: any) => <span className="font-bold text-[var(--text-primary)]">{row.cycle}</span> },
    { key: 'type', header: 'Type', render: (row: any) => <span className="text-xs uppercase tracking-wider font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{row.type}</span> },
    { key: 'reviewer', header: 'Reviewer', render: (row: any) => <span className="text-[var(--text-primary)] text-sm">{row.reviewer?.firstName} {row.reviewer?.lastName}</span> },
    { 
      key: 'score', 
      header: 'Score', 
      render: (row: any) => (
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
             <Star key={s} size={12} className={s <= row.score ? "text-amber-500 fill-amber-500" : "text-[var(--border)]"} />
          ))}
          <span className="ml-1 text-xs font-bold">{row.score}/5</span>
        </div>
      ) 
    },
    { key: 'date', header: 'Date', render: (row: any) => <span className="font-mono text-xs text-[var(--text-muted)]">{fmtDate(row.createdAt)}</span> },
  ];

  return (
    <div className="page-container max-w-6xl space-y-6">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Performance Scorecard</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">View aggregated performance metrics and review history.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Users size={16} className="text-amber-500" /> Employee Context</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">Select an employee to view their scorecard.</p>
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
          {selectedEmp && !aggregateLoading && aggregate && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star size={24} fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-bold">Overall Rating</p>
                  <p className="text-2xl font-black text-[var(--text-primary)]">{aggregate.averageScore?.toFixed(1) || 'N/A'}<span className="text-base font-medium text-[var(--text-muted)]">/5</span></p>
                </div>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-bold">Total Reviews</p>
                  <p className="text-2xl font-black text-[var(--text-primary)]">{aggregate.totalReviews || 0}</p>
                </div>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] font-bold">Performance</p>
                  <p className="text-2xl font-black text-[var(--text-primary)]">
                    {aggregate.averageScore >= 4 ? 'Exceptional' : aggregate.averageScore >= 3 ? 'Meets Exp.' : 'Needs Impr.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">Evaluation History</h3>
             <div className="premium-datatable">
               <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
               `}</style>
               {selectedEmp ? (
                 <DataTable columns={reviewColumns} data={reviews || []} loading={reviewsLoading} keyField="id" />
               ) : (
                 <div className="h-32 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">Select an employee to view their scorecard.</div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
