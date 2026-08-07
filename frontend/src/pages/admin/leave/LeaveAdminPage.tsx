import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarCheck2, Scale, CalendarClock, FileStack, CalendarPlus, CalendarHeart, CalendarOff, Sparkles, Tag } from 'lucide-react';
import { LeaveRequestsSection, LeaveBalancesSection, CompOffSection, LeavePoliciesSection, HolidaysSection, FlexibleHolidaysSection, WeeklyOffSection, SpecialHolidaySection, LeaveTypesSection } from './sections/LeaveSections';

type TabKey = 'types' | 'requests' | 'balances' | 'compoff' | 'policies' | 'holidays' | 'flexible' | 'weekly-off' | 'special';

const SUB_TO_TAB: Record<string, TabKey> = {
  types: 'types',
  requests: 'requests',
  balances: 'balances',
  compoff: 'compoff',
  policies: 'policies',
  holidays: 'holidays',
  flexible: 'flexible',
  'weekly-off': 'weekly-off',
  special: 'special',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  types: 'types',
  requests: 'requests',
  balances: 'balances',
  compoff: 'compoff',
  policies: 'policies',
  holidays: 'holidays',
  flexible: 'flexible',
  'weekly-off': 'weekly-off',
  special: 'special',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'types', label: 'Leave Types', icon: <Tag size={16} /> },
  { key: 'requests', label: 'Leave Requests', icon: <CalendarCheck2 size={16} /> },
  { key: 'balances', label: 'Leave Balances', icon: <Scale size={16} /> },
  { key: 'compoff', label: 'Comp Off', icon: <CalendarClock size={16} /> },
  { key: 'policies', label: 'Leave Policies', icon: <FileStack size={16} /> },
  { key: 'holidays', label: 'General Holidays', icon: <CalendarPlus size={16} /> },
  { key: 'flexible', label: 'Flexible Holidays', icon: <CalendarHeart size={16} /> },
  { key: 'weekly-off', label: 'Weekly Off', icon: <CalendarOff size={16} /> },
  { key: 'special', label: 'Special Holiday', icon: <Sparkles size={16} /> },
];

const CONTENT: Record<TabKey, React.ReactNode> = {
  types: <LeaveTypesSection />,
  requests: <LeaveRequestsSection />,
  balances: <LeaveBalancesSection />,
  compoff: <CompOffSection />,
  policies: <LeavePoliciesSection />,
  holidays: <HolidaysSection />,
  flexible: <FlexibleHolidaysSection />,
  'weekly-off': <WeeklyOffSection />,
  special: <SpecialHolidaySection />,
};

export default function LeaveAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'requests';

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
