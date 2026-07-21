import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'border-l-success text-success',
  error: 'border-l-danger text-danger',
  warning: 'border-l-warning text-warning-dark',
  info: 'border-l-info text-info',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast('error', t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast('warning', t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast('info', t, m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 w-80 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl p-4 flex items-start gap-3 animate-toastIn"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
                boxShadow: 'var(--shadow-popover)',
              }}
            >
              <Icon size={16} className="mt-0.5 flex-shrink-0"
                style={{ color: t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--info)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                {t.message && (
                  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t.message}</div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
