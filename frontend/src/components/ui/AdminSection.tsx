import React from 'react';

export function AdminSection({ title, icon: Icon, children, right, subtitle }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-[var(--border)] flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500"><Icon size={16} /></span>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-500 border-amber-500/20 bg-amber-500/10',
  approved: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
  rejected: 'text-rose-500 border-rose-500/20 bg-rose-500/10',
  cancelled: 'text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-alt)]',
  processed: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
  locked: 'text-amber-500 border-amber-500/20 bg-amber-500/10',
  enabled: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
  disabled: 'text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-alt)]',
};

export function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  const color = STATUS_COLORS[s] || 'text-indigo-500 border-indigo-500/20 bg-indigo-500/10';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${color}`}>
      {status || '—'}
    </span>
  );
}
