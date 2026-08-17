import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Download, Calendar, CheckCircle, Clock, Shield,
  Building2, User, IndianRupee, TrendingUp, Eye, Loader2,
  Info, ChevronRight, Printer, ExternalLink
} from 'lucide-react';
import { taxApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { generateForm16PDF } from '../../../utils/form16PDF';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';

export default function Form16Page() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';

  const { data: form16List, isLoading } = useQuery({
    queryKey: ['form16', myEmpId],
    queryFn: () => taxApi.getForm16(myEmpId),
    enabled: !!myEmpId,
  });

  const [selectedYear, setSelectedYear] = useState('FY 2025-26');
  const selectedData = form16List?.find((d: any) => d.financialYear === selectedYear) || form16List?.[0];

  const handleDownload = () => {
    if (!selectedData) return;
    const name = [user?.employee?.firstName, user?.employee?.lastName].filter(Boolean).join(' ') || user?.email || '';
    generateForm16PDF(selectedData, { name, code: user?.employee?.employeeCode, pan: user?.employee?.pan });
  };

  return (
    <div className="page-container max-w-6xl space-y-6">
      <PageHeader 
        title="Form 16 & TDS Certificates" 
        subtitle="View and download your annual Form 16 certificates for tax filing."
      />

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left sidebar: FY Selector */}
        <div className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Financial Year</h3>
            {isLoading ? (
              <div className="py-4 flex justify-center"><Spinner /></div>
            ) : form16List ? (
              <div className="space-y-2">
                {form16List.map((d: any) => (
                  <button
                    key={d.financialYear}
                    onClick={() => setSelectedYear(d.financialYear)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      selectedYear === d.financialYear 
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                        : 'bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className={selectedYear === d.financialYear ? 'text-indigo-100' : 'text-[var(--text-muted)]'} />
                      {d.financialYear}
                    </span>
                    {d.status === 'issued' && <CheckCircle size={14} className={selectedYear === d.financialYear ? 'text-white' : 'text-emerald-500'} />}
                    {d.status !== 'issued' && <Clock size={14} className={selectedYear === d.financialYear ? 'text-white' : 'text-amber-500'} />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No records found.</p>
            )}
          </div>
        </div>

        {/* Right Content: Selected Form 16 details */}
        <div className="flex-1">
          {isLoading ? (
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-12 flex justify-center"><Spinner /></div>
          ) : !selectedData ? (
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <FileText size={48} className="text-[var(--text-muted)] opacity-50 mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Data Available</h3>
              <p className="text-sm text-[var(--text-muted)]">Form 16 data is not available for the selected year.</p>
            </div>
          ) : (
            <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-xs animate-in fade-in zoom-in-95 duration-300">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-6 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="text-indigo-500" /> Form 16 – {selectedData.financialYear}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    {selectedData.status === 'issued' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle size={12} /> Officially Issued
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Clock size={12} /> Processing / Preliminary
                      </span>
                    )}
                    <span className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                      <Shield size={12} /> Generated from payroll records
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={handleDownload}
                    disabled={selectedData.status !== 'issued'}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    <Download size={16} /> Download PDF
                  </button>
                </div>
              </div>

              {/* Part A & Part B summary blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Part A */}
                <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                    <Building2 size={16} className="text-indigo-500" /> Part A (TDS Deducted)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Deducted</p>
                      <p className="text-lg font-black text-rose-500 font-mono mt-0.5">₹{selectedData.partA.totalTaxDeducted.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Deposited</p>
                      <p className="text-lg font-black text-emerald-500 font-mono mt-0.5">₹{selectedData.partA.totalTaxDeposited.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Part B */}
                <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                    <User size={16} className="text-indigo-500" /> Part B (Income Details)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Gross Salary</p>
                      <p className="text-lg font-black text-[var(--text-primary)] font-mono mt-0.5">₹{selectedData.partB.grossSalary.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Net Tax Payable</p>
                      <p className="text-lg font-black text-rose-500 font-mono mt-0.5">₹{selectedData.partB.totalTaxPayable.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
