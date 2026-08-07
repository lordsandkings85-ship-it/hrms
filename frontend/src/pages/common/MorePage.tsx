import { Link } from 'react-router-dom';
import {
  Laptop, FolderKanban, Plane, GraduationCap, Megaphone, UserMinus, CreditCard, Plug,
  Users, Headphones, FileText, Briefcase, TrendingUp, LayoutGrid, ArrowUpRight,
} from 'lucide-react';

type MoreLink = { to: string; label: string; icon: React.ElementType; desc: string };

const LINKS: { group: string; items: MoreLink[] }[] = [
  {
    group: 'Admin & Setup',
    items: [
      { to: '/assets', label: 'Equipment & Assets', icon: Laptop, desc: 'Manage company equipment and allocations' },
      { to: '/projects', label: 'Projects & Tasks', icon: FolderKanban, desc: 'Track project deliverables and tasks' },
      { to: '/travel', label: 'Travel Requests', icon: Plane, desc: 'Submit and review travel claims' },
      { to: '/training', label: 'Training & Courses', icon: GraduationCap, desc: 'Browse learning and development programs' },
      { to: '/announcements', label: 'Announcements', icon: Megaphone, desc: 'Company-wide news and updates' },
      { to: '/exit', label: 'Exit Management', icon: UserMinus, desc: 'Resignation, clearance and exit interviews' },
      { to: '/billing', label: 'Billing & Plan', icon: CreditCard, desc: 'Manage subscription and plan usage' },
      { to: '/integrations', label: 'Integrations', icon: Plug, desc: 'Connect external services' },
    ],
  },
  {
    group: 'Employee Services',
    items: [
      { to: '/employees/directory', label: 'Employee Directory', icon: Users, desc: 'Find colleagues and contact details' },
      { to: '/helpdesk/feedback', label: 'Suggestions / Feedback', icon: Headphones, desc: 'Share ideas, feedback and complaints' },
      { to: '/documents/newsletter', label: 'Newsletter / Policies', icon: FileText, desc: 'Company newsletters and policy documents' },
      { to: '/documents/hr-links', label: 'Other HR Links', icon: FileText, desc: 'Additional HR resources' },
      { to: '/documents/salary-links', label: 'Other Salary Links', icon: FileText, desc: 'Additional salary resources' },
      { to: '/recruitment/job-ads', label: 'Job Openings', icon: Briefcase, desc: 'Open positions and career links' },
      { to: '/performance', label: 'Performance', icon: TrendingUp, desc: 'KPIs, appraisals and scorecards' },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
            <LayoutGrid size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">More</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Quick access to the rest of the platform.</p>
          </div>
        </div>
      </div>

      {LINKS.map(group => (
        <div key={group.group} className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{group.group}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/15 transition-colors">
                      <Icon size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-4 text-sm font-bold text-[var(--text-primary)] leading-tight">{item.label}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
