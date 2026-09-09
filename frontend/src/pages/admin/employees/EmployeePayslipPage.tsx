import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Building2, Eye, CheckCircle2 } from 'lucide-react';
import { employeesApi, payrollApi, payrollApiExt } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { generatePayslipPDF } from '../../../utils/payslipPDF';
import { useToast } from '../../../components/ui/ToastProvider';
import { PayslipPreviewModal } from '../../../components/payroll/PayslipPreviewModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeePayslipPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingPayslipId, setPreviewingPayslipId] = useState<string | null>(null);
  const { error } = useToast();

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 150 }),
  });
  const empList = (employees as any)?.items ?? [];

  const selectedEmployee = empList.find((e: any) => e.id === employeeId);

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['payslips', employeeId],
    queryFn: () => payrollApi.getPayslips(employeeId),
    enabled: !!employeeId,
  });
  const payslipList = Array.isArray(payslips) ? payslips : [];

  const handleDownload = async (payslip: any) => {
    try {
      setDownloadingId(payslip.id);
      const full = await payrollApiExt.getPayslipDetail(payslip.id);
      await generatePayslipPDF({
        payslip: full,
        employee: full.employee || selectedEmployee,
        company: full.employee?.company || selectedEmployee?.company,
      });
    } catch (err: any) {
      error(err.message || 'Failed to generate payslip PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'month',
      header: 'Payroll Period',
      render: (row: any) => (
        <span className="font-bold text-[var(--text-primary)]">
          {row.payrollCycle ? `${MONTHS[(row.payrollCycle.month || 1) - 1]} ${row.payrollCycle.year}` : '—'}
        </span>
      ),
    },
    {
      key: 'grossPay',
      header: 'Gross Salary',
      render: (row: any) => (
        <span className="font-mono text-[var(--text-primary)]">
          ₹{Math.round(Number(row.grossPay || 0)).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      render: (row: any) => (
        <span className="font-mono text-red-500">
          - ₹{Math.round(Number(row.totalDeductions || 0)).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      render: (row: any) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
          ₹{Math.round(Number(row.netPay || 0)).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.payrollCycle?.status || 'processed'} />,
    },
    {
      key: 'generatedAt',
      header: 'Generated On',
      render: (row: any) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {row.generatedAt ? new Date(row.generatedAt).toLocaleDateString('en-IN') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewingPayslipId(row.id)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={13} /> View
          </button>
          <button
            onClick={() => handleDownload(row)}
            disabled={downloadingId === row.id}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={13} /> {downloadingId === row.id ? 'Generating...' : 'Download'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employee Payslips</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
              View and download branded monthly salary slips with company identity and tax details.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="input max-w-sm font-medium"
            aria-label="Select employee"
          >
            <option value="">Select employee…</option>
            {empList.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.employeeCode} — {e.firstName} {e.lastName} ({e.company?.displayName || e.company?.name || 'Lords & Kings'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Payslips List
              {employeeId && (
                <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/20">
                  {payslipList.length}
                </span>
              )}
            </h3>
            {selectedEmployee && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                <Building2 size={12} className="text-purple-500" />
                <span>Assigned Company: <strong>{selectedEmployee.company?.displayName || selectedEmployee.company?.name || 'Lords and Kings'}</strong></span>
              </p>
            )}
          </div>
        </div>

        {!employeeId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText size={40} className="text-[var(--text-muted)]/40 mb-3" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Select an Employee</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Choose any employee from across the group to review and download their salary slips.</p>
          </div>
        ) : (
          <div className="premium-datatable">
            <style>{`
              .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
              .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
              .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
              .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
              .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
              .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
            `}</style>
            <DataTable
              columns={columns}
              data={payslipList}
              loading={isLoading}
              keyField="id"
              emptyTitle="No payslips found"
              emptyMessage="No payslips generated for this employee yet."
            />
          </div>
        )}
      </div>

      {/* Payslip Interactive View Modal */}
      <PayslipPreviewModal
        open={!!previewingPayslipId}
        onClose={() => setPreviewingPayslipId(null)}
        payslipId={previewingPayslipId}
        title={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} — Salary Slip` : 'Employee Payslip'}
      />
    </div>
  );
}

