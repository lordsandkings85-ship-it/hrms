import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Fingerprint, CalendarDays, Banknote, Briefcase,
  TrendingUp, FileText, Laptop, Receipt, Plane, Clock3, ListChecks,
  FolderKanban, Megaphone, GraduationCap, Building2, BarChart3, Settings,
  CreditCard, Plug, ShieldCheck, LogOut, Calculator, UserMinus,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, live: true },
  { to: '/employees', label: 'Employees', icon: Users, live: true },
  { to: '/attendance', label: 'Attendance', icon: Fingerprint, live: true },
  { to: '/leave', label: 'Leave Management', icon: CalendarDays, live: true },
  { to: '/payroll', label: 'Payroll', icon: Banknote, live: true },
  { to: '/recruitment', label: 'Recruitment', icon: Briefcase, live: true },
  { to: '/performance', label: 'Performance', icon: TrendingUp, live: true },
  { to: '/documents', label: 'Documents', icon: FileText, live: true },
  { to: '/assets', label: 'Assets', icon: Laptop, live: true },
  { to: '/expenses', label: 'Expenses', icon: Receipt, live: true },
  { to: '/travel', label: 'Travel', icon: Plane, live: true },
  { to: '/shifts', label: 'Shifts', icon: Clock3, live: true },
  { to: '/timesheets', label: 'Timesheets', icon: ListChecks, live: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, live: true },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, live: true },
  { to: '/training', label: 'Training', icon: GraduationCap, live: true },
  { to: '/organization', label: 'Organization', icon: Building2, live: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, live: true },
  { to: '/settings', label: 'Settings', icon: Settings, live: true },
  { to: '/billing', label: 'Billing', icon: CreditCard, live: true },
  { to: '/integrations', label: 'Integrations', icon: Plug, live: true },
  { to: '/super-admin', label: 'Super Admin', icon: ShieldCheck, live: true },
  { to: '/fnf', label: 'FnF Settlement', icon: Banknote, live: true },
  { to: '/exit', label: 'Exit Management', icon: UserMinus, live: true },
  { to: '/tax-calculator', label: 'Tax Calculator', icon: Calculator, live: true },
];

import { useAuthStore } from '../store/useAuthStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role?.isSystem;

  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Filter NAV items based on role
  const visibleNav = NAV.filter((item) => {
    if (isAdmin) return true; // Admin sees everything
    
    // Regular user only sees these items
    const userAllowed = [
      '/dashboard', '/attendance', '/leave', '/payroll', 
      '/expenses', '/travel', '/timesheets', '/exit', '/tax-calculator'
    ];
    return userAllowed.includes(item.to);
  });

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-ink text-paper flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="font-display text-lg tracking-tight">Ledger HRMS</div>
          <div className="text-xs text-white/40 mt-0.5">Workforce & Payroll</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.live ? item.to : '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive && item.live
                    ? 'bg-ledger/20 text-white border-r-2 border-ledger'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                } ${!item.live ? 'opacity-50' : ''}`
              }
            >
              <item.icon size={16} strokeWidth={1.75} />
              {item.label}
              {!item.live && <span className="ml-auto text-[10px] font-mono text-white/30">API</span>}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-5 py-4 text-sm text-white/50 hover:text-white border-t border-white/10"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
      </aside>
      <main className="flex-1 bg-paper">
        <Outlet />
      </main>
    </div>
  );
}
