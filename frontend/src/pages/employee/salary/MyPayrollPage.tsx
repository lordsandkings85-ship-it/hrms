import { useQuery } from '@tanstack/react-query';
import { payrollApi, payrollApiExt } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { Banknote, TrendingUp, Download, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/ui/DataTable';
import { generatePayslipPDF } from '../../../utils/payslipPDF';

type TabKey = 'payslips' | 'structure';

const SUB_TO_TAB: Record<string, TabKey> = {
  structure: 'structure'
};

const TAB_TO_SUB: Record<TabKey, string> = {
  payslips: '',
  structure: 'structure'
};

export default function MyPayrollPage() {
  const { user } = useAuthStore();
  const myEmpId = user?.employee?.id || '';
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>(sub ? SUB_TO_TAB[sub] || 'payslips' : 'payslips');

  useEffect(() => {
    if (sub && SUB_TO_TAB[sub]) {
      setTab(SUB_TO_TAB[sub]);
    }
  }, [sub]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/payroll${TAB_TO_SUB[t] ? `/${TAB_TO_SUB[t]}` : ''}`);
  };

  // Queries
  const { data: payslips, isLoading: isLoadingPayslips } = useQuery({
    queryKey: ['my-payslips', myEmpId],
    queryFn: () => payrollApi.getPayslips(myEmpId),
    enabled: !!myEmpId,
  });

  const { data: salaryStructure, isLoading: isLoadingStructure } = useQuery({
    queryKey: ['my-salary-structure', myEmpId],
    queryFn: () => payrollApi.getSalaryStructure(myEmpId),
    enabled: !!myEmpId,
  });

  const grossMonthly = salaryStructure
    ? (salaryStructure.basic + salaryStructure.hra + salaryStructure.da +
       salaryStructure.conveyance + salaryStructure.medical + salaryStructure.specialAllowance)
    : 0;

  const downloadPayslip = async (payslip: any) => {
    const full = await payrollApiExt.getPayslipDetail(payslip.id);
    await generatePayslipPDF({
      payslip: full,
      employee: full.employee || user?.employee,
      company: { name: user?.company?.name || 'Company' },
    });
  };

  const payslipColumns = [
    {
      header: 'Month / Year',
      key: 'payrollCycle',
      render: (row: any) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {row.payrollCycle?.month}/{row.payrollCycle?.year}
        </span>
      )
    },
    {
      header: 'Net Pay',
      key: 'netPay',
      render: (row: any) => (
        <span className="font-bold text-emerald-500 font-mono">
          ₹{row.netPay?.toLocaleString('en-IN') || 0}
        </span>
      )
    },
    {
      header: 'Download Link',
      key: 'id',
      render: (row: any) => (
        <button
          onClick={() => downloadPayslip(row)}
          className="btn-ghost text-xs text-indigo-500 hover:bg-indigo-500/5 px-2.5 py-1.5 flex items-center gap-1.5"
        >
          <Download size={13} /> Download
        </button>
      )
    }
  ];

  return (
    <div className="page-container space-y-6">
      <PageHeader 
        title="My Salary & Payslips" 
        subtitle="Download payslips, review monthly salary structures, and view annual CTC details."
      />

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Gross Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Banknote size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Gross Salary</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">
              ₹{grossMonthly.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Annual CTC Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Annual CTC (Estimate)</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">
              ₹{(grossMonthly * 12).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0 pb-px">
        {[
          { id: 'payslips', label: 'Salary Slips', icon: Download },
          { id: 'structure', label: 'Salary Structure', icon: Award }
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors duration-200 shrink-0 ${
                active 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6">

        {tab === 'payslips' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Download size={16} className="text-indigo-500" /> Generated Salary Payslips
            </h3>
            {isLoadingPayslips ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : payslips && payslips.length > 0 ? (
              <DataTable data={payslips} columns={payslipColumns} keyField="id" />
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">No payslips generated yet.</p>
            )}
          </div>
        )}

        {tab === 'structure' && (
          <div className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Award size={16} className="text-indigo-500" /> Current Salary Breakup
            </h3>
            {isLoadingStructure ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : salaryStructure ? (
              <div className="space-y-3">
                {[
                  { label: 'Basic Pay', value: salaryStructure.basic },
                  { label: 'House Rent Allowance (HRA)', value: salaryStructure.hra },
                  { label: 'Dearness Allowance (DA)', value: salaryStructure.da },
                  { label: 'Conveyance Allowance', value: salaryStructure.conveyance },
                  { label: 'Medical Allowance', value: salaryStructure.medical },
                  { label: 'Special Allowance', value: salaryStructure.specialAllowance }
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">₹{(item.value ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 text-sm font-black text-slate-850 dark:text-slate-100 pt-4">
                  <span>Gross Monthly Total</span>
                  <span className="font-mono text-indigo-500">₹{grossMonthly.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No salary structure defined yet.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
