
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, Fingerprint, CalendarDays, Banknote, Briefcase,
  TrendingUp, FileText, Laptop, Receipt, Plane, Clock3, ListChecks,
  FolderKanban, Megaphone, GraduationCap, Building2, BarChart3, Settings,
  CreditCard, Plug, ShieldCheck, LogOut, Calculator, UserMinus, HandCoins, UserCheck,
  ChevronLeft, ChevronDown, ChevronRight, Bell, Menu, Moon, Sun, Monitor, Command, Headphones, Mail, Sparkles,
  User, Calendar, Target, CheckSquare
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { dashboardApi } from '../../api/client';
import { useTheme, type ThemeMode } from '../../components/ui/ThemeProvider';
import CommandPalette from '../../components/ui/CommandPalette';
import workoraIcon from '../../assets/brand/workora-icon.png';

type NavChild = {
  to?: string;
  label: string;
  children?: { to: string; label: string }[];
};

type NavItem = {
  to?: string;
  label: string;
  icon?: React.ElementType;
  adminOnly?: boolean;
  systemAdminOnly?: boolean;
  globalAdminOnly?: boolean;
  children?: NavChild[];
};

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Navigation',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        to: '/employees',
        label: 'Employees',
        icon: Users,
        adminOnly: true,
        children: [
          { to: '/employees', label: 'All Employees' },
          { to: '/payroll/structure', label: 'Salary' },
          { to: '/shifts', label: 'Shift Assign' },
          { to: '/employees/resignation', label: 'Resigned/Separation' },
          { to: '/fnf', label: 'Final Settlement' },
          { to: '/payroll/payslips', label: 'Payslip' },
          { to: '/assets', label: 'Assets' },
          { to: '/expenses', label: 'Loans/Salary Advances' },
          { to: '/employees/compliance', label: 'Bulk Compliance Update' },
          { to: '/settings/credentials', label: 'Send Employee Login Credentials' },
          { to: '/organization/import', label: 'Import Reporting Managers & EmailId' },
          { to: '/employees/transfer', label: 'Transfer' },
        ],
      },
      {
        to: '/tax-calculator',
        label: 'TDS Details',
        icon: Calculator,
        children: [
          { to: '/tax-calculator', label: 'Tax Liability' },
          { to: '/tax-calculator/pending', label: 'Pending Employee TDS Declarations' },
          { to: '/tax-calculator/master', label: 'Employee TDS Declaration Master' },
          { to: '/tax-calculator/declarations', label: 'Employee TDS Declaration List' },
        ],
      },
      {
        to: '/attendance',
        label: 'Attendance',
        icon: Fingerprint,
        children: [
          { to: '/attendance/daily', label: 'Apply Attendance' },
          { to: '/attendance/manual', label: 'Update Attendance' },
          { to: '/attendance/custom', label: 'Emp Custom Daily Attendance' },
          { to: '/attendance/regularization', label: 'Attendance Regularisation' },
          { to: '/attendance/overtime', label: 'Overtime' },
          { to: '/attendance/geofence', label: 'Geo Attendance' },
          { to: '/attendance/daily-report', label: 'Daily Attendance Report' },
          { to: '/attendance/summary', label: 'Monthly Attendance Report' },
        ],
      },
      {
        to: '/leave',
        label: 'Leave Details',
        icon: CalendarDays,
        children: [
          { to: '/leave/requests', label: 'Leave Requests List' },
          { to: '/leave/balances', label: 'Leave Balance' },
          { to: '/leave/compoff', label: 'Comp Off' },
        ],
      },
      {
        to: '/payroll',
        label: 'Salary',
        icon: Banknote,
        adminOnly: true,
        children: [
          { to: '/payroll/attendance-process', label: 'Attendance Process' },
          { to: '/payroll/additional-payout', label: 'Additional Salary Payout' },
          { to: '/payroll/monthly', label: 'Run Payroll' },
          { to: '/payroll/processed', label: 'View Processed Salary' },
          { to: '/payroll/send-payslips', label: 'Send Payslips' },
        ],
      },
      {
        to: '/payroll/structure',
        label: 'Salary Revision',
        icon: TrendingUp,
        adminOnly: true,
        children: [
          { to: '/payroll/structure', label: 'Employeewise' },
          { to: '/payroll/arrears', label: 'Arrears' },
          { to: '/payroll/history', label: 'Salary History' },
          { to: '/payroll/bonus', label: 'Bonus' },
          { to: '/employees/promotion', label: 'Promotion' },
        ],
      },
      {
        to: '/expenses',
        label: 'Claims/Advances',
        icon: Receipt,
        children: [
          { to: '/travel', label: 'Travel Claims' },
          { to: '/expenses/advance', label: 'Advance Claim' },
        ],
      },
      {
        to: '/performance',
        label: 'Performance Appraisal',
        icon: TrendingUp,
        children: [
          { to: '/performance/kpa', label: 'KPA' },
          { to: '/performance/kpi-list', label: 'KRA/KPI List' },
          { to: '/performance/assign-kpi', label: 'Assign KPI' },
          { to: '/performance/kra', label: 'KRA' },
          { to: '/performance/kpi', label: 'KPI' },
          { to: '/performance/annual-target', label: 'Appraisal Year Target Setup' },
          { to: '/performance/periodic-target', label: 'Periodic Target Setup' },
          { to: '/performance/approve-targets', label: 'Approve Targets' },
          { to: '/performance/peer-eval', label: 'Peer Evaluation Setup' },
          { to: '/performance/external-eval', label: 'External Evaluation Setup' },
          { to: '/performance/evaluation', label: 'Employee Evaluation' },
          { to: '/performance/scorecard', label: 'View Scorecard' },
          { to: '/performance/periodic-scorecard', label: 'View Periodic Scorecard' },
          { to: '/performance/360-summary', label: '360-Evaluation Summary' },
          { to: '/performance/forms', label: 'More Forms' },
        ],
      },
      {
        to: '/recruitment',
        label: 'Recruitment',
        icon: Briefcase,
        adminOnly: true,
        children: [
          {
            label: 'Setup',
            children: [
              { to: '/recruitment/panel', label: 'Recruitment Panel Members' },
              { to: '/recruitment/job-description', label: 'Job Description' },
              { to: '/recruitment/job-ads', label: 'Job Advertisement List' },
              { to: '/recruitment/consultants', label: 'Consultant Registration List' },
            ],
          },
          {
            label: 'Requisitions',
            children: [
              { to: '/recruitment/requisitions-pending', label: 'Pending for Approval Requisition' },
              { to: '/recruitment/requisitions', label: 'Requisitions' },
              { to: '/recruitment/requisitions-assigned', label: 'Assigned Requisitions' },
              { to: '/recruitment/requisitions-assign', label: 'Assign Requisition' },
            ],
          },
          {
            label: 'Resume Bank',
            children: [
              { to: '/recruitment/resumes', label: 'Resume List' },
              { to: '/recruitment/resumes-pending', label: 'Pending for Approval Resume List' },
              { to: '/recruitment/resumes-comments', label: 'Comment On Resume List' },
              { to: '/recruitment/resumes-references', label: "Candidate's Reference List" },
            ],
          },
          {
            label: 'Manage',
            children: [
              { to: '/recruitment/assign-screening', label: 'Assign Resume for screening' },
              { to: '/recruitment/interview-schedule', label: 'Interview Schedule' },
              { to: '/recruitment/interviews', label: 'Interview Schedule List' },
              { to: '/recruitment/interview-feedback', label: 'Interview FeedBack List' },
              { to: '/recruitment/interview-status', label: 'Change Status-Interview' },
              { to: '/recruitment/selected-candidates', label: 'Selected Candidates List' },
              { to: '/recruitment/approved-rejected', label: 'Hiring Approved/Rejected candidates' },
              { to: '/recruitment/offer-letters', label: 'Offered candidates' },
              { to: '/recruitment/declined-candidates', label: 'Offer Declined By Candidates List' },
              { to: '/recruitment/revised-offers', label: 'Display revised offer-Hiring Approved' },
              { to: '/recruitment/candidate-meetings', label: 'Meeting with Candidates List' },
              { to: '/recruitment/joining', label: 'Convert to an Employee' },
            ],
          },
          { to: '/recruitment/forms', label: 'More Forms' },
        ],
      },
      {
        to: '/settings',
        label: 'System Settings',
        icon: ShieldCheck,
        systemAdminOnly: true,
        children: [
          { to: '/organization', label: 'Company Setup Forms' },
          { to: '/documents', label: 'HR Forms' },
          { to: '/documents/payroll', label: 'Payroll Forms' },
          { to: '/compliance', label: 'Statutory Compliance' },
          { to: '/projects', label: 'Task Management' },
          { to: '/settings/roles', label: 'Role Permissions' },
          { to: '/settings/role-assign', label: 'User Assignment' },
        ],
      },
      {
        to: '/organization',
        label: 'Company Setup',
        icon: Building2,
        adminOnly: true,
        children: [
          { to: '/organization', label: 'Company Profile' },
          {
            label: 'Org Structure',
            children: [
              { to: '/organization/branches', label: 'Branch/Location' },
              { to: '/organization/categories', label: 'Employee Category' },
              { to: '/organization/departments', label: 'Department' },
              { to: '/organization/designations', label: 'Designations' },
              { to: '/organization/grades', label: 'Grade (Pay Cadre)' },
            ],
          },
          {
            label: 'Rule Setup',
            children: [
              { to: '/settings/employee-id', label: 'Configure Employee ID' },
              { to: '/payroll/calendar', label: 'Salary Calendar' },
              { to: '/payroll/masters', label: 'Payroll Masters' },
              { to: '/organization/masters', label: 'HR Masters' },
            ],
          },
          {
            label: 'Leave',
            children: [
              { to: '/leave/policies', label: 'Leave Code' },
            ],
          },
          {
            label: 'Holidays',
            children: [
              { to: '/leave/holidays', label: 'General Holidays' },
              { to: '/leave/flexible', label: 'Flexible Holidays' },
              { to: '/leave/weekly-off', label: 'Weekly Off' },
              { to: '/leave/special', label: 'Special Holiday' },
            ],
          },
          {
            label: 'Shift Setup',
            children: [
              { to: '/shifts', label: 'Define Shift' },
              { to: '/attendance/policy', label: 'Attendance Policy' },
              { to: '/attendance/overtime', label: 'Compoff/Overtime Policy' },
            ],
          },
          {
            label: 'Salary Setup',
            children: [
              { to: '/payroll/heads', label: 'Salary Head' },
              { to: '/payroll/structure', label: 'Salary Structure' },
            ],
          },
          {
            label: 'Compliance Setup',
            children: [
              { to: '/compliance/pt', label: 'Professional Tax' },
              { to: '/compliance/pf', label: 'Provident Fund' },
              { to: '/compliance/esic', label: 'ESIC' },
              { to: '/compliance/lwf', label: 'Labour Welfare Fund' },
              { to: '/tax-calculator/sec-category', label: 'TDS Sec. Category' },
              { to: '/tax-calculator/master', label: 'TDS Investment Declaration' },
              { to: '/tax-calculator/income-slab-cat', label: 'TDS Income Slab Category' },
              { to: '/tax-calculator/slabs', label: 'TDS Income Slabs' },
              { to: '/compliance/forms', label: 'More Compliance Forms' },
            ],
          },
          { to: '/organization/forms', label: 'More Forms' },
        ],
      },
      {
        to: '/reports',
        label: 'Report Builders',
        icon: BarChart3,
        adminOnly: true,
        children: [
          { to: '/reports/employee-info', label: 'Employee Information' },
          { to: '/reports/attendance', label: 'Monthly Attendance' },
          { to: '/reports/salary', label: 'Monthly Salary' },
          { to: '/reports/salary-summary', label: 'Monthly Salary Summary' },
          { to: '/reports/salary-structure', label: 'Employee Salary Structure' },
        ],
      },
      { to: '/documents', label: 'HR Forms', icon: FileText },
      { to: '/documents/payroll', label: 'Payroll Forms', icon: FileText },
      { to: '/compliance', label: 'Payroll Statutory Compliance', icon: ShieldCheck, adminOnly: true },
      {
        to: '/more',
        label: 'More',
        icon: Command,
        children: [
          { to: '/assets', label: 'Equipment & Assets' },
          { to: '/projects', label: 'Projects & Tasks' },
          { to: '/travel', label: 'Travel Requests' },
          { to: '/training', label: 'Training & Courses' },
          { to: '/announcements', label: 'Announcements' },
          { to: '/exit', label: 'Exit Management' },
          { to: '/billing', label: 'Billing & Plan' },
          { to: '/integrations', label: 'Integrations' },
        ],
      },
      { to: '/helpdesk', label: 'Get Support', icon: Headphones },
    ],
  },
];

