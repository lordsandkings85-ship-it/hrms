import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/client';
import {
  Users, CheckCircle, AlertTriangle, Calendar, FileClock,
  Briefcase, FolderKanban, ArrowRight, UserMinus, HandCoins,
  Calculator, Sparkles
} from 'lucide-react';

const WIDGET_META: Record<string, { label: string; accent: string; icon: any }> = {
  totalEmployees: { label: 'Total Employees', accent: '#1F6F5C', icon: Users },
  presentToday: { label: 'Present Today', accent: '#10B981', icon: CheckCircle },
  absentToday: { label: 'Absent Today', accent: '#EF4444', icon: AlertTriangle },
  onLeaveToday: { label: 'On Leave', icon: Calendar, accent: '#8A7B4E' },
  pendingApprovals: { label: 'Pending Approvals', accent: '#F59E0B', icon: FileClock },
  openPositions: { label: 'Open Positions', accent: '#1F6F5C', icon: Briefcase },
  activeProjects: { label: 'Active Projects', accent: '#3B82F6', icon: FolderKanban },
};

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-ink to-ledgerDark text-paper rounded-2xl p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold tracking-tight">Workforce Ledger</h1>
          <p className="text-sm opacity-80 mt-2 max-w-xl">
            Real-time HR operations center. Fully automated roster shifts, compliant payroll runs, geofenced tracking, and exit clearance.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link to="/attendance" className="bg-ledger hover:bg-ledgerDark px-4 py-2 rounded-md text-xs font-semibold shadow transition-all">
            GPS Check-In
          </Link>
          <Link to="/tax-calculator" className="bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 rounded-md text-xs font-semibold transition-all">
            Tax Tool
          </Link>
        </div>
      </header>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 bg-white border border-line rounded-xl">
          <p className="text-sm text-muted animate-pulse">Loading system telemetry...</p>
        </div>
      )}
      {error && (
        <div className="p-5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <AlertTriangle />
          <div>
            <p className="font-medium text-sm">Could not connect to NestJS API.</p>
            <p className="text-xs mt-0.5">Please ensure the backend server is running on port 3000.</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(data.widgets).map(([key, value]) => {
            const meta = WIDGET_META[key] ?? { label: key, accent: '#1F6F5C', icon: Users };
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className="bg-white border border-line rounded-xl p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                  style={{ background: meta.accent }}
                />
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">{meta.label}</div>
                    <div className="font-mono text-3xl font-bold text-ink">{value}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-paper" style={{ color: meta.accent }}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced Automation Center */}
      <section className="bg-white border border-line rounded-xl p-6 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Set Rules &amp; Offboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Exit Clearance',
              desc: 'Structured employee exit clearance checklists, exit interviews, and timelines.',
              to: '/exit',
              icon: UserMinus,
              color: 'text-rust bg-rust/5'
            },
            {
              title: 'Full & Final (FnF)',
              desc: 'Automated gratuity, leave encashment calculations, and final payroll recovery.',
              to: '/fnf',
              icon: HandCoins,
              color: 'text-ledger bg-ledger/5'
            },
            {
              title: 'Income Tax Tool',
              desc: 'Standalone slab calculator for Old and New regimes (Finance Act 2025).',
              to: '/tax-calculator',
              icon: Calculator,
              color: 'text-blue-600 bg-blue-50'
            }
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="border border-line rounded-lg p-5 flex flex-col justify-between hover:border-muted transition-all">
                <div>
                  <div className={`p-3 rounded-lg w-fit mb-3 ${card.color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-ink">{card.title}</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{card.desc}</p>
                </div>
                <Link to={card.to} className="flex items-center gap-1.5 text-xs font-semibold text-ledger hover:text-ledgerDark mt-4 w-fit group">
                  Open Module <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
