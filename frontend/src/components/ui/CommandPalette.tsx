import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, Fingerprint, CalendarDays, Banknote,
  Briefcase, TrendingUp, FileText, Laptop, Receipt, Plane, Clock3,
  ListChecks, FolderKanban, Megaphone, GraduationCap, Building2,
  BarChart3, Settings, CreditCard, Plug, ShieldCheck, Calculator,
  UserMinus, HandCoins, Headphones, ArrowRight, Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const go = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const ALL_COMMANDS: CommandItem[] = [
    { id: 'dashboard',    label: 'Dashboard',       category: 'Navigate', icon: LayoutDashboard, action: () => go('/dashboard') },
    { id: 'employees',   label: 'Employees',        category: 'Navigate', icon: Users,           action: () => go('/employees') },
    { id: 'attendance',  label: 'Attendance',       category: 'Navigate', icon: Fingerprint,     action: () => go('/attendance') },
    { id: 'leave',       label: 'Leave',            category: 'Navigate', icon: CalendarDays,    action: () => go('/leave') },
    { id: 'payroll',     label: 'Payroll',          category: 'Navigate', icon: Banknote,        action: () => go('/payroll') },
    { id: 'recruitment', label: 'Recruitment',      category: 'Navigate', icon: Briefcase,       action: () => go('/recruitment') },
    { id: 'performance', label: 'Performance',      category: 'Navigate', icon: TrendingUp,      action: () => go('/performance') },
    { id: 'documents',   label: 'Documents',        category: 'Navigate', icon: FileText,        action: () => go('/documents') },
    { id: 'assets',      label: 'Assets',           category: 'Navigate', icon: Laptop,          action: () => go('/assets') },
    { id: 'expenses',    label: 'Expenses',         category: 'Navigate', icon: Receipt,         action: () => go('/expenses') },
    { id: 'travel',      label: 'Travel',           category: 'Navigate', icon: Plane,           action: () => go('/travel') },
    { id: 'shifts',      label: 'Shifts',           category: 'Navigate', icon: Clock3,          action: () => go('/shifts') },
    { id: 'timesheets',  label: 'Timesheets',       category: 'Navigate', icon: ListChecks,      action: () => go('/timesheets') },
    { id: 'projects',    label: 'Projects',         category: 'Navigate', icon: FolderKanban,    action: () => go('/projects') },
    { id: 'announcements',label:'Announcements',    category: 'Navigate', icon: Megaphone,       action: () => go('/announcements') },
    { id: 'training',    label: 'Training',         category: 'Navigate', icon: GraduationCap,   action: () => go('/training') },
    { id: 'organization',label: 'Organization',    category: 'Navigate', icon: Building2,       action: () => go('/organization') },
    { id: 'reports',     label: 'Reports',          category: 'Navigate', icon: BarChart3,       action: () => go('/reports') },
    { id: 'settings',    label: 'Settings',         category: 'Navigate', icon: Settings,        action: () => go('/settings') },
    { id: 'billing',     label: 'Billing',          category: 'Navigate', icon: CreditCard,      action: () => go('/billing') },
    { id: 'integrations',label: 'Integrations',    category: 'Navigate', icon: Plug,            action: () => go('/integrations') },
    { id: 'super-admin', label: 'Super Admin',      category: 'Navigate', icon: ShieldCheck,     action: () => go('/super-admin') },
    { id: 'exit',        label: 'Exit Management',  category: 'Navigate', icon: UserMinus,       action: () => go('/exit') },
    { id: 'fnf',         label: 'FnF Settlement',   category: 'Navigate', icon: HandCoins,       action: () => go('/fnf') },
    { id: 'tax',         label: 'Tax Calculator',   category: 'Navigate', icon: Calculator,      action: () => go('/tax-calculator') },
    { id: 'helpdesk',    label: 'Helpdesk',         category: 'Navigate', icon: Headphones,      action: () => go('/helpdesk'), keywords: 'tickets support hr it' },
  ];

  const filtered = query.trim()
    ? ALL_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        (c.keywords ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : ALL_COMMANDS.slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) { filtered[selectedIndex].action(); }
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center pt-[15vh]" onMouseDown={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: 'rgba(0,0,0,0.45)' }} />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden animate-scaleIn"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, actions, employees…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--text-primary)', border: 'none' }}
          />
          <div className="flex items-center text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ color: 'var(--text-muted)', background: 'var(--surface-active)', border: '1px solid var(--border)' }}>
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No results for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {category}
                </div>
                {items.map(item => {
                  const idx = globalIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left`}
                      style={{
                        background: isSelected ? 'var(--action-primary)' : 'transparent',
                        color: isSelected ? 'var(--action-primary-text)' : 'var(--text-primary)',
                      }}
                    >
                      <item.icon size={15} style={{ color: isSelected ? 'var(--action-primary-text)' : 'var(--text-muted)' }} />
                      <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                      <ArrowRight size={13} style={{ opacity: isSelected ? 1 : 0 }} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 text-[11px] px-4 py-2.5" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><Command size={10} /> K to open</span>
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
        </div>
      </div>
    </div>
  );
}
