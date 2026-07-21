
import { useAuthStore } from '../../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { payrollApi, attendanceApiExt, leaveApi } from '../../api/client';
import { Fingerprint, Calendar, Download, Shield, ArrowRight, TrendingUp } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/Badge';

// SVG ring chart using CSS variables
function RingChart({ value, max, color = 'var(--info)' }: { value: number; max: number; color?: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
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
      <div className="section-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden glass animate-slideDown shadow-lg">
        {/* Abstract animated background element */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0 shadow-sm" style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}>
            {emp.firstName[0]}{emp.lastName?.[0] ?? ''}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink drop-shadow-sm">
                Welcome, {emp.firstName}!
              </h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="text-sm mt-1 font-medium text-muted">
              {emp.employeeCode} · {emp.workingDaysPerWeek ?? 5} days/week
            </p>
          </div>
        </div>
        <div className="relative z-10 flex gap-2.5 mt-4 md:mt-0">
          <Link to="/attendance" className="btn-primary text-sm hover:scale-105 transition-transform duration-300">
            <Fingerprint size={15} /> Mark Attendance
          </Link>
          <Link to="/leave" className="btn-secondary text-sm hover:scale-105 transition-transform duration-300">
            <Calendar size={15} /> Apply Leave
          </Link>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Attendance Ring */}
        <div className="section-card p-5 flex flex-col animate-slideUp hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>This Month's Attendance</h2>
            <Fingerprint size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          {summaryLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : summary ? (
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <RingChart value={presentDays} max={totalExpected} color="var(--success)" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{presentDays}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ {totalExpected}</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {[
                  { label: 'Present', value: summary.present + summary.late, color: 'var(--success)' },
                  { label: 'On Leave', value: summary.onLeave, color: 'var(--warning)' },
                  { label: 'Absent',  value: summary.absent,  color: 'var(--danger)' },
                  { label: 'Half Day', value: summary.halfDay, color: 'var(--info)' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                    <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No data yet for this month.</p>
          )}
          <Link to="/attendance" className="flex items-center gap-1 text-xs font-semibold mt-4 w-fit transition-colors" style={{ color: 'var(--info)' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
            View details <ArrowRight size={11} />
          </Link>
        </div>

        {/* Leave Balances */}
        <div className="section-card p-5 flex flex-col animate-slideUp hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Leave Balances</h2>
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
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
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{bal.leaveType?.name}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{bal.balance} left</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-active)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${100 - pct}%`, background: 'var(--info)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-center py-6 flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No leave types configured yet.
            </p>
          )}
          <Link to="/leave" className="flex items-center gap-1 text-xs font-semibold mt-4 w-fit transition-colors" style={{ color: 'var(--info)' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
            Apply leave <ArrowRight size={11} />
          </Link>
        </div>

        {/* Payslip + CTC */}
        <div className="section-card p-5 flex flex-col md:col-span-2 xl:col-span-1 animate-slideUp hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Payroll</h2>
            <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          {salaryStructure && (
            <div className="p-4 rounded-xl mb-3" style={{ background: 'var(--surface-active)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Monthly Gross</p>
              <p className="font-mono text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                ₹{grossMonthly.toLocaleString('en-IN')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Annual CTC: ₹{(grossMonthly * 12).toLocaleString('en-IN')}</p>
            </div>
          )}
          {latestPayslip ? (
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors group" style={{ border: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Payslip — {latestPayslip.payrollCycle?.month}/{latestPayslip.payrollCycle?.year}
                </p>
                <p className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--success)' }}>
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
                className="btn-ghost text-xs gap-1.5"
              >
                <Download size={13} /> Download
              </button>
            </div>
          ) : (
            <p className="text-xs text-center py-4 border border-dashed rounded-xl" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              No payslips generated yet.
            </p>
          )}
        </div>

        {/* Compliance Card */}
        <div className="section-card p-5 md:col-span-2 xl:col-span-3 animate-slideUp hover:shadow-xl transition-shadow duration-300" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Compliance & Tax Info</h2>
            <Shield size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'UAN (PF)',     value: emp.uan },
              { label: 'PF Number',   value: emp.pfNumber },
              { label: 'ESIC',        value: emp.esic },
              { label: 'PAN Card',    value: emp.pan },
              { label: 'Aadhaar',     value: emp.aadhaar },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-active)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className={`text-xs font-mono font-semibold truncate`} style={{ color: item.value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {item.value ?? '— Not provided'}
                </p>
                {item.value && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
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
