import { useLocation } from 'react-router-dom';
import { AttendanceProcessSection, RunPayrollSection, ProcessedSection, SendPayslipsSection } from './sections/ProcessSections';
import { PayoutsSection } from './sections/PayoutSections';
import { PayslipSection, StructureSection, HistorySection } from './sections/EmployeeSections';
import { PayrollCalendarSection, PayrollMastersSection, PayrollHeadsSection } from './sections/LocalConfigSections';
import { isAdminOrHr } from '../../../utils/role';
import { useAuthStore } from '../../../store/useAuthStore';

type TabKey =
  | 'attendance-process' | 'additional-payout' | 'monthly' | 'processed' | 'send-payslips'
  | 'structure' | 'arrears' | 'history' | 'bonus'
  | 'calendar' | 'masters' | 'heads' | 'payslips';

const SUB_TO_TAB: Record<string, TabKey> = {
  'attendance-process': 'attendance-process',
  'additional-payout': 'additional-payout',
  monthly: 'monthly',
  processed: 'processed',
  'send-payslips': 'send-payslips',
  structure: 'structure',
  arrears: 'arrears',
  history: 'history',
  bonus: 'bonus',
  calendar: 'calendar',
  masters: 'masters',
  heads: 'heads',
  payslips: 'payslips',
};

const content: Record<TabKey, React.ReactNode> = {
  'attendance-process': <AttendanceProcessSection />,
  'additional-payout': <PayoutsSection type="additional-payout" />,
  monthly: <RunPayrollSection />,
  processed: <ProcessedSection />,
  'send-payslips': <SendPayslipsSection />,
  structure: <StructureSection />,
  arrears: <PayoutsSection type="arrears" />,
  history: <HistorySection />,
  bonus: <PayoutsSection type="bonus" />,
  calendar: <PayrollCalendarSection />,
  masters: <PayrollMastersSection />,
  heads: <PayrollHeadsSection />,
  payslips: <PayslipSection />,
};

export default function PayrollAdminPage() {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'attendance-process';
  const user = useAuthStore((s) => s.user);

  const tab = SUB_TO_TAB[subAction] || 'attendance-process';

  if (!isAdminOrHr(user)) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Payroll</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Process salary, manage payouts and configure payroll rules.</p>
        </div>
      </div>
      {content[tab]}
    </div>
  );
}
