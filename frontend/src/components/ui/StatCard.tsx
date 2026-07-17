import { type ElementType } from 'react';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = '#1F6F5C',
  trend,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  accent?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white border border-line rounded-xl p-5 relative overflow-hidden shadow-card hover:shadow-raised transition-all group">
      {/* accent left bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all rounded-r"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <div className="pl-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">
            {label}
          </p>
          <p className="font-mono text-3xl font-bold text-ink leading-none">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.value >= 0 ? 'text-success-dark' : 'text-danger-dark'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="p-2.5 rounded-xl transition-colors"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
