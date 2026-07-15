import { useAuthStore } from '../../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '../../api/client';
import { 
  User, CheckCircle, Fingerprint, Calendar, Banknote, ShieldAlert, Download
} from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const emp = user?.employee;

  const { data: salaryStructure } = useQuery({
    queryKey: ['salary-structure', emp?.id],
    queryFn: () => payrollApi.getSalaryStructure(emp!.id),
    enabled: !!emp,
  });

  const { data: payslips } = useQuery({
    queryKey: ['payslips', emp?.id],
    queryFn: () => payrollApi.getPayslips(emp!.id),
    enabled: !!emp,
  });

  if (!emp) {
    return <div className="p-8">Loading employee details...</div>;
  }

  const latestPayslip = payslips?.[0];
  const grossMonthly = salaryStructure ? 
    (salaryStructure.basic + salaryStructure.hra + salaryStructure.da + salaryStructure.conveyance + salaryStructure.medical + salaryStructure.specialAllowance) 
    : 0;
  const ctc = grossMonthly * 12;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="bg-white border border-line rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-ledger/10 text-ledger rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {emp.firstName}!</h1>
            <p className="text-sm text-muted mt-1">
              {emp.employeeCode} &bull; {emp.status === 'active' ? 'Active Employee' : emp.status}
              &bull; {emp.workingDaysPerWeek || 5} Days/Week
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/attendance" className="flex items-center gap-2 bg-ledger hover:bg-ledgerDark text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow">
            <Fingerprint size={16} /> Mark Attendance
          </Link>
          <Link to="/leave" className="flex items-center gap-2 bg-white border border-line hover:border-muted px-4 py-2 rounded-md text-sm font-semibold transition-colors">
            <Calendar size={16} /> Apply Leave
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Compliance & Tax Info</h2>
            <ShieldAlert size={18} className="text-muted" />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-line">
              <span className="text-sm font-medium text-muted">UAN (Provident Fund)</span>
              <span className="text-sm font-mono font-medium">{emp.uan || 'Not Provided'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line">
              <span className="text-sm font-medium text-muted">PF Account Number</span>
              <span className="text-sm font-mono font-medium">{emp.pfNumber || 'Not Provided'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line">
              <span className="text-sm font-medium text-muted">ESIC Number</span>
              <span className="text-sm font-mono font-medium">{emp.esic || 'Not Provided'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line">
              <span className="text-sm font-medium text-muted">PAN Card</span>
              <span className="text-sm font-mono font-medium">{emp.pan || 'Not Provided'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line">
              <span className="text-sm font-medium text-muted">Aadhaar Card</span>
              <span className="text-sm font-mono font-medium">{emp.aadhaar || 'Not Provided'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-muted">Annual CTC</span>
              <span className="text-sm font-mono font-medium text-ledger">
                {salaryStructure ? `₹${ctc.toLocaleString()}` : 'Not configured'}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white border border-line rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Recent Payroll Actions</h2>
            <Banknote size={18} className="text-muted" />
          </div>
          
          <div className="space-y-4">
            {latestPayslip ? (
              <div className="p-4 border border-line rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Latest Payslip</h3>
                  <p className="text-xs text-muted mt-1">
                    Month: {latestPayslip.payrollCycle?.month}/{latestPayslip.payrollCycle?.year}
                  </p>
                  <p className="text-xs font-mono mt-1 font-semibold">Net Pay: ₹{latestPayslip.netPay.toLocaleString()}</p>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-medium text-ledger hover:text-ledgerDark bg-ledger/10 px-3 py-1.5 rounded-md">
                  <Download size={14} /> Download
                </button>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-line rounded-lg text-center">
                <p className="text-xs text-muted">No payslips generated yet.</p>
              </div>
            )}

            <Link to="/tax-calculator" className="block p-4 border border-line rounded-lg hover:border-ledger transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-ledger transition-colors">Tax Declaration Tool</h3>
                  <p className="text-xs text-muted mt-1">Calculate tax under Old & New Regime</p>
                </div>
                <CheckCircle size={16} className="text-ledger opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </section>

        {/* New Attendance Summary Section */}
        <section className="bg-white border border-line rounded-xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">This Month's Attendance Summary</h2>
            <Fingerprint size={18} className="text-muted" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AttendanceSummaryWidget empId={emp.id} />
          </div>
        </section>
      </div>
    </div>
  );
}

// Sub-component to fetch and display the monthly attendance summary
import { attendanceApiExt } from '../../api/client';
function AttendanceSummaryWidget({ empId }: { empId: string }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ['attendance-summary', empId, currentYear, currentMonth],
    queryFn: () => attendanceApiExt.getMonthlySummary(empId, currentYear, currentMonth),
  });

  if (isLoading) return <div className="col-span-full text-xs text-muted p-4">Loading attendance data...</div>;
  if (!summary) return <div className="col-span-full text-xs text-muted p-4">No attendance data for this month yet.</div>;

  const totalWorkingDays = summary.present + summary.late + summary.absent + summary.halfDay + summary.onLeave;

  return (
    <>
      <div className="border border-line rounded-lg p-4 text-center hover:border-ledger transition-colors">
        <div className="text-2xl font-bold font-mono text-ink">{summary.present + summary.late + (summary.halfDay * 0.5)}</div>
        <div className="text-xs text-muted mt-1">Days Present</div>
      </div>
      <div className="border border-line rounded-lg p-4 text-center hover:border-ledger transition-colors">
        <div className="text-2xl font-bold font-mono text-ink">{summary.onLeave}</div>
        <div className="text-xs text-muted mt-1">Leaves Taken</div>
      </div>
      <div className="border border-line rounded-lg p-4 text-center hover:border-ledger transition-colors">
        <div className="text-2xl font-bold font-mono text-rust">{summary.absent}</div>
        <div className="text-xs text-muted mt-1">Days Absent</div>
      </div>
      <div className="border border-line rounded-lg p-4 text-center hover:border-ledger transition-colors">
        <div className="text-2xl font-bold font-mono text-ink">{totalWorkingDays}</div>
        <div className="text-xs text-muted mt-1">Total Expected Working Days</div>
      </div>
    </>
  );
}
