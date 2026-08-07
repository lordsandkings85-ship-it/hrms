import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, IndianRupee, ArrowUpRight, Calendar, Download,
  Award, ChevronRight, BarChart3, Clock, CheckCircle, Building2,
  Sparkles, Info, User, Briefcase, Loader2
} from 'lucide-react';
import { payrollApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';

interface SalaryRevision {
  id: string;
  effectiveFrom: string;
  revisedCTC: number;
  previousCTC: number;
  incrementAmount: number;
  incrementPercent: number;
  reason: string;
  remarks?: string;
  approvedBy?: string;
  components: {
    label: string;
    previous: number;
    revised: number;
  }[];
}

const REASON_CFG = {
  annual_appraisal: { label: 'Annual Appraisal', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Award },
  promotion: { label: 'Promotion', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Sparkles },
  market_correction: { label: 'Market Correction', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: BarChart3 },
  performance_bonus: { label: 'Performance Bonus', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
  joining: { label: 'Joining CTC', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: User },
};

export default function SalaryRevisionHistoryPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';

  const { data: revisions, isLoading } = useQuery({
    queryKey: ['salary-revisions', myEmpId],
    queryFn: () => payrollApi.getSalaryRevisions(myEmpId),
    enabled: !!myEmpId,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDownloadLetter = (rev: any) => {
    const cfg = REASON_CFG[rev.reason as keyof typeof REASON_CFG] || REASON_CFG.annual_appraisal;
    const content = `Increment Letter\nEffective Date: ${rev.effectiveFrom}\nRevised CTC: ₹${rev.revisedCTC.toLocaleString('en-IN')}\nReason: ${cfg.label}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Increment_Letter_${rev.effectiveFrom}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container max-w-5xl space-y-6">
      <PageHeader 
        title="Salary Revision History" 
        subtitle="Track your compensation growth, increments, and download increment letters."
        icon={TrendingUp}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !revisions || revisions.length === 0 ? (
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Briefcase size={48} className="text-[var(--text-muted)] opacity-50 mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Revisions Found</h3>
          <p className="text-sm text-[var(--text-muted)]">No salary revisions are recorded for your profile yet.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Current CTC</div>
              <div className="text-xl font-black text-[var(--text-primary)] font-mono mt-1">₹{revisions[0].revisedCTC.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Growth Since Joining</div>
              <div className="text-xl font-black text-emerald-500 font-mono mt-1 flex items-center gap-1">
                <ArrowUpRight size={18} />
                {Math.round(((revisions[0].revisedCTC - revisions[revisions.length - 1].revisedCTC) / (revisions[revisions.length - 1].revisedCTC || 1)) * 100)}%
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Latest Increment</div>
              <div className="text-xl font-black text-indigo-500 font-mono mt-1">₹{revisions[0].incrementAmount.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Revisions</div>
              <div className="text-xl font-black text-[var(--text-primary)] font-mono mt-1">{revisions.length - 1}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative pl-4 md:pl-8 before:absolute before:inset-y-0 before:left-[27px] md:before:left-[43px] before:w-0.5 before:bg-[var(--border)] before:rounded-full space-y-8">
            {revisions.map((rev: any, index: number) => {
              const cfg = REASON_CFG[rev.reason as keyof typeof REASON_CFG] || REASON_CFG.annual_appraisal;
              const Icon = cfg.icon;
              const isLatest = index === 0;
              const isExpanded = expandedId === rev.id;

              return (
                <div key={rev.id} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[27px] md:-left-[43px] top-5 w-4 h-4 rounded-full border-4 border-[var(--surface)] shadow-sm z-10 ${isLatest ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  
                  <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-shadow">
                    
                    {/* Header Card (Clickable) */}
                    <div 
                      onClick={() => toggleExpand(rev.id)}
                      className="p-5 sm:p-6 cursor-pointer select-none"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-[var(--text-primary)] font-mono flex items-center gap-1">
                              <IndianRupee size={16} className="text-[var(--text-muted)]" />
                              {rev.revisedCTC.toLocaleString('en-IN')}
                            </h3>
                            {rev.incrementPercent > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-500">
                                <ArrowUpRight size={12} /> {rev.incrementPercent}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
                            <span className="flex items-center gap-1"><Calendar size={13} /> Effective: {new Date(rev.effectiveFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                              <Icon size={10} /> {cfg.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                          {rev.reason !== 'joining' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadLetter(rev); }}
                              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors"
                            >
                              <Download size={14} /> Letter
                            </button>
                          )}
                          <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                            <ChevronRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-6">
                        
                        {/* Summary & Remarks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Remarks</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{rev.remarks || 'No remarks provided.'}</p>
                          </div>
                          {rev.approvedBy && (
                            <div className="space-y-1 sm:text-right">
                              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Approved By</p>
                              <p className="text-sm font-medium text-[var(--text-primary)] flex items-center sm:justify-end gap-1">
                                <CheckCircle size={14} className="text-emerald-500" /> {rev.approvedBy}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Components Comparison Table */}
                        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-alt)] border-b border-[var(--border)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                <th className="p-3">Salary Component</th>
                                <th className="p-3 text-right">Previous (₹)</th>
                                <th className="p-3 text-right">Revised (₹)</th>
                                <th className="p-3 text-right text-emerald-500">Diff (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {rev.components.map((comp: any, i: number) => (
                                <tr key={i} className="hover:bg-[var(--surface-hover)] transition-colors text-xs">
                                  <td className="p-3 font-semibold text-[var(--text-primary)]">{comp.label}</td>
                                  <td className="p-3 text-right font-mono text-[var(--text-muted)]">{comp.previous > 0 ? comp.previous.toLocaleString('en-IN') : '-'}</td>
                                  <td className="p-3 text-right font-mono font-bold text-[var(--text-primary)]">{comp.revised.toLocaleString('en-IN')}</td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-500">
                                    {(comp.revised - comp.previous) > 0 ? `+${(comp.revised - comp.previous).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-[var(--surface-alt)] border-t border-[var(--border)]">
                              <tr className="text-xs font-bold text-[var(--text-primary)]">
                                <td className="p-3">Total (CTC)</td>
                                <td className="p-3 text-right font-mono">{rev.previousCTC > 0 ? rev.previousCTC.toLocaleString('en-IN') : '-'}</td>
                                <td className="p-3 text-right font-mono text-indigo-500">{rev.revisedCTC.toLocaleString('en-IN')}</td>
                                <td className="p-3 text-right font-mono text-emerald-500">
                                  {rev.incrementAmount > 0 ? `+${rev.incrementAmount.toLocaleString('en-IN')}` : '-'}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
