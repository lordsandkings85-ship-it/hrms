import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, MonitorX, ArrowLeft, LogOut } from 'lucide-react';
import { clearSecurityBlock, readSecurityBlock, SecurityBlockInfo } from '../../api/client';
import workoraIcon from '../../assets/brand/workora-icon.png';

const DEFAULT_MESSAGE =
  'Workora HRMS Desktop is available only for supported Windows 10 and Windows 11 computers. Please install and run the Windows EXE on a compatible Windows computer.';

const ACCOUNT_MESSAGE =
  'Your account has been blocked by the Workora security policy. Please contact your administrator to restore access.';

export default function UnsupportedDevicePage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<SecurityBlockInfo | null>(() => readSecurityBlock());

  useEffect(() => {
    // The block record may land in sessionStorage after the first render when a
    // 403 arrives from an in-flight request.
    setInfo(readSecurityBlock());
  }, []);

  const isAccountBlock = info?.kind === 'account-blocked';
  const title = isAccountBlock ? 'Account Blocked' : 'Unsupported Operating System';
  const message = isAccountBlock
    ? info?.message || ACCOUNT_MESSAGE
    : info?.message || DEFAULT_MESSAGE;

  function handleContinue() {
    clearSecurityBlock();
    navigate('/login', { replace: true });
  }

  function handleExit() {
    if (window.electronAPI?.quit) {
      window.electronAPI.quit();
      return;
    }
    window.close();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-surface overflow-auto">
      <div className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-xl p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <img src={workoraIcon} alt="Workora HRMS" className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/5" />
          <div>
            <div className="font-display text-xl font-bold text-[var(--text-primary)]">
              Workora <span className="text-[#4f772d] dark:text-[#52b788] text-base font-medium">HRMS</span>
            </div>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              Smart People. Stronger Organizations.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="shrink-0 p-3 rounded-2xl bg-rose-500/10 text-rose-500">
            {isAccountBlock ? <ShieldAlert size={28} /> : <MonitorX size={28} />}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{message}</p>
          </div>
        </div>

        {!!info?.reasons?.length && (
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Detection details
            </p>
            <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
              {info.reasons.slice(0, 5).map((reason, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-500">•</span>
                  <span className="break-words">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {info?.eventId && (
          <p className="mt-4 text-[11px] text-[var(--text-muted)]">
            Security event reference: <span className="font-mono">{info.eventId}</span>
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-[var(--text-muted)]">
          This attempt has been recorded and the authorized Workora administrators have been notified.
          If you believe this is a mistake, contact your HR or IT administrator with the reference above.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>
          {window.electronAPI && (
            <button
              type="button"
              onClick={handleExit}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              <LogOut size={16} />
              Close application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
