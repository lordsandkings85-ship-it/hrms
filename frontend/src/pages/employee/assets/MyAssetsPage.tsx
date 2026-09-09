import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesApi, assetsApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { Laptop, Package, Calendar } from 'lucide-react';
import { fmtDate } from '../../../utils/formatDate';

export default function MyAssetsPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';

  const { data: emp, isLoading: loadingProfile } = useQuery({
    queryKey: ['my-profile', myEmpId],
    queryFn: () => employeesApi.get(myEmpId),
    enabled: !!myEmpId,
  });

  const { data: myAssetsList, isLoading: loadingMyAssets } = useQuery({
    queryKey: ['my-allocated-assets'],
    queryFn: () => assetsApi.myAssets(),
  });

  const { data: allAssets, isLoading: loadingAllAssets } = useQuery({
    queryKey: ['all-assets-fallback'],
    queryFn: () => assetsApi.list(),
  });

  const isLoading = loadingProfile && loadingMyAssets && loadingAllAssets;

  const activeAssignments = useMemo(() => {
    // 1. Direct from assets/my endpoint
    if (Array.isArray(myAssetsList) && myAssetsList.length > 0) {
      return myAssetsList.filter((a: any) => !a.returnedAt && a.asset);
    }
    // 2. From employee profile assignments
    if (emp && Array.isArray((emp as any).assignments) && (emp as any).assignments.length > 0) {
      return (emp as any).assignments.filter((a: any) => !a.returnedAt && a.asset);
    }
    // 3. Fallback: match from company assets
    if (Array.isArray(allAssets) && allAssets.length > 0 && myEmpId) {
      const matched: any[] = [];
      for (const asset of allAssets) {
        if (Array.isArray(asset.assignments)) {
          for (const a of asset.assignments) {
            if ((a.employeeId === myEmpId || a.employee?.id === myEmpId) && !a.returnedAt) {
              matched.push({ ...a, asset });
            }
          }
        }
      }
      return matched;
    }
    return [];
  }, [myAssetsList, emp, allAssets, myEmpId]);

  return (
    <div className="page-container max-w-4xl space-y-6">
      <PageHeader 
        title="My Allocated Assets" 
        subtitle="Review hardware devices, sim cards, access codes, and subscriptions assigned to you."
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <Package size={16} className="text-indigo-500" /> Active Asset Assignments
          {activeAssignments.length > 0 && (
            <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20">
              {activeAssignments.length}
            </span>
          )}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : activeAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAssignments.map((assignment: any) => {
              const asset = assignment.asset;
              if (!asset) return null;
              return (
                <div key={assignment.id} className="p-4 border border-slate-150 dark:border-slate-800 rounded-xl flex items-start gap-4 hover:border-indigo-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <Laptop size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{asset.type}</p>
                    <p className="text-xs font-mono font-semibold text-indigo-500">{asset.identifier || '—'}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold pt-1">
                      <Calendar size={12} />
                      <span>Assigned: {assignment.assignedAt ? fmtDate(assignment.assignedAt) : 'Active'}</span>
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