const EMPLOYEE_NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Employee Portal',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        to: '/employees/me',
        label: 'Personal Detail',
        icon: User,
        children: [
          { to: '/employees/me', label: 'My Profile' },
          { to: '/assets', label: 'Assets Allocated' },
        ],
      },
      {
        to: '/payroll',
        label: 'Salary Details',
        icon: Banknote,
        children: [
          { to: '/payroll', label: 'Pay slips' },
          { to: '/tax-calculator/form16', label: 'Form 16' },
          { to: '/expenses/loans', label: 'Loan/Salary Advance' },
          { to: '/tax-calculator/investment', label: 'Investment Declaration' },
          { to: '/tax-calculator/it-statement', label: 'IT Statement' },
          { to: '/payroll/history', label: 'Salary Revision History' },
        ],
      },
      {
        to: '/leave',
        label: 'Leave',
        icon: CalendarDays,
        children: [
          { to: '/leave/apply', label: 'Apply Leave' },
          { to: '/leave/requests', label: 'Cancel Leave' },
          { to: '/leave/compoff', label: 'Apply COL/COFF Application' },
          { to: '/leave/compoff-history', label: 'COL/COFF History' },
          { to: '/leave/flexible', label: 'Flexible Holiday Request' },
        ],
      },
      {
        to: '/expenses',
        label: 'Claims/Reimbursement',
        icon: Receipt,
        children: [
          { to: '/expenses', label: 'Claims' },
          { to: '/expenses/advance', label: 'Advance Claim' },
        ],
      },
      {
        to: '/attendance',
        label: 'Attendance',
        icon: Calendar,
        children: [
          { to: '/attendance/daily', label: 'Apply Attendance' },
          { to: '/attendance/correction-request', label: 'Correction Request' },
          { to: '/travel', label: 'Training/Tour Request' },
          { to: '/shifts', label: 'Shift Change Request' },
          { to: '/attendance/summary', label: 'View Attendance' },
          { to: '/attendance/custom-view', label: 'Custom View Attendance' },
        ],
      },
      {
        to: '/helpdesk',
        label: 'Helpdesk',
        icon: Headphones,
        children: [
          { to: '/helpdesk', label: 'Ticket Request' },
          { to: '/helpdesk/my-tickets', label: 'Ticket History' },
        ],
      },
      {
        to: '/performance',
        label: 'Responsibilities',
        icon: Target,
        children: [
         
          { to: '/performance/kpi', label: 'KPIs' },
          { to: '/performance/kra', label: 'KRAs' },
          { to: '/performance/evaluation', label: 'Evaluation/Self Appraisal' },
          { to: '/performance/scorecard', label: 'View Scorecard' },
        ],
      },
      {
        to: '/more',
        label: 'More',
        icon: Command,
        children: [
          { to: '/employees/directory', label: 'Employee Directory' },
          { to: '/helpdesk/feedback', label: 'Suggestions/Feedback/Complains' },
          {
            label: 'Separation',
            children: [
              { to: '/exit', label: 'Request' },
              { to: '/exit/clearance', label: 'Department Clearance' },
              { to: '/exit/interview', label: 'Exit Interview' },
            ],
          },
          { to: '/announcements/company', label: 'Company Announcements' },
          { to: '/documents/newsletter', label: 'Newsletter/Policies' },
          { to: '/documents/hr-links', label: 'Other HR links' },
          { to: '/documents/salary-links', label: 'Other Salary links' },
          { to: '/recruitment/job-ads', label: 'Job Opening links' },
          { to: '/performance', label: 'Performance links' },
        ],
      },
    ],
  },
];

