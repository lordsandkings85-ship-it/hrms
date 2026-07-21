import { type ElementType } from 'react';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'var(--action-primary)',
  trend,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  accent?: string;
  trend?: { value: number; label: string };
}) {
  const isPositive = trend && trend.value >= 0;
  
  return (
    <div className="section-card p-5 relative group flex flex-col">
      {/* accent left bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] group-hover:w-1.5 transition-all"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between pl-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p className="font-mono text-3xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-3">
              <div 
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ 
                  background: isPositive ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: isPositive ? 'var(--success-text)' : 'var(--danger-text)',
                }}
              >
                {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="p-2.5 rounded-xl transition-colors"
          style={{ background: 'var(--surface-active)', color: accent }}
        >
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
