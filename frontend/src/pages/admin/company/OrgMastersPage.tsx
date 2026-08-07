import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Boxes, Upload, FormInput } from 'lucide-react';
import { ApiTableEditor } from '../../../components/ui/ApiTableEditor';
import { orgMastersApi } from '../../../api/client';

type TabKey = 'masters' | 'import' | 'forms';

const SUB_TO_TAB: Record<string, TabKey> = {
  masters: 'masters',
  import: 'import',
  forms: 'forms',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  masters: 'masters',
  import: 'import',
  forms: 'forms',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'masters', label: 'HR Masters', icon: <Boxes size={16} /> },
  { key: 'import', label: 'Import Managers & Emails', icon: <Upload size={16} /> },
  { key: 'forms', label: 'More Forms', icon: <FormInput size={16} /> },
];

export default function OrgMastersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'masters';

  const initialTab = SUB_TO_TAB[subAction] || 'masters';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/organization/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Company Masters</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">HR masters, imports and additional forms.</p>
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
      <div className="space-y-6">
        {tab === 'masters' && (
          <ApiTableEditor title="HR Masters" icon={Boxes} subtitle="Common HR master values (marital status, blood group, bank, etc.)"
            load={() => orgMastersApi.list('masters')}
            create={(d) => orgMastersApi.create('masters', d)}
            remove={(id) => orgMastersApi.remove('masters', id)}
            fields={[
              { key: 'master', label: 'Master', placeholder: 'Master name' },
              { key: 'value', label: 'Values', placeholder: 'Comma separated values' },
            ]} />
        )}
        {tab === 'import' && (
          <ApiTableEditor title="Import Reporting Managers & Email IDs" icon={Upload} subtitle="Track imported reporting-manager mappings"
            load={() => orgMastersApi.list('import')}
            create={(d) => orgMastersApi.create('import', d)}
            remove={(id) => orgMastersApi.remove('import', id)}
            fields={[
              { key: 'employee', label: 'Employee', placeholder: 'Employee name' },
              { key: 'manager', label: 'Reporting Manager', placeholder: 'Manager name' },
              { key: 'email', label: 'Email', placeholder: 'Email address' },
            ]} />
        )}
        {tab === 'forms' && (
          <ApiTableEditor title="More Forms" icon={FormInput} subtitle="Additional HR form templates"
            load={() => orgMastersApi.list('forms')}
            create={(d) => orgMastersApi.create('forms', d)}
            remove={(id) => orgMastersApi.remove('forms', id)}
            fields={[
              { key: 'formName', label: 'Form', placeholder: 'Form name' },
              { key: 'category', label: 'Category', type: 'select', options: ['Onboarding', 'Payroll', 'Compliance', 'Other'] },
            ]} />
        )}
      </div>
    </div>
  );
}
