import { useAuthStore } from '../../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { payrollApi, attendanceApiExt, leaveApi } from '../../api/client';
import { Fingerprint, Calendar, Download, Shield, ArrowRight, TrendingUp } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/Badge';

// SVG ring chart
function RingChart({ value, max, color = '#1F6F5C' }: { value: number; max: number; color?: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#E4E1D8" strokeWidth="10" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const emp = user?.employee;

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

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

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance-summary-dash', emp?.id, currentYear, currentMonth],
    queryFn: () => attendanceApiExt.getMonthlySummary(emp!.id, currentYear, currentMonth),
    enabled: !!emp,
  });

  const { data: leaveBalances } = useQuery({
    queryKey: ['leave-balances-dash', emp?.id],
    queryFn: () => leaveApi.balances(emp!.id, currentYear),
    enabled: !!emp,
  });

  if (!emp) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const latestPayslip = payslips?.[0];
  const grossMonthly = salaryStructure
    ? (salaryStructure.basic + salaryStructure.hra + salaryStructure.da +
       salaryStructure.conveyance + salaryStructure.medical + salaryStructure.specialAllowance)
    : 0;

  const presentDays  = summary ? summary.present + summary.late + (summary.halfDay * 0.5) : 0;
  const totalExpected = summary
    ? summary.present + summary.late + summary.absent + summary.halfDay + summary.onLeave
    : 0;

  return (
    <div className="page-container space-y-6">

      {/* ── Welcome Header ──────────────────────────── */}
      <div className="bg-white border border-line rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ledger/10 text-ledger flex items-center justify-center font-display font-bold text-lg flex-shrink-0">
            {emp.firstName[0]}{emp.lastName?.[0] ?? ''}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-ink">
                Welcome, {emp.firstName}!
              </h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="text-sm text-muted mt-0.5">
              {emp.employeeCode} · {emp.workingDaysPerWeek ?? 5} days/week
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Link to="/attendance" className="btn-primary text-sm">
            <Fingerprint size={15} /> Mark Attendance
          </Link>
          <Link to="/leave" className="btn-secondary text-sm">
            <Calendar size={15} /> Apply Leave
          </Link>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Attendance Ring */}
        <div className="section-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">This Month's Attendance</h2>
            <Fingerprint size={16} className="text-muted" />
          </div>
          {summaryLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : summary ? (
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <RingChart value={presentDays} max={totalExpected} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-lg font-bold text-ink">{presentDays}</span>
                  <span className="text-[10px] text-muted">/ {totalExpected}</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {[
                  { label: 'Present', value: summary.present + summary.late, color: 'bg-success' },
                  { label: 'On Leave', value: summary.onLeave, color: 'bg-warning' },
                  { label: 'Absent',  value: summary.absent,  color: 'bg-danger' },
                  { label: 'Half Day', value: summary.halfDay, color: 'bg-info' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.color} flex-shrink-0`} />
                    <span className="text-xs text-muted flex-1">{row.label}</span>
                    <span className="font-mono text-xs font-semibold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-6">No data yet for this month.</p>
          )}
          <Link to="/attendance" className="flex items-center gap-1 text-xs text-ledger font-semibold mt-4 hover:text-ledgerDark w-fit">
            View details <ArrowRight size={11} />
          </Link>
        </div>

        {/* Leave Balances */}
        <div className="section-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Leave Balances</h2>
            <Calendar size={16} className="text-muted" />
          </div>
          {leaveBalances && leaveBalances.length > 0 ? (
            <div className="space-y-3 flex-1">
              {leaveBalances.slice(0, 5).map((bal: any) => {
                const used = bal.used ?? 0;
                const total = bal.leaveType?.daysPerYear ?? bal.balance + used;
                const pct = total > 0 ? (used / total) * 100 : 0;
                return (
                  <div key={bal.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-ink">{bal.leaveType?.name}</span>
                      <span className="text-xs text-muted font-mono">{bal.balance} left</span>
                    </div>
                    <div className="h-1.5 bg-line rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ledger rounded-full transition-all"
                        style={{ width: `${100 - pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-6 flex-1 flex items-center justify-center">
              No leave types configured yet.
            </p>
          )}
          <Link to="/leave" className="flex items-center gap-1 text-xs text-ledger font-semibold mt-4 hover:text-ledgerDark w-fit">
            Apply leave <ArrowRight size={11} />
          </Link>
        </div>

        {/* Payslip + CTC */}
        <div className="section-card p-5 flex flex-col md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Payroll</h2>
            <TrendingUp size={16} className="text-muted" />
          </div>
          {salaryStructure && (
            <div className="p-3 bg-ledgerLight border border-ledger/15 rounded-xl mb-3">
              <p className="text-xs text-ledgerDark font-medium">Monthly Gross</p>
              <p className="font-mono text-2xl font-bold text-ledgerDark mt-0.5">
                ₹{grossMonthly.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-ledgerDark/60 mt-0.5">Annual CTC: ₹{(grossMonthly * 12).toLocaleString('en-IN')}</p>
            </div>
          )}
          {latestPayslip ? (
            <div className="flex items-center justify-between p-3 border border-line rounded-xl hover:border-ledger transition-colors group">
              <div>
                <p className="text-xs font-semibold text-ink">
                  Payslip — {latestPayslip.payrollCycle?.month}/{latestPayslip.payrollCycle?.year}
                </p>
                <p className="font-mono text-sm font-bold text-ledger mt-0.5">
                  ₹{latestPayslip.netPay?.toLocaleString('en-IN')} net
                </p>
              </div>
              <button 
                onClick={() => {
                  const content = `Payslip - ${latestPayslip.payrollCycle?.month}/${latestPayslip.payrollCycle?.year}\nNet Pay: Rs. ${latestPayslip.netPay}`;
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Payslip_${latestPayslip.payrollCycle?.month}_${latestPayslip.payrollCycle?.year}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn-ghost text-xs gap-1.5 group-hover:text-ledger"
              >
                <Download size={13} /> Download
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-4 border border-dashed border-line rounded-xl">
              No payslips generated yet.
            </p>
          )}
        </div>

        {/* Compliance Card */}
        <div className="section-card p-5 md:col-span-2 xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Compliance & Tax Info</h2>
            <Shield size={16} className="text-muted" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'UAN (PF)',     value: emp.uan },
              { label: 'PF Number',   value: emp.pfNumber },
              { label: 'ESIC',        value: emp.esic },
              { label: 'PAN Card',    value: emp.pan },
              { label: 'Aadhaar',     value: emp.aadhaar },
            ].map(item => (
              <div key={item.label} className="p-3 bg-paperDim rounded-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">{item.label}</p>
                <p className={`text-xs font-mono font-semibold truncate ${item.value ? 'text-ink' : 'text-muted/50'}`}>
                  {item.value ?? '— Not provided'}
                </p>
                {item.value && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold text-success-dark bg-success-light px-1.5 py-0.5 rounded-full">
                    ✓ On file
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
