import { type ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'ledger';

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-success-light text-success-dark border-success/20',
  warning: 'bg-warning-light text-warning-dark border-warning/20',
  danger:  'bg-danger-light  text-danger-dark  border-danger/20',
  info:    'bg-info-light    text-info-dark    border-info/20',
  muted:   'bg-paperDim      text-muted        border-line',
  ledger:  'bg-ledgerLight   text-ledgerDark   border-ledger/20',
};

export function Badge({
  children,
  variant = 'muted',
  dot = false,
  className = '',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${VARIANTS[variant]} ${className}`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'currentColor', opacity: 0.7 }}
        />
      )}
      {children}
    </span>
  );
}

/** Convenience: convert a status string to the right variant */
export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const variant: BadgeVariant =
    s === 'active' || s === 'approved' || s === 'present' || s === 'completed'
      ? 'success'
      : s === 'pending' || s === 'late'
      ? 'warning'
      : s === 'inactive' || s === 'rejected' || s === 'absent'
      ? 'danger'
      : 'muted';
  return (
    <Badge variant={variant} dot>
      {status}
    </Badge>
  );
}
