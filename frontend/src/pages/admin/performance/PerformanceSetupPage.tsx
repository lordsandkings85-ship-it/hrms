import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Target, ListChecks, UserCheck, Layers, Gauge, CalendarRange, Repeat, Users2, ExternalLink, Star } from 'lucide-react';
import { ApiTableEditor } from '../../../components/ui/ApiTableEditor';
import { performanceSetupApi } from '../../../api/client';

type TabKey = 'kpa' | 'kpi-list' | 'assign-kpi' | 'kra' | 'kpi' | 'annual-target' | 'periodic-target' | 'peer-eval' | 'external-eval' | '360-summary';

const SUB_TO_TAB: Record<string, TabKey> = {
  kpa: 'kpa',
  'kpi-list': 'kpi-list',
  'assign-kpi': 'assign-kpi',
  kra: 'kra',
  kpi: 'kpi',
  'annual-target': 'annual-target',
  'periodic-target': 'periodic-target',
  'peer-eval': 'peer-eval',
  'external-eval': 'external-eval',
  '360-summary': '360-summary',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  kpa: 'kpa',
  'kpi-list': 'kpi-list',
  'assign-kpi': 'assign-kpi',
  kra: 'kra',
  kpi: 'kpi',
  'annual-target': 'annual-target',
  'periodic-target': 'periodic-target',
  'peer-eval': 'peer-eval',
  'external-eval': 'external-eval',
  '360-summary': '360-summary',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'kpa', label: 'KPA', icon: <Target size={16} /> },
  { key: 'kra', label: 'KRA', icon: <Layers size={16} /> },
  { key: 'kpi', label: 'KPI', icon: <Gauge size={16} /> },
  { key: 'kpi-list', label: 'KRA / KPI List', icon: <ListChecks size={16} /> },
  { key: 'assign-kpi', label: 'Assign KPI', icon: <UserCheck size={16} /> },
  { key: 'annual-target', label: 'Year Target Setup', icon: <CalendarRange size={16} /> },
  { key: 'periodic-target', label: 'Periodic Target', icon: <Repeat size={16} /> },
  { key: 'peer-eval', label: 'Peer Evaluation', icon: <Users2 size={16} /> },
  { key: 'external-eval', label: 'External Evaluation', icon: <ExternalLink size={16} /> },
  { key: '360-summary', label: '360 Evaluation', icon: <Star size={16} /> },
];

