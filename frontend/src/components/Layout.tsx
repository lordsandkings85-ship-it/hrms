import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, Fingerprint, CalendarDays, Banknote, Briefcase,
  TrendingUp, FileText, Laptop, Receipt, Plane, Clock3, ListChecks,
  FolderKanban, Megaphone, GraduationCap, Building2, BarChart3, Settings,
  CreditCard, Plug, ShieldCheck, LogOut, Calculator, UserMinus, HandCoins,
  ChevronLeft, Bell, Menu, Moon, Sun, Monitor, Command, Headphones, Mail
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme, type ThemeMode } from './ui/ThemeProvider';
import CommandPalette from './ui/CommandPalette';

type NavItem = {
  to?: string;
  label: string;
  icon?: React.ElementType;
  adminOnly?: boolean;
  systemAdminOnly?: boolean;
  globalAdminOnly?: boolean;
};

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Core',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'People',
    items: [
      { to: '/employees', label: 'Employee Management', icon: Users, adminOnly: true },
      { to: '/recruitment', label: 'Recruitment', icon: Briefcase, adminOnly: true },
      { to: '/organization', label: 'Organization', icon: Building2, adminOnly: true },
    ],
  },
  {
    group: 'Time & Attendance',
    items: [
      { to: '/attendance', label: 'Attendance', icon: Fingerprint },
      { to: '/leave', label: 'Leave', icon: CalendarDays },
      { to: '/shifts', label: 'Shifts', icon: Clock3, adminOnly: true },
      { to: '/timesheets', label: 'Timesheets', icon: ListChecks },
    ],
  },
  {
    group: 'Finance',
    items: [
      { to: '/payroll', label: 'Payroll', icon: Banknote, adminOnly: true },
      { to: '/performance', label: 'Performance', icon: TrendingUp },
      { to: '/expenses', label: 'Expenses', icon: Receipt },
      { to: '/tax-calculator', label: 'Tax Calculator', icon: Calculator },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { to: '/assets', label: 'Assets', icon: Laptop, adminOnly: true },
      { to: '/documents', label: 'Documents', icon: FileText },
      { to: '/announcements', label: 'Announcements', icon: Megaphone, adminOnly: true },
      { to: '/letters', label: 'Employee Letters', icon: Mail, adminOnly: true },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/reports',      label: 'Reports',      icon: BarChart3, adminOnly: true },
      { to: '/helpdesk',     label: 'Helpdesk',     icon: Headphones },
      { to: '/settings',     label: 'Settings',     icon: Settings, systemAdminOnly: true },
      { to: '/billing',      label: 'Billing',      icon: CreditCard, systemAdminOnly: true },
      { to: '/integrations', label: 'Integrations', icon: Plug, systemAdminOnly: true },
      { to: '/super-admin',  label: 'Super Admin',  icon: ShieldCheck, globalAdminOnly: true },
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
  'tax-calculator': 'Tax Calculator', helpdesk: 'Helpdesk',
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

export default function Layout() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

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
          className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--sidebar-separator)', justifyContent: collapsed ? 'center' : undefined }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Banknote size={16} className="text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <div className="text-[15px] font-bold tracking-tight leading-none text-white">Ledger HRMS</div>
              <div className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: 'var(--sidebar-text)', opacity: 0.5 }}>Workforce</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map(({ group, items }) => {
            const roleNameLower = user?.role?.name?.toLowerCase() || '';
            const isGlobalAdmin = !!user?.isSuperAdmin;
            const isSystemAdmin = isGlobalAdmin || !!user?.role?.isSystem;
            const isHr = roleNameLower.includes('admin') || roleNameLower === 'hr' || roleNameLower === 'human resources';
            
            const visible = items.filter(item => {
              if (item.globalAdminOnly) return isGlobalAdmin;
              if (item.systemAdminOnly) return isSystemAdmin;
              if (item.adminOnly) return isSystemAdmin || isHr;
              return true;
            });
            
            if (!visible.length) return null;
            return (
              <div key={group} className="mb-1">
                {!collapsed && <div className="nav-group-label">{group}</div>}
                {collapsed && <div className="my-2 mx-3" style={{ borderTop: '1px solid var(--sidebar-separator)' }} />}
                <div className="px-2 space-y-0.5">
                  {visible.map(item => {
                    const Icon = item.icon as React.ElementType;
                    return (
                      <NavLink
                        key={item.to!}
                        to={item.to!}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `sidebar-nav-item flex items-center gap-3 px-3 py-2 text-[13px] rounded-md relative group ${
                            collapsed ? 'justify-center' : ''
                          } ${
                            isActive || location.pathname.startsWith(item.to!) ? 'sidebar-nav-item--active font-medium' : ''
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon size={16} strokeWidth={isActive ? 2 : 1.75} className="flex-shrink-0" />
                            {!collapsed && item.label}
                            {collapsed && (
                              <span
                                className="sidebar-tooltip absolute left-full ml-2 px-2.5 py-1.5 text-xs font-medium rounded-md pointer-events-none whitespace-nowrap z-50 shadow-lg opacity-0 group-hover:opacity-100"
                              >
                                {item.label}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
          <button
            title="Notifications"
            style={{ padding: '0.375rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <Bell size={16} />
          </button>

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