const HR_NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'HR Management',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        to: '/approvals',
        label: 'Approvals',
        icon: CheckSquare,
        children: [
          { to: '/approvals/leave', label: 'Leave' },
          { to: '/approvals/cancel-leave', label: 'Cancel Leave Application' },
          { to: '/approvals/compoff', label: 'COL/COFF Application' },
          { to: '/approvals/travel', label: 'Travel Claim' },
          { to: '/approvals/advance', label: 'Advance Claim' },
          { to: '/approvals/loan', label: 'Loan/Advance' },
          { to: '/approvals/shift', label: 'Shift Change' },
          { to: '/approvals/optional-holiday', label: 'Optional Holidays' },
          { to: '/approvals/overtime', label: 'Overtime (O.T)' },
        ],
      },
      {
        to: '/attendance',
        label: 'Attendance Override',
        icon: Fingerprint,
        children: [
          { to: '/attendance/correction', label: 'Correction Request Approval' },
          { to: '/attendance/mark', label: 'Mark Attendance Approval' },
          { to: '/attendance/regularization', label: 'Regularization Approval' },
          { to: '/attendance/geo', label: 'Geo Attendance Approval' },
          { to: '/reports/attendance', label: 'Team Daily Attendance Report' },
        ],
      },
      {
        to: '/performance',
        label: 'Performance Appraisal',
        icon: TrendingUp,
        children: [
          { to: '/performance/evaluation', label: 'Manager Evaluation' },
          { to: '/performance/approve-targets', label: 'Approve Targets' },
          { to: '/performance/scorecard', label: 'View Scorecard' },
          { to: '/performance/periodic-scorecard', label: 'View Periodic Scorecard' },
        ],
      },
      {
        to: '/recruitment',
        label: 'Recruitment',
        icon: Briefcase,
        children: [
          { to: '/recruitment/requisitions', label: 'Requisitions' },
          { to: '/recruitment/assign-screening', label: 'Resumes for screening' },
          { to: '/recruitment/interviews', label: 'Interview Schedule List' },
          { to: '/recruitment/interview-feedback', label: 'Interview FeedBack List' },
        ],
      },
      {
        to: '/more',
        label: 'More',
        icon: Command,
        children: [
          { to: '/organization', label: 'Company Setup Forms' },
          { to: '/documents', label: 'HR Forms' },
          { to: '/documents/payroll', label: 'Payroll Forms' },
          { to: '/compliance', label: 'Statutory Compliance' },
          { to: '/recruitment/forms', label: 'Recruitment' },
          { to: '/performance/forms', label: 'Performance Appraisal' },
          { to: '/projects', label: 'Task Management' },
        ],
      },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', employees: 'Employees', attendance: 'Attendance',
  leave: 'Leave', payroll: 'Payroll', recruitment: 'Recruitment',
  performance: 'Performance', documents: 'Documents', assets: 'Assets',
  expenses: 'Expenses', travel: 'Travel', shifts: 'Shifts',
  timesheets: 'Timesheets', projects: 'Projects', announcements: 'Announcements',
  training: 'Training', organization: 'Organization', reports: 'Reports',
  settings: 'Settings', billing: 'Billing', integrations: 'Integrations',
  'super-admin': 'Super Admin', fnf: 'FnF Settlement', exit: 'Exit Management',
  'tax-calculator': 'Tax Calculator', helpdesk: 'Helpdesk', more: 'More',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none"
      style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
      {initials}
    </div>
  );
}