export default function PerformanceSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'kpa';

  const initialTab = SUB_TO_TAB[subAction] || 'kpa';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/performance/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Performance Setup</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure KPAs, KRAs, KPIs, targets and evaluation setup.</p>
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
        {tab === 'kpa' && (
          <ApiTableEditor title="Key Performance Areas" icon={Target} subtitle="KPA definitions"
            load={() => performanceSetupApi.list('kpas')}
            create={(d) => performanceSetupApi.create('kpas', d)}
            remove={(id) => performanceSetupApi.remove('kpas', id)}
            fields={[
              { key: 'name', label: 'KPA Name', placeholder: 'e.g. Delivery' },
              { key: 'weight', label: 'Weight', placeholder: 'e.g. 40%' },
              { key: 'description', label: 'Description', placeholder: 'Description' },
            ]} />
        )}
        {tab === 'kra' && (
          <ApiTableEditor title="Key Responsibility Areas" icon={Layers} subtitle="KRA definitions"
            load={() => performanceSetupApi.list('kras')}
            create={(d) => performanceSetupApi.create('kras', d)}
            remove={(id) => performanceSetupApi.remove('kras', id)}
            fields={[
              { key: 'name', label: 'KRA Name', placeholder: 'e.g. Project Delivery' },
              { key: 'description', label: 'Description', placeholder: 'Description' },
              { key: 'weight', label: 'Weight', placeholder: 'e.g. 40%' },
            ]} />
        )}
        {tab === 'kpi' && (
          <ApiTableEditor title="Key Performance Indicators" icon={Gauge} subtitle="KPI metric definitions"
            load={() => performanceSetupApi.list('kpis')}
            create={(d) => performanceSetupApi.create('kpis', d)}
            remove={(id) => performanceSetupApi.remove('kpis', id)}
            fields={[
              { key: 'name', label: 'KPI', placeholder: 'Metric name' },
              { key: 'category', label: 'Category', placeholder: 'e.g. Delivery' },
              { key: 'unit', label: 'Unit', placeholder: 'Percentage / Count' },
              { key: 'weight', label: 'Weight', placeholder: 'e.g. 20%' },
            ]} />
        )}
        {tab === 'kpi-list' && (
          <ApiTableEditor title="KRA / KPI List" icon={ListChecks} subtitle="Combined KRA-to-KPI mapping"
            load={() => performanceSetupApi.list('kpi-targets')}
            create={(d) => performanceSetupApi.create('kpi-targets', d)}
            remove={(id) => performanceSetupApi.remove('kpi-targets', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'kpiId', label: 'KPI ID', placeholder: 'KPI UUID' },
              { key: 'period', label: 'Period', placeholder: 'e.g. Q1 2026' },
              { key: 'target', label: 'Target', placeholder: 'Target description' },
            ]} />
        )}
        {tab === 'assign-kpi' && (
          <ApiTableEditor title="Assign KPI" icon={UserCheck} subtitle="KPI assignments per employee"
            load={() => performanceSetupApi.list('kpi-assignments')}
            create={(d) => performanceSetupApi.create('kpi-assignments', d)}
            remove={(id) => performanceSetupApi.remove('kpi-assignments', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'kpiId', label: 'KPI ID', placeholder: 'KPI UUID' },
              { key: 'weight', label: 'Weight', placeholder: 'e.g. 20%' },
            ]} />
        )}
        {tab === 'annual-target' && (
          <ApiTableEditor title="Appraisal Year Target Setup" icon={CalendarRange} subtitle="Annual targets per employee"
            load={() => performanceSetupApi.list('kpi-targets')}
            create={(d) => performanceSetupApi.create('kpi-targets', { ...d, type: 'annual' })}
            remove={(id) => performanceSetupApi.remove('kpi-targets', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'kpiId', label: 'KPI ID', placeholder: 'KPI UUID' },
              { key: 'period', label: 'Period', placeholder: 'e.g. 2026' },
              { key: 'target', label: 'Target', placeholder: 'Annual target' },
            ]} />
        )}
        {tab === 'periodic-target' && (
          <ApiTableEditor title="Periodic Target Setup" icon={Repeat} subtitle="Quarterly / periodic targets"
            load={() => performanceSetupApi.list('kpi-targets')}
            create={(d) => performanceSetupApi.create('kpi-targets', { ...d, type: 'periodic' })}
            remove={(id) => performanceSetupApi.remove('kpi-targets', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'kpiId', label: 'KPI ID', placeholder: 'KPI UUID' },
              { key: 'period', label: 'Period', placeholder: 'e.g. Q1 2026' },
              { key: 'target', label: 'Target', placeholder: 'Period target' },
            ]} />
        )}
        {tab === 'peer-eval' && (
          <ApiTableEditor title="Peer Evaluation Setup" icon={Users2} subtitle="Peer reviewers per employee"
            load={() => performanceSetupApi.list('evaluation-setups')}
            create={(d) => performanceSetupApi.create('evaluation-setups', { ...d, type: 'peer' })}
            remove={(id) => performanceSetupApi.remove('evaluation-setups', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'reviewers', label: 'Reviewers', placeholder: 'JSON array of reviewers' },
            ]} />
        )}
        {tab === 'external-eval' && (
          <ApiTableEditor title="External Evaluation Setup" icon={ExternalLink} subtitle="External reviewers per employee"
            load={() => performanceSetupApi.list('evaluation-setups')}
            create={(d) => performanceSetupApi.create('evaluation-setups', { ...d, type: 'external' })}
            remove={(id) => performanceSetupApi.remove('evaluation-setups', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'reviewers', label: 'Reviewers', placeholder: 'JSON array of reviewers' },
            ]} />
        )}
        {tab === '360-summary' && (
          <ApiTableEditor title="360 Evaluation Summary" icon={Star} subtitle="Aggregated 360 scores"
            load={() => performanceSetupApi.list('evaluation-360')}
            create={(d) => performanceSetupApi.create('evaluation-360', d)}
            remove={(id) => performanceSetupApi.remove('evaluation-360', id)}
            fields={[
              { key: 'employeeId', label: 'Employee ID', placeholder: 'Employee UUID' },
              { key: 'cycle', label: 'Cycle', placeholder: 'e.g. H1 2026' },
              { key: 'avgScore', label: 'Avg Score', placeholder: 'e.g. 4.2', numeric: true },
              { key: 'rating', label: 'Rating', type: 'select', options: ['Outstanding', 'Exceeds', 'Meets', 'Below'] },
            ]} />
        )}
      </div>
    </div>
  );
}
