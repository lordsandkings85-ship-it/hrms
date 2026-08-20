import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { Laptop, Package, Calendar } from 'lucide-react';
import { fmtDate } from '../../../utils/formatDate';

export default function MyAssetsPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';

  const { data: emp, isLoading } = useQuery({
    queryKey: ['my-profile', myEmpId],
    queryFn: () => employeesApi.get(myEmpId),
    enabled: !!myEmpId
  });

  return (
    <div className="page-container max-w-4xl space-y-6">
      <PageHeader 
        title="My Allocated Assets" 
        subtitle="Review hardware devices, sim cards, access codes, and subscriptions assigned to you."
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <Package size={16} className="text-indigo-500" /> Active Asset Assignments
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : emp && (emp as any).assignments && (emp as any).assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(emp as any).assignments.map((assignment: any) => {
              const asset = assignment.asset;
              if (!asset || assignment.returnedAt) return null;
              return (
                <div key={assignment.id} className="p-4 border border-slate-150 dark:border-slate-800 rounded-xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <Laptop size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{asset.type}</p>
                    <p className="text-xs font-mono font-semibold text-indigo-500">{asset.identifier}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold pt-1">
                      <Calendar size={12} />
                      <span>Assigned: {fmtDate(assignment.assignedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-8 text-center">No assets allocated to your account.</p>
        )}
      </div>
    </div>
  );
}
