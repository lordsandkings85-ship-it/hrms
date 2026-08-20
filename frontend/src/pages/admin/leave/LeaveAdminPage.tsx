import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck2, Scale, CalendarClock, FileStack, CalendarPlus, CalendarHeart, CalendarOff, Sparkles, Tag, Users, Clock, CheckCircle2, XCircle, CalendarDays, BookOpen, History } from 'lucide-react';
import { LeaveRequestsSection, LeaveBalancesSection, CompOffSection, LeavePoliciesSection, HolidaysSection, FlexibleHolidaysSection, WeeklyOffSection, SpecialHolidaySection, LeaveTypesSection, LeaveTransactionsSection, LeaveYearsSection } from './sections/LeaveSections';
import { leaveApi } from '../../../api/client';
import { fmtDateShort } from '../../../utils/formatDate';

type TabKey = 'types' | 'requests' | 'balances' | 'transactions' | 'compoff' | 'policies' | 'holidays' | 'flexible' | 'weekly-off' | 'special' | 'leave-years';

const SUB_TO_TAB: Record<string, TabKey> = {
  types: 'types',
  requests: 'requests',
  balances: 'balances',
  transactions: 'transactions',
  compoff: 'compoff',
  policies: 'policies',
  holidays: 'holidays',
  flexible: 'flexible',
  'weekly-off': 'weekly-off',
  special: 'special',
  'leave-years': 'leave-years',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  types: 'types',
  requests: 'requests',
  balances: 'balances',
  transactions: 'transactions',
  compoff: 'compoff',
  policies: 'policies',
  holidays: 'holidays',
  flexible: 'flexible',
  'weekly-off': 'weekly-off',
  special: 'special',
  'leave-years': 'leave-years',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'types', label: 'Leave Types', icon: <Tag size={16} /> },
  { key: 'requests', label: 'Leave Requests', icon: <CalendarCheck2 size={16} /> },
  { key: 'balances', label: 'Leave Balances', icon: <Scale size={16} /> },
  { key: 'transactions', label: 'Transactions', icon: <History size={16} /> },
  { key: 'compoff', label: 'Comp Off', icon: <CalendarClock size={16} /> },
  { key: 'policies', label: 'Leave Policies', icon: <FileStack size={16} /> },
  { key: 'holidays', label: 'General Holidays', icon: <CalendarPlus size={16} /> },
  { key: 'flexible', label: 'Flexible Holidays', icon: <CalendarHeart size={16} /> },
  { key: 'weekly-off', label: 'Weekly Off', icon: <CalendarOff size={16} /> },
  { key: 'special', label: 'Special Holiday', icon: <Sparkles size={16} /> },
  { key: 'leave-years', label: 'Leave Years', icon: <BookOpen size={16} /> },
];

const CONTENT: Record<TabKey, React.ReactNode> = {
  types: <LeaveTypesSection />,
  requests: <LeaveRequestsSection />,
  balances: <LeaveBalancesSection />,
  transactions: <LeaveTransactionsSection />,
  compoff: <CompOffSection />,
  policies: <LeavePoliciesSection />,
  holidays: <HolidaysSection />,
  flexible: <FlexibleHolidaysSection />,
  'weekly-off': <WeeklyOffSection />,
  special: <SpecialHolidaySection />,
  'leave-years': <LeaveYearsSection />,
};

export default function LeaveAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'requests';

  const { data: analytics } = useQuery({ queryKey: ['leave-analytics'], queryFn: leaveApi.analytics });
  const summary = analytics?.summary;
  const nextHoliday = summary?.upcomingHolidays?.[0];

  const statCards: { label: string; value?: number; icon: React.ElementType; color: string; sub?: string }[] = [
    { label: 'Total Employees', value: summary?.totalEmployees, icon: Users, color: 'text-indigo-500' },
    { label: 'Pending Requests', value: summary?.pendingRequests, icon: Clock, color: 'text-amber-500' },
    { label: 'Approved This Month', value: summary?.approvedThisMonth, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Rejected This Month', value: summary?.rejectedThisMonth, icon: XCircle, color: 'text-rose-500' },
    {
      label: 'Upcoming Holidays',
      value: Array.isArray(summary?.upcomingHolidays) ? summary.upcomingHolidays.length : undefined,
      icon: CalendarDays,
      color: 'text-sky-500',
      sub: nextHoliday ? `${nextHoliday.name} · ${fmtDateShort(nextHoliday.date)}` : undefined,
    },
  ];

  const initialTab = SUB_TO_TAB[subAction] || 'requests';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/leave/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Leave</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage leave requests, balances, policies and holidays.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={c.color} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{c.label}</p>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-[var(--text-primary)]">{c.value ?? '—'}</p>
              {c.sub && <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">{c.sub}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-colors ${tab === t.key ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {CONTENT[tab]}
    </div>
  );
}
