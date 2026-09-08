import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';

export interface CompanyOption {
  id: string;
  name: string;
  displayName?: string | null;
  legalName?: string | null;
  label?: string;
  status?: string;
}

interface CompanySelectorProps {
  companies: CompanyOption[];
  activeId?: string;
  onSwitch: (companyId: string) => void;
}

export default function CompanySelector({ companies, activeId, onSwitch }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = companies.find((c) => c.id === activeId) ?? companies[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!active) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={active.displayName || active.name}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs max-w-[220px]"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        <Building2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span className="truncate font-medium">{active.displayName || active.name}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-64 rounded-xl border z-50 shadow-xl p-1"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.15))' }}
          >
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Switch company
            </div>
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSwitch(c.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.displayName || c.name}</span>
                  {c.legalName && c.legalName !== (c.displayName || c.name) && (
                    <span className="block truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.legalName}</span>
                  )}
                </span>
                {c.id === active?.id && <Check size={14} style={{ color: 'var(--action-primary)', flexShrink: 0 }} />}
              </button>
            ))}
            {/* Placeholder for future "new company" entry-point (Phase C admin UI) */}
            {companies.some((c) => c.status === 'active') && (
              <div className="px-3 py-1.5 mt-1 border-t flex items-center gap-1.5 text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <Plus size={11} /> Manage companies in Organization setup
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}