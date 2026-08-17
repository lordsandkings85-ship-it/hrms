import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { employeesApi, payrollApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeePayslipPage() {
  const [employeeId, setEmployeeId] = useState('');

  const { data: employees } = useQuery({ queryKey: ['employees-list'], queryFn: () => employeesApi.list({ pageSize: 100 }) });
  const empList = (employees as any)?.items ?? [];

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['payslips', employeeId],
    queryFn: () => payrollApi.getPayslips(employeeId),
    enabled: !!employeeId,
  });
  const payslipList = Array.isArray(payslips) ? payslips : [];

  const columns: Column<any>[] = [
    { key: 'month', header: 'Month', render: (row: any) => (
      <span className="font-bold text-[var(--text-primary)]">{row.payrollCycle ? `${MONTHS[(row.payrollCycle.month || 1) - 1]} ${row.payrollCycle.year}` : '—'}</span>
    )},
    { key: 'grossPay', header: 'Gross Salary', render: (row: any) => <span className="font-mono text-[var(--text-primary)]">₹{Number(row.grossPay || 0).toLocaleString('en-IN')}</span> },
    { key: 'totalDeductions', header: 'Deductions', render: (row: any) => <span className="font-mono text-red-500">- ₹{Number(row.totalDeductions || 0).toLocaleString('en-IN')}</span> },
    { key: 'netPay', header: 'Net Pay', render: (row: any) => <span className="font-bold text-emerald-600">₹{Number(row.netPay || 0).toLocaleString('en-IN')}</span> },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.payrollCycle?.status || 'processed'} /> },
    { key: 'generatedAt', header: 'Generated On', render: (row: any) => <span className="font-mono text-xs text-[var(--text-muted)]">{row.generatedAt ? new Date(row.generatedAt).toLocaleDateString('en-IN') : '—'}</span> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Employee Payslips</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">View payslips generated for any employee.</p>
          </div>
        </div>
        <select
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          className="input max-w-xs"
          aria-label="Select employee"
        >
          <option value="">Select employee…</option>
          {empList.map((e: any) => (
            <option key={e.id} value={e.id}>{e.employeeCode} — {e.firstName} {e.lastName}</option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Payslips
              {employeeId && (
                <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20">{payslipList.length}</span>
              )}
            </h3>
          </div>
        </div>

        {!employeeId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={36} className="text-[var(--text-muted)]/40 mb-3" />
            <p className="text-sm text-[var(--text-muted)] font-medium">Select an employee to view their payslips</p>
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
            <DataTable columns={columns} data={payslipList} loading={isLoading} keyField="id" exportFilename="payslips.csv" />
          </div>
        )}
      </div>
    </div>
  );
}
