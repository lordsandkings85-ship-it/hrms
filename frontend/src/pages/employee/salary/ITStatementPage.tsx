import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileBarChart, IndianRupee, TrendingUp, TrendingDown, Shield,
  Download, Printer, Calendar, CheckCircle, Info, ChevronRight,
  Building2, User, Calculator, BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { taxApi } from '../../../api/client';
import { Spinner } from '../../../components/ui/Spinner';

const FY_LIST = ['FY 2025-26', 'FY 2024-25', 'FY 2023-24'];

export default function ITStatementPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const [selectedFY, setSelectedFY] = useState(FY_LIST[0]);

  const { data: st, isLoading } = useQuery({
    queryKey: ['it-statement', myEmpId, selectedFY],
    queryFn: () => taxApi.getITStatement(myEmpId, selectedFY),
    enabled: !!myEmpId,
  });

  return (
    <div className="page-container max-w-5xl space-y-6">
      <PageHeader 
        title="Income Tax Statement" 
        subtitle="Detailed computation of your taxable income, deductions, and tax liability."
        icon={Calculator}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FY_LIST.map((fy) => (
          <button
            key={fy}
            onClick={() => setSelectedFY(fy)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              selectedFY === fy
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            {fy}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !st ? (
        <div className="text-center py-12 text-[var(--text-muted)]">No data available for this financial year.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-xs">
              <h3 className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-4">Tax Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Taxable Income</p>
                  <p className="text-2xl font-black text-[var(--text-primary)] font-mono">₹{st.taxableIncome.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Net Tax Liability</p>
                  <p className="text-xl font-bold text-rose-500 font-mono">₹{st.totalTaxLiability.toLocaleString()}</p>
                </div>
                <div className="pt-3 border-t border-[var(--border)] flex justify-between items-center">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Regime</p>
                  <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded font-bold text-xs capitalize">{st.regime}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border)] flex items-center gap-2">
                <BarChart3 className="text-indigo-500" size={16} /> Income & Deductions Breakdown
              </h3>
              <div className="space-y-3">
                {st.income.map((inc: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className={inc.sub ? "text-[var(--text-muted)] ml-4" : "font-semibold text-[var(--text-primary)]"}>{inc.label}</span>
                    <span className="font-mono text-[var(--text-primary)]">₹{inc.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm font-bold border-t border-[var(--border)] pt-2 mt-2">
                  <span>Gross Total Income</span>
                  <span className="font-mono text-indigo-500">₹{st.grossIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
