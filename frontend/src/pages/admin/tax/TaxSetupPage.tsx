import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Scale, FolderTree } from 'lucide-react';
import { ApiTableEditor } from '../../../components/ui/ApiTableEditor';
import { taxSetupApi } from '../../../api/client';

type TabKey = 'slabs' | 'sec-category' | 'income-slab-cat';

const SUB_TO_TAB: Record<string, TabKey> = {
  slabs: 'slabs',
  'sec-category': 'sec-category',
  'income-slab-cat': 'income-slab-cat',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  slabs: 'slabs',
  'sec-category': 'sec-category',
  'income-slab-cat': 'income-slab-cat',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'slabs', label: 'TDS Income Slabs', icon: <Landmark size={16} /> },
  { key: 'sec-category', label: 'TDS Sec. Category', icon: <Scale size={16} /> },
  { key: 'income-slab-cat', label: 'Income Slab Category', icon: <FolderTree size={16} /> },
];

export default function TaxSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'slabs';

  const initialTab = SUB_TO_TAB[subAction] || 'slabs';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/tax-calculator/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">TDS Setup</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure TDS slabs, sections and income slab categories.</p>
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
        {tab === 'slabs' && (
          <ApiTableEditor title="TDS Income Slabs" icon={Landmark} subtitle="Income tax slabs and rates"
            load={() => taxSetupApi.list('slabs')}
            create={(d) => taxSetupApi.create('slabs', d)}
            remove={(id) => taxSetupApi.remove('slabs', id)}
            fields={[
              { key: 'regime', label: 'Regime', type: 'select', options: ['Old', 'New'] },
              { key: 'fromAmount', label: 'From', placeholder: 'e.g. 500000', numeric: true },
              { key: 'toAmount', label: 'To', placeholder: 'e.g. 1000000', numeric: true },
              { key: 'rate', label: 'Rate', placeholder: 'e.g. 20%' },
            ]} />
        )}
        {tab === 'sec-category' && (
          <ApiTableEditor title="TDS Sec. Category" icon={Scale} subtitle="Section 80C, 80D, 24(b) categories"
            load={() => taxSetupApi.list('sections')}
            create={(d) => taxSetupApi.create('sections', d)}
            remove={(id) => taxSetupApi.remove('sections', id)}
            fields={[
              { key: 'section', label: 'Section', placeholder: 'e.g. 80C' },
              { key: 'name', label: 'Name', placeholder: 'Category name' },
              { key: 'limit', label: 'Limit', placeholder: 'e.g. 150000' },
            ]} />
        )}
        {tab === 'income-slab-cat' && (
          <ApiTableEditor title="TDS Income Slab Category" icon={FolderTree} subtitle="Slab categories and applicability"
            load={() => taxSetupApi.list('income-slab-categories')}
            create={(d) => taxSetupApi.create('income-slab-categories', d)}
            remove={(id) => taxSetupApi.remove('income-slab-categories', id)}
            fields={[
              { key: 'category', label: 'Category', placeholder: 'e.g. General' },
              { key: 'applicability', label: 'Applicability', placeholder: 'Age bracket' },
              { key: 'regime', label: 'Regime', type: 'select', options: ['Old', 'New'] },
            ]} />
        )}
      </div>
    </div>
  );
}
