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
        className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 bg-ink border-r border-line/10 text-paper flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 relative`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Banknote size={16} className="text-ink" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <div className="font-display text-[15px] font-bold tracking-tight leading-none text-white">Ledger HRMS</div>
              <div className="text-[10px] text-muted-400 mt-1 uppercase tracking-widest text-white/40">Workforce</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          {NAV_GROUPS.map(({ group, items }) => {
            const visible = items.filter(item => isAdmin || !item.adminOnly);
            if (!visible.length) return null;
            return (
              <div key={group} className="mb-2">
                {!collapsed && <div className="nav-group-label">{group}</div>}
                {collapsed && <div className="my-2 mx-4 border-t border-white/5" />}
                <div className="px-2 space-y-0.5">
                  {visible.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 text-[13px] rounded-md transition-all relative group ${
                          collapsed ? 'justify-center' : ''
                        } ${
                          isActive
                            ? 'bg-white/10 text-white font-medium shadow-sm'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={16} strokeWidth={isActive ? 2 : 1.75} className="flex-shrink-0" />
                          {!collapsed && item.label}
                          {/* Tooltip for collapsed */}
                          {collapsed && (
                            <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-ink2 border border-white/10 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-opacity">
                              {item.label}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 bg-white/5">
          {!collapsed && (
            <div className="flex items-center gap-3 px-4 py-4">
              <UserAvatar name={fullName} />
              <div className="overflow-hidden flex-1">
                <div className="text-[13px] font-semibold text-white truncate">{fullName}</div>
                <div className="text-[11px] text-white/50 truncate mt-0.5">{roleName}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-medium text-rustLight hover:text-white hover:bg-rust/20 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} strokeWidth={2} />
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
