import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Percent, IndianRupee, Heart, FileText, PlusCircle, Settings, Download, Upload } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

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

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'pt', label: 'Professional Tax', icon: Percent },
  { key: 'pf', label: 'Provident Fund (PF)', icon: Shield },
  { key: 'esic', label: 'ESIC', icon: Heart },
  { key: 'lwf', label: 'Labour Welfare Fund', icon: IndianRupee },
  { key: 'forms', label: 'Compliance Forms', icon: FileText },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PTContent() {
  return (
    <div>
      <SectionCard title="Professional Tax Slabs (Half-Yearly)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#009bde] text-white">
                <th className="px-4 py-2.5 text-left font-semibold">6-Month Gross Salary Range</th>
                <th className="px-4 py-2.5 text-right font-semibold">Half-Yearly PT (₹)</th>
                <th className="px-4 py-2.5 text-right font-semibold">Monthly Equivalent (₹)</th>
                <th className="px-4 py-2.5 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { range: '₹0 to ₹21,000', halfYearly: '₹0', monthly: '₹0', status: 'Exempt', color: 'text-emerald-600' },
                { range: '₹21,001 to ₹30,000', halfYearly: '₹135', monthly: '₹22.50', status: 'Applicable', color: 'text-amber-600' },
                { range: '₹30,001 to ₹45,000', halfYearly: '₹315', monthly: '₹52.50', status: 'Applicable', color: 'text-amber-600' },
                { range: '₹45,001 to ₹60,000', halfYearly: '₹690', monthly: '₹115.00', status: 'Applicable', color: 'text-amber-600' },
                { range: '₹60,001 to ₹75,000', halfYearly: '₹1,025', monthly: '₹170.83', status: 'Applicable', color: 'text-amber-600' },
                { range: '₹75,001 and above', halfYearly: '₹1,250', monthly: '₹208.33', status: 'Applicable', color: 'text-amber-600' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{row.range}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{row.halfYearly}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{row.monthly}</td>
                  <td className={`px-4 py-3 text-center font-semibold text-xs ${row.color}`}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          * Slabs are based on 6-Month Total Gross Salary. PT is assessed half-yearly (April-September & October-March).
        </p>
      </SectionCard>
    </div>
  );
}

function PFContent() {
  return (
    <div>
      <SectionCard title="Provident Fund (PF) Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Employee Contribution</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Employee PF Rate</span>
                <span className="font-bold text-blue-700">12% of Basic Salary</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Wage Ceiling</span>
                <span className="font-bold text-blue-700">₹15,000 / month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Max Monthly Contribution</span>
                <span className="font-bold text-blue-700">₹1,800 / month</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Employer Contribution</h4>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Employer PF Rate</span>
                <span className="font-bold text-emerald-700">12% of Basic Salary</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Allocation: EPS</span>
                <span className="font-bold text-emerald-700">8.33% (Max ₹1,250)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Allocation: EPF</span>
                <span className="font-bold text-emerald-700">3.67%</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="PF Monthly Summary">
        <div className="text-center text-slate-400 py-8">
          <Shield size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">PF summary will appear after payroll is processed for the month.</p>
        </div>
      </SectionCard>
    </div>
  );
}

function ESICContent() {
  return (
    <div>
      <SectionCard title="ESIC Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-purple-700 tracking-wider">Employee Contribution</h4>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">ESI Rate</span>
              <span className="font-bold text-purple-700">0.75% of Gross Salary</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Wage Ceiling</span>
              <span className="font-bold text-purple-700">₹21,000 / month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Exempt if Gross</span>
              <span className="font-bold text-purple-700">&gt; ₹21,000 / month</span>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-indigo-700 tracking-wider">Employer Contribution</h4>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Employer ESI Rate</span>
              <span className="font-bold text-indigo-700">3.25% of Gross Salary</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Applies to</span>
              <span className="font-bold text-indigo-700">Gross ≤ ₹21,000</span>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function LWFContent() {
  return (
    <div>
      <SectionCard title="Labour Welfare Fund (LWF)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#009bde] text-white">
                <th className="px-4 py-2.5 text-left">State</th>
                <th className="px-4 py-2.5 text-right">Employee Contribution</th>
                <th className="px-4 py-2.5 text-right">Employer Contribution</th>
                <th className="px-4 py-2.5 text-center">Frequency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { state: 'Maharashtra', employee: '₹6', employer: '₹12', freq: 'Monthly' },
                { state: 'Karnataka', employee: '₹10', employer: '₹20', freq: 'Annual' },
                { state: 'Tamil Nadu', employee: '₹10', employer: '₹20', freq: 'Annual' },
                { state: 'Delhi', employee: '₹0.75', employer: '₹2.25', freq: 'Monthly' },
                { state: 'Gujarat', employee: '₹6', employer: '₹12', freq: 'Bi-Annual' },
                { state: 'West Bengal', employee: '₹3', employer: '₹6', freq: 'Bi-Annual' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{row.state}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{row.employee}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">{row.employer}</td>
                  <td className="px-4 py-3 text-center text-slate-600 text-xs">{row.freq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">* LWF rates vary by state and are subject to change by respective state governments.</p>
      </SectionCard>
    </div>
  );
}

function FormsContent() {
  const forms = [
    { name: 'Form 3A - PF Annual Return', type: 'PF', icon: '📄' },
    { name: 'Form 6A - PF Annual Contribution', type: 'PF', icon: '📄' },
    { name: 'Form 12A - Monthly PF Challans', type: 'PF', icon: '📄' },
    { name: 'Form 1 - ESI Declaration', type: 'ESIC', icon: '📄' },
    { name: 'Form 6 - ESI Return', type: 'ESIC', icon: '📄' },
    { name: 'PT Challan', type: 'PT', icon: '📄' },
    { name: 'LWF Annual Return', type: 'LWF', icon: '📄' },
  ];
  return (
    <SectionCard title="Statutory Compliance Forms">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {forms.map((f, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">{f.icon}</span>
              <div>
                <div className="text-sm font-medium text-slate-800">{f.name}</div>
                <div className="text-xs text-slate-400">{f.type}</div>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-[#00a8cc] hover:underline font-medium">
              <Download size={13} /> Download
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function CompliancePage() {
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();

  const initialTab: TabKey = sub ? (SUB_TO_TAB[sub] || 'pt') : 'pt';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/compliance/${TAB_TO_SUB[t]}`);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Statutory Compliance"
        subtitle="Manage PF, ESI, Professional Tax and Labour Welfare Fund configurations"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-[#00a8cc] text-white text-sm rounded font-medium hover:bg-[#0090b0] transition-colors">
              <Upload size={14} /> Upload Challans
            </button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200 pb-0 -mb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-[#00a8cc] text-[#00a8cc]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'pt' && <PTContent />}
      {tab === 'pf' && <PFContent />}
      {tab === 'esic' && <ESICContent />}
      {tab === 'lwf' && <LWFContent />}
      {tab === 'forms' && <FormsContent />}
    </div>
  );
}