// NavAccordionGroup removed because dropdowns are no longer used

/** 3-way theme toggle button: Light → Dark → System → Light */
function ThemeToggle() {
  const { mode, setMode, theme } = useTheme();
  const modes: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
    { value: 'light',  icon: Sun,     label: 'Light' },
    { value: 'dark',   icon: Moon,    label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];
  const next = modes[(modes.findIndex(m => m.value === mode) + 1) % 3];
  const current = modes.find(m => m.value === mode)!;
  const Icon = current.icon;
  return (
    <button
      onClick={() => setMode(next.value)}
      title={`Theme: ${current.label} — click for ${next.label}`}
      style={{
        padding: '0.375rem',
        borderRadius: '0.5rem',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
    >
      <Icon size={16} />
    </button>
  );
}

function NestedSubItem({
  child,
  location,
  isOpen,
  onToggle,
}: {
  child: NavChild;
  location: any;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isActive = child.children?.some(c => location.pathname === c.to);

  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded-md transition-all duration-150 ${
          isActive
            ? 'text-indigo-400 font-semibold bg-indigo-500/10'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
        }`}
      >
        <span className="flex items-center gap-2 font-medium tracking-tight">
          <Settings size={13} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
          {child.label}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-0 text-indigo-400' : '-rotate-90 opacity-70'
          }`}
        />
      </button>

      {isOpen && child.children && (
        <div className="pl-3 space-y-0.5 border-l border-slate-700/50 ml-2.5 my-1">
          {child.children.map(sub => {
            const subActive = location.pathname === sub.to;
            return (
              <NavLink
                key={sub.label + sub.to}
                to={sub.to}
                className={`block px-2.5 py-1 text-[11.5px] rounded-md transition-all duration-150 ${
                  subActive
                    ? 'text-indigo-300 font-semibold bg-indigo-500/15 shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                {sub.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavItemRow({
  item,
  collapsed,
  location,
  isOpen,
  onToggle,
}: {
  item: NavItem;
  collapsed: boolean;
  location: any;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [openSubItem, setOpenSubItem] = useState<string | null>(() => {
    if (!item.children) return null;
    const activeSub = item.children.find(child => child.children?.some(c => location.pathname === c.to));
    return activeSub ? activeSub.label : null;
  });

  const Icon = item.icon as React.ElementType;

  if (item.children && item.children.length > 0) {
    const isParentActive = item.to ? location.pathname.startsWith(item.to) : item.children.some(child => child.to && location.pathname.startsWith(child.to));

    return (
      <div className="space-y-0.5">
        <button
          onClick={onToggle}
          className={`w-full sidebar-nav-item flex items-center justify-between px-3 py-2 mx-1 text-[13px] rounded-lg transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          } ${
            isParentActive
              ? 'sidebar-nav-item--active font-semibold text-white bg-indigo-600/15 ring-1 ring-indigo-500/30'
              : 'text-slate-200 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon size={17} strokeWidth={isParentActive ? 2.3 : 1.8} className={isParentActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'} />
            {!collapsed && <span className="tracking-tight font-medium">{item.label}</span>}
          </div>
          {!collapsed && (
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                isOpen ? 'rotate-0 text-indigo-400' : '-rotate-90 opacity-70'
              }`}
            />
          )}
        </button>

        {!collapsed && isOpen && (
          <div className="pl-4 pr-1 space-y-0.5 border-l border-slate-700/50 ml-4.5 my-1">
            {item.children.map(child => {
              if (child.children && child.children.length > 0) {
                return (
                  <NestedSubItem
                    key={child.label}
                    child={child}
                    location={location}
                    isOpen={openSubItem === child.label}
                    onToggle={() => setOpenSubItem(prev => prev === child.label ? null : child.label)}
                  />
                );
              }
              const childActive = location.pathname === child.to;
              return (
                <NavLink
                  key={child.label + child.to}
                  to={child.to!}
                  className={`block px-2.5 py-1.5 text-[12px] rounded-md transition-all duration-150 ${
                    childActive
                      ? 'text-indigo-400 font-semibold bg-indigo-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {child.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      key={item.to!}
      to={item.to!}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => {
        const active = isActive || location.pathname.startsWith(item.to!);
        return `sidebar-nav-item flex items-center gap-2.5 px-3 py-2 mx-1 text-[13px] rounded-lg relative group transition-all duration-200 ${
          collapsed ? 'justify-center' : ''
        } ${
          active
            ? 'sidebar-nav-item--active font-semibold text-white bg-indigo-600/15 ring-1 ring-indigo-500/30'
            : 'text-slate-200 hover:text-white hover:bg-slate-800/50'
        }`;
      }}
    >
      {({ isActive }) => {
        const active = isActive || location.pathname.startsWith(item.to!);
        return (
          <>
            {active && !collapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-500/50" />
            )}
            
            <Icon size={17} strokeWidth={active ? 2.3 : 1.8} className={`flex-shrink-0 ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
            {!collapsed && <span className="tracking-tight font-medium">{item.label}</span>}
            {collapsed && (
              <span
                className="sidebar-tooltip absolute left-full ml-2 px-2.5 py-1.5 text-xs font-medium rounded-md pointer-events-none whitespace-nowrap z-50 shadow-lg opacity-0 group-hover:opacity-100 bg-slate-900 text-white border border-slate-700"
              >
                {item.label}
              </span>
            )}
          </>
        );
      }}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; type: string }[] | null>(null);

  const toggleBell = async () => {
    setBellOpen(open => {
      const next = !open;
      if (next && notifications === null) {
        dashboardApi.summary()
          .then(d => setNotifications(d.notifications || []))
          .catch(() => setNotifications([]));
      }
      return next;
    });
  };

  const openNotification = (notif: { id: string; title: string; type: string }) => {
    setBellOpen(false);
    if (notif.id.startsWith('leave-')) navigate('/leave');
    else if (notif.id.startsWith('reg-alert')) navigate('/attendance/regularization');
    else if (notif.id.startsWith('jobs-info')) navigate('/recruitment');
  };

  const handleGo = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;
    const roleNameLower = user?.role?.name?.toLowerCase() || '';
    const isGlobalAdmin = !!user?.isSuperAdmin;
    const isSystemAdmin = isGlobalAdmin || !!user?.role?.isSystem;
    const isHr = isSystemAdmin || roleNameLower.includes('admin') || roleNameLower.includes('hr') || roleNameLower.includes('human resource') || roleNameLower.includes('manager');
    const groups = (isGlobalAdmin || isSystemAdmin)
      ? NAV_GROUPS
      : isHr
        ? HR_NAV_GROUPS
        : EMPLOYEE_NAV_GROUPS;
    for (const { items } of groups) {
      for (const item of items) {
        if (item.globalAdminOnly && !isGlobalAdmin) continue;
        if (item.systemAdminOnly && !isSystemAdmin) continue;
        if (item.adminOnly && !isSystemAdmin && !isHr) continue;
        if (item.label.toLowerCase().includes(term) && item.to) {
          navigate(item.to);
          setSearchTerm('');
          return;
        }
        if (item.children) {
          for (const child of item.children) {
            const childLabel = child.label.toLowerCase();
            const matchesChild = childLabel.includes(term) || child.children?.some(c => c.label.toLowerCase().includes(term));
            if (matchesChild && child.to) {
              navigate(child.to);
              setSearchTerm('');
              return;
            }
            if (child.children) {
              for (const grand of child.children) {
                if (grand.label.toLowerCase().includes(term) && grand.to) {
                  navigate(grand.to);
                  setSearchTerm('');
                  return;
                }
              }
            }
          }
        }
      }
    }
  };

  const [openTopItem, setOpenTopItem] = useState<string | null>(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (!item.children) continue;
        const matchesDirect = item.to && location.pathname.startsWith(item.to);
        const matchesChild = item.children.some(child => {
          if (child.to && location.pathname === child.to) return true;
          if (child.children) return child.children.some(c => location.pathname === c.to);
          return false;
        });
        if (matchesDirect || matchesChild) return item.label;
      }
    }
    return null;
  });

  const fullName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email ?? '';
  const roleName = user?.role?.name ?? (isAdmin ? 'Administrator' : 'Employee');

  const currentSegment = location.pathname.split('/').filter(Boolean)[0] ?? '';
  const breadcrumb = ROUTE_LABELS[currentSegment] ?? currentSegment;

  // ⌘K / Ctrl+K to open Command Palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(open => !open);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col z-40 relative overflow-hidden"
        style={{
          width: collapsed ? '4rem' : '15rem',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0 relative"
          style={{ borderBottom: '1px solid var(--sidebar-separator)', justifyContent: collapsed ? 'center' : undefined }}
        >
          {/* Subtle glow behind logo */}
          <div className="absolute top-1/2 left-6 -translate-y-1/2 w-10 h-10 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
          
          <img
            src={workoraIcon}
            alt="Workora Logo"
            className="w-8 h-8 rounded-xl object-cover shadow-lg shadow-black/40 ring-1 ring-white/20 flex-shrink-0 z-10"
          />
          {!collapsed && (
            <div className="overflow-hidden flex-1 z-10">
              <div className="text-sm font-bold tracking-tight leading-none text-white font-display">Workora</div>
              <div className="text-[9px] mt-1 font-semibold uppercase tracking-widest text-[#52b788]">HRMS OS</div>
            </div>
          )}
        </div>

        {/* Search Bar matching user screenshot */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5 shrink-0 bg-slate-950/40">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 text-xs text-white placeholder-gray-400 px-2.5 py-1 rounded border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button onClick={handleGo} className="bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-gray-200 px-2 py-1 rounded border border-slate-700/60 transition-colors shrink-0">
              Go
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {(() => {
            const roleNameLower = user?.role?.name?.toLowerCase() || '';
            const isGlobalAdmin = !!user?.isSuperAdmin;
            const isSystemAdmin = isGlobalAdmin || !!user?.role?.isSystem;
            const isHr = isSystemAdmin || roleNameLower.includes('admin') || roleNameLower.includes('hr') || roleNameLower.includes('human resource') || roleNameLower.includes('manager');
            const activeNavGroups = (isGlobalAdmin || isSystemAdmin)
              ? NAV_GROUPS
              : isHr
                ? HR_NAV_GROUPS
                : EMPLOYEE_NAV_GROUPS;

            return activeNavGroups.map(({ group, items }) => {
              const visible = items.filter(item => {
                if (isGlobalAdmin || isSystemAdmin) return true;
                if (item.globalAdminOnly) return isGlobalAdmin;
                if (item.systemAdminOnly) return isSystemAdmin;
                if (item.adminOnly) return isSystemAdmin || isHr;
                return true;
              });

            const filteredItems = visible.filter(item => {
              if (!searchTerm.trim()) return true;
              const term = searchTerm.toLowerCase();
              const matchLabel = item.label.toLowerCase().includes(term);
              const matchChild = item.children?.some(c => c.label.toLowerCase().includes(term));
              return matchLabel || matchChild;
            });
            
            if (!filteredItems.length) return null;
            return (
              <div key={group} className="mb-1">
                <div className="px-2 space-y-0.5">
                  {filteredItems.map(item => (
                    <NavItemRow
                      key={item.label}
                      item={item}
                      collapsed={collapsed}
                      location={location}
                      isOpen={openTopItem === item.label}
                      onToggle={() => setOpenTopItem(prev => prev === item.label ? null : item.label)}
                    />
                  ))}
                </div>
              </div>
            );
          });
        })()}
        </nav>

        {/* User footer */}
        <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-separator)', background: 'var(--sidebar-footer)' }}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-4 py-3">
              <UserAvatar name={fullName} />
              <div className="overflow-hidden flex-1">
                <div className="text-[13px] font-semibold text-white truncate">{fullName}</div>
                <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--sidebar-text)' }}>{roleName}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium transition-all ${collapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--sidebar-text)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text)'; }}
          >
            <LogOut size={16} strokeWidth={2} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-primary)' }}>
        {/* Topbar */}
        <header
          className="h-12 flex items-center gap-2 px-4 shrink-0 sticky top-0 z-30"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title="Toggle sidebar"
            style={{ padding: '0.375rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span style={{ color: 'var(--text-muted)' }}>Ledger</span>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{breadcrumb}</span>
          </div>

          {/* Command palette trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 ml-3 px-3 py-1.5 text-xs rounded-lg"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
          >
            <Command size={12} />
            <span>Search…</span>
            <span className="ml-1 text-[10px] px-1 rounded font-mono" style={{ background: 'var(--surface-active)', border: '1px solid var(--border)' }}>⌘K</span>
          </button>

          <div className="flex-1" />

          <LiveClock />
          <ThemeToggle />

          {/* Bell */}
          <div className="relative">
            <button
              title="Notifications"
              onClick={toggleBell}
              style={{ padding: '0.375rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', position: 'relative' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            >
              <Bell size={16} />
              {notifications && notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: 'var(--danger)', color: '#fff' }}>{notifications.length}</span>
              )}
            </button>
            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                <div
                  className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl border z-50 shadow-xl"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.15))' }}
                >
                  <div className="px-3 py-2 text-xs font-semibold border-b" style={{ borderColor: 'var(--border)' }}>
                    Notifications
                  </div>
                  {notifications === null ? (
                    <div className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>You're all caught up</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-[var(--surface-hover)] flex items-start gap-2 border-b last:border-b-0"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full mt-1 shrink-0"
                          style={{ background: n.type === 'urgent' ? 'var(--danger)' : n.type === 'warning' ? 'var(--warning, #f59e0b)' : 'var(--action-primary)' }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Avatar (topbar) */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold select-none cursor-default ml-1"
            style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}
            title={fullName}
          >
            {fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
