export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-14 h-14 border-[3px]' };
  return (
    <div
      className={`rounded-full border-line border-t-ledger animate-spin ${sizes[size]} ${className}`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-paper gap-4">
      <div className="font-display text-2xl font-bold text-ink tracking-tight">Ledger HRMS</div>
      <Spinner size="lg" />
      <p className="text-sm text-muted animate-pulse">Authenticating your session...</p>
    </div>
  );
}
