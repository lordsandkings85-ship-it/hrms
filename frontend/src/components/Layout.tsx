import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Fingerprint, CalendarDays, Banknote, Briefcase,
  TrendingUp, FileText, Laptop, Receipt, Plane, Clock3, ListChecks,
  FolderKanban, Megaphone, GraduationCap, Building2, BarChart3, Settings,
  CreditCard, Plug, ShieldCheck, LogOut, Calculator, UserMinus, HandCoins,
  ChevronLeft, Bell, Menu,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Core',
    items: [
      { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
      { to: '/employees',  label: 'Employees',  icon: Users, adminOnly: true },
      { to: '/organization', label: 'Organization', icon: Building2, adminOnly: true },
    ],
  },
  {
    group: 'Time & Attendance',
    items: [
      { to: '/attendance',  label: 'Attendance',   icon: Fingerprint },
      { to: '/leave',       label: 'Leave',         icon: CalendarDays },
      { to: '/shifts',      label: 'Shifts',        icon: Clock3, adminOnly: true },
      { to: '/timesheets',  label: 'Timesheets',    icon: ListChecks },
    ],
  },
  {
    group: 'Finance',
    items: [
      { to: '/payroll',        label: 'Payroll',       icon: Banknote, adminOnly: true },
      { to: '/expenses',       label: 'Expenses',      icon: Receipt },
      { to: '/travel',         label: 'Travel',        icon: Plane },
      { to: '/tax-calculator', label: 'Tax Calculator',icon: Calculator },
    ],
  },
  {
    group: 'People & Org',
    items: [
      { to: '/recruitment', label: 'Recruitment', icon: Briefcase, adminOnly: true },
      { to: '/performance', label: 'Performance', icon: TrendingUp, adminOnly: true },
      { to: '/training',    label: 'Training',    icon: GraduationCap, adminOnly: true },
      { to: '/projects',    label: 'Projects',    icon: FolderKanban, adminOnly: true },
      { to: '/documents',   label: 'Documents',   icon: FileText },
      { to: '/assets',      label: 'Assets',      icon: Laptop, adminOnly: true },
      { to: '/announcements', label: 'Announcements', icon: Megaphone, adminOnly: true },
    ],
  },
  {
    group: 'Offboarding',
    items: [
      { to: '/exit', label: 'Exit Management', icon: UserMinus, adminOnly: true },
      { to: '/fnf',  label: 'FnF Settlement',  icon: HandCoins, adminOnly: true },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/reports',      label: 'Reports',      icon: BarChart3, adminOnly: true },
      { to: '/settings',     label: 'Settings',     icon: Settings, adminOnly: true },
      { to: '/billing',      label: 'Billing',      icon: CreditCard, adminOnly: true },
      { to: '/integrations', label: 'Integrations', icon: Plug, adminOnly: true },
      { to: '/super-admin',  label: 'Super Admin',  icon: ShieldCheck, adminOnly: true },
    ],
  },
];

// Breadcrumb map
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', employees: 'Employees', attendance: 'Attendance',
  leave: 'Leave', payroll: 'Payroll', recruitment: 'Recruitment',
  performance: 'Performance', documents: 'Documents', assets: 'Assets',
  expenses: 'Expenses', travel: 'Travel', shifts: 'Shifts',
  timesheets: 'Timesheets', projects: 'Projects', announcements: 'Announcements',
  training: 'Training', organization: 'Organization', reports: 'Reports',
  settings: 'Settings', billing: 'Billing', integrations: 'Integrations',
  'super-admin': 'Super Admin', fnf: 'FnF Settlement', exit: 'Exit Management',
  'tax-calculator': 'Tax Calculator',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xs text-muted tabular-nums">
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-ledger/30 text-ledgerLight flex items-center justify-center text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const fullName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email ?? '';
  const roleName = user?.role?.name ?? (isAdmin ? 'Administrator' : 'Employee');

  const currentSegment = location.pathname.split('/').filter(Boolean)[0] ?? '';
  const breadcrumb = ROUTE_LABELS[currentSegment] ?? currentSegment;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 bg-ink text-paper flex flex-col transition-all duration-200 ease-in-out`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-ledger flex items-center justify-center flex-shrink-0">
            <Banknote size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-display text-sm font-bold tracking-tight leading-none">Ledger HRMS</div>
              <div className="text-[10px] text-white/35 mt-0.5">Workforce &amp; Payroll</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map(({ group, items }) => {
            const visible = items.filter(item => isAdmin || !item.adminOnly);
            if (!visible.length) return null;
            return (
              <div key={group}>
                {!collapsed && <div className="nav-group-label">{group}</div>}
                {collapsed && <div className="my-1 mx-3 border-t border-white/10" />}
                {visible.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2 text-[13px] transition-colors relative group ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-ledger/20 text-white font-medium'
                          : 'text-white/55 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-ledger" />
                        )}
                        <item.icon size={15} strokeWidth={isActive ? 2 : 1.75} className="flex-shrink-0" />
                        {!collapsed && item.label}
                        {/* Tooltip for collapsed */}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-ink2 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-4 py-3">
              <UserAvatar name={fullName} />
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-semibold text-white truncate">{fullName}</div>
                <div className="text-[10px] text-white/40 truncate">{roleName}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-white/45 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={15} strokeWidth={1.75} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-12 bg-white border-b border-line flex items-center gap-3 px-5 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paperDim transition-colors"
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span className="text-ink/40">Ledger</span>
            <span>/</span>
            <span className="text-ink font-medium">{breadcrumb}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          <LiveClock />

          {/* Notification bell placeholder */}
          <button className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-paperDim transition-colors relative">
            <Bell size={16} />
          </button>

          {/* Avatar */}
          <UserAvatar name={fullName} />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
