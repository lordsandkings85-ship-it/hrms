import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Shield, HeartPulse, Waves, FormInput } from 'lucide-react';
import { ApiTableEditor } from '../../../components/ui/ApiTableEditor';
import { complianceSetupApi } from '../../../api/client';

type TabKey = 'pt' | 'pf' | 'esic' | 'lwf' | 'forms';

const SUB_TO_TAB: Record<string, TabKey> = {
  pt: 'pt',
  pf: 'pf',
  esic: 'esic',
  lwf: 'lwf',
  forms: 'forms',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  pt: 'pt',
  pf: 'pf',
  esic: 'esic',
  lwf: 'lwf',
  forms: 'forms',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'pt', label: 'Professional Tax', icon: <Landmark size={16} /> },
  { key: 'pf', label: 'Provident Fund', icon: <Shield size={16} /> },
  { key: 'esic', label: 'ESIC', icon: <HeartPulse size={16} /> },
  { key: 'lwf', label: 'Labour Welfare Fund', icon: <Waves size={16} /> },
  { key: 'forms', label: 'More Compliance Forms', icon: <FormInput size={16} /> },
];

export default function ComplianceSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'pt';

  const initialTab = SUB_TO_TAB[subAction] || 'pt';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/compliance/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Statutory Compliance</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure PT, PF, ESIC and LWF contribution rates.</p>
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
        {tab === 'pt' && (
          <ApiTableEditor title="Professional Tax" icon={Landmark} subtitle="State-wise professional tax slabs"
            load={() => complianceSetupApi.list('pt')}
            create={(d) => complianceSetupApi.create('pt', d)}
            update={(id, d) => complianceSetupApi.update('pt', id, d)}
            remove={(id) => complianceSetupApi.remove('pt', id)}
            fields={[
              { key: 'state', label: 'State', placeholder: 'State' },
              { key: 'fromAmount', label: 'From', placeholder: 'Salary range from', numeric: true },
              { key: 'toAmount', label: 'To', placeholder: 'Salary range to', numeric: true },
              { key: 'amount', label: 'Amount', placeholder: 'e.g. 200', numeric: true },
            ]} />
        )}
        {tab === 'pf' && (
          <ApiTableEditor title="Provident Fund" icon={Shield} subtitle="EPF contribution rates"
            load={() => complianceSetupApi.list('pf')}
            create={(d) => complianceSetupApi.create('pf', d)}
            update={(id, d) => complianceSetupApi.update('pf', id, d)}
            remove={(id) => complianceSetupApi.remove('pf', id)}
            fields={[
              { key: 'component', label: 'Component', placeholder: 'e.g. Employee PF' },
              { key: 'rate', label: 'Rate', placeholder: 'e.g. 12%' },
              { key: 'cap', label: 'Cap', placeholder: 'e.g. Ceiling ₹15,000' },
            ]} />
        )}
        {tab === 'esic' && (
          <ApiTableEditor title="ESIC" icon={HeartPulse} subtitle="ESI contribution rates"
            load={() => complianceSetupApi.list('esic')}
            create={(d) => complianceSetupApi.create('esic', d)}
            update={(id, d) => complianceSetupApi.update('esic', id, d)}
            remove={(id) => complianceSetupApi.remove('esic', id)}
            fields={[
              { key: 'component', label: 'Component', placeholder: 'e.g. Employee ESI' },
              { key: 'rate', label: 'Rate', placeholder: 'e.g. 0.75%' },
              { key: 'wageLimit', label: 'Wage Limit', placeholder: 'e.g. ₹21,000' },
            ]} />
        )}
        {tab === 'lwf' && (
          <ApiTableEditor title="Labour Welfare Fund" icon={Waves} subtitle="LWF contribution rates"
            load={() => complianceSetupApi.list('lwf')}
            create={(d) => complianceSetupApi.create('lwf', d)}
            update={(id, d) => complianceSetupApi.update('lwf', id, d)}
            remove={(id) => complianceSetupApi.remove('lwf', id)}
            fields={[
              { key: 'state', label: 'State', placeholder: 'State' },
              { key: 'employeeShare', label: 'Employee Share', placeholder: 'e.g. 10', numeric: true },
              { key: 'employerShare', label: 'Employer Share', placeholder: 'e.g. 40', numeric: true },
            ]} />
        )}
        {tab === 'forms' && (
          <ApiTableEditor title="More Compliance Forms" icon={FormInput} subtitle="Additional statutory forms"
            load={() => complianceSetupApi.list('forms')}
            create={(d) => complianceSetupApi.create('forms', d)}
            update={(id, d) => complianceSetupApi.update('forms', id, d)}
            remove={(id) => complianceSetupApi.remove('forms', id)}
            fields={[
              { key: 'formName', label: 'Form', placeholder: 'Form name' },
              { key: 'category', label: 'Category', type: 'select', options: ['TDS', 'PF', 'ESI', 'PT', 'Other'] },
            ]} />
        )}
      </div>
    </div>
  );
}
