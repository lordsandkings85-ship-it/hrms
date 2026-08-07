import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Hash, KeyRound } from 'lucide-react';
import { ConfigEditor } from '../../../components/ui/ConfigEditor';

type TabKey = 'employee-id' | 'credentials';

const SUB_TO_TAB: Record<string, TabKey> = {
  'employee-id': 'employee-id',
  credentials: 'credentials',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  'employee-id': 'employee-id',
  credentials: 'credentials',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'employee-id', label: 'Configure Employee ID', icon: <Hash size={16} /> },
  { key: 'credentials', label: 'Send Login Credentials', icon: <KeyRound size={16} /> },
];

const NOTE = 'Synced to the backend settings store.';

const CONTENT: Record<TabKey, React.ReactNode> = {
  'employee-id': (
    <ConfigEditor storageKey="settings-employee-id" backendKey="employeeIdConfig" title="Employee ID Configuration" icon={Hash} subtitle="Employee ID prefix and sequence" note={NOTE}
      defaultRows={[{ id: 'cfg1', prefix: 'LK', separator: '-', nextNumber: '1001', format: 'LK-1001' }]}
      fields={[
        { key: 'prefix', label: 'Prefix', placeholder: 'e.g. LK' },
        { key: 'separator', label: 'Separator', placeholder: 'e.g. -' },
        { key: 'nextNumber', label: 'Next Number', placeholder: 'e.g. 1001' },
      ]} />
  ),
  credentials: (
    <ConfigEditor storageKey="settings-credentials" backendKey="credentialDelivery" title="Send Employee Login Credentials" icon={KeyRound} subtitle="Track credential delivery to employees" note={NOTE}
      defaultRows={[{ id: 'cr1', employee: 'Sathish Kumar', email: 'sathish@lordsandkings.co', sent: 'Pending' }]}
      fields={[
        { key: 'employee', label: 'Employee', placeholder: 'Employee name' },
        { key: 'email', label: 'Email', placeholder: 'Email address' },
        { key: 'sent', label: 'Status', type: 'select', options: ['Pending', 'Sent'] },
      ]} />
  ),
};

export default function SettingsSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'employee-id';

  const initialTab = SUB_TO_TAB[subAction] || 'employee-id';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/settings/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Settings Setup</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure employee ID generation and credential delivery.</p>
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
