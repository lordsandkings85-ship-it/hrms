import { type ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-line relative">
      <div className="absolute bottom-0 left-0 w-32 h-[2px] bg-gradient-to-r from-action-primary to-transparent rounded-full" />
      <div className="flex items-center gap-6">
        {Icon && (
          <div className="p-4 bg-action-primary/10 text-action-primary rounded-2xl shadow-sm relative group overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-action-primary/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
            <Icon size={28} strokeWidth={2} className="relative z-10" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black text-ink tracking-tight mb-2">{title}</h1>
          {subtitle && <p className="text-sm font-semibold uppercase tracking-wider text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
