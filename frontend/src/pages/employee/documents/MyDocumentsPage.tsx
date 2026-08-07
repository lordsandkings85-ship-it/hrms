import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Search, Filter, BookOpen, CreditCard, ExternalLink, FileOutput } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { documentsApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';

type TabKey = 'hr-forms' | 'payroll-forms';

const SUB_TO_TAB: Record<string, TabKey> = {
  '': 'hr-forms',
  'payroll': 'payroll-forms',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  'hr-forms': '',
  'payroll-forms': 'payroll',
};

export default function MyDocumentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : '';

  const initialTab = SUB_TO_TAB[subAction] || 'hr-forms';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/documents${TAB_TO_SUB[t] ? `/${TAB_TO_SUB[t]}` : ''}`);
  };

  const myEmpId = user?.employee?.id || '';

  const { data: dbDocs, isLoading } = useQuery({
    queryKey: ['my-documents', myEmpId],
    queryFn: () => documentsApi.listForEmployee(myEmpId),
    enabled: !!myEmpId
  });

  const rawDocs: any[] = dbDocs || [];
  
  const documents = rawDocs.map((d: any) => ({
    id: d.id,
    title: d.name || d.fileUrl?.split('/').pop() || 'Company Document',
    category: (d.type) || 'other',
    description: d.description || `Uploaded file category: ${d.type || 'General'}`,
    url: d.fileUrl,
    fileType: d.fileUrl?.endsWith('.pdf') ? 'pdf' : d.fileUrl?.startsWith('http') ? 'link' : 'doc',
    date: d.createdAt || new Date().toISOString()
  }));

  const filteredDocs = documents.filter(d => {
    if (tab === 'payroll-forms') return d.category === 'salary_links' || d.title.toLowerCase().includes('payroll');
    return d.category === 'hr_policies' || d.category === 'hr_links' || !d.title.toLowerCase().includes('payroll');
  });

  const TABS = [
    { key: 'hr-forms', label: 'HR Forms', icon: <FileText size={16} /> },
    { key: 'payroll-forms', label: 'Payroll Forms', icon: <CreditCard size={16} /> },
  ] as const;

  const currentTab = TABS.find(t => t.key === tab) || TABS[0];

  const columns: Column<any>[] = [
    { 
      key: 'title', 
      header: 'Document Name', 
      render: (row) => (
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
             {row.fileType === 'link' ? <ExternalLink size={14} /> : <FileOutput size={14} />}
           </div>
           <div>
             <span className="font-bold text-[var(--text-primary)] block">{row.title}</span>
             <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{row.description}</span>
           </div>
        </div>
      ) 
    },
    { key: 'category', header: 'Category', render: (row) => <span className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider bg-[var(--surface-alt)] px-2 py-0.5 rounded border border-[var(--border)]">{row.category.replace('_', ' ')}</span> },
    { key: 'date', header: 'Date Added', render: (row) => <span className="font-mono text-xs text-[var(--text-primary)]">{new Date(row.date).toLocaleDateString()}</span> },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (row) => (
        <a href={row.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 text-teal-500 text-xs font-bold rounded-lg border border-teal-500/20 hover:bg-teal-500 hover:text-white transition-all w-fit">
           {row.fileType === 'link' ? <ExternalLink size={12} /> : <Download size={12} />} {row.fileType === 'link' ? 'Open Link' : 'Download'}
        </a>
      ) 
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      
      {/* Premium Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-teal-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shadow-inner">
             <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Document Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Access, download, and manage HR and Payroll forms.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              tab === t.key
                ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20'
                : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
            <div>
               <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                 {currentTab.icon} {currentTab.label} Directory
               </h3>
               <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Find and download important {currentTab.label.toLowerCase()}.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Search forms..." 
                  className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-teal-500/50 transition-colors w-64"
                />
              </div>
              <button aria-label="Filter" className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-teal-500 hover:border-teal-500/30 transition-colors bg-[var(--surface-alt)]">
                 <Filter size={16} />
              </button>
            </div>
          </div>

          <div className="premium-datatable">
            <style>{`
               .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
               .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
               .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
               .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
               .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
               .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
            `}</style>
            
            <DataTable columns={columns} data={filteredDocs} loading={isLoading} keyField="id" />
          </div>

        </div>
      </div>

    </div>
  );
}
