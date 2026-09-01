import { useUpdateState } from '../../components/update/useUpdateState';
import { isElectron } from '../../components/ui/TitleBar';
import {
  Download, RefreshCw, RotateCcw, CheckCircle2, XCircle,
  WifiOff, Package, Info, ShieldCheck, Github,
} from 'lucide-react';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AboutUpdatesPage() {
  const { state, installedVersion, check, download, install } = useUpdateState();

  const isDesktop = isElectron();
  const { status, version, percent, transferred, total, error, offline } = state;

  const busy = status === 'checking' || status === 'downloading';

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">About &amp; Updates</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
              {isDesktop
                ? 'Check for and apply software updates for the Workora desktop app.'
                : 'Software updates are only available in the Workora desktop application.'}
            </p>
          </div>
        </div>
      </div>

      {!isDesktop ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <Info size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            You are using the web version. Updates are managed automatically and require the desktop app.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
              <ShieldCheck size={14} /> Application
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-active, rgba(0,0,0,0.03))' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Installed version</div>
                <div className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  v{installedVersion || '...'}
                </div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-active, rgba(0,0,0,0.03))' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest available</div>
                <div className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {status === 'available' || status === 'downloading' || status === 'downloaded'
                    ? `v${version}`
                    : status === 'uptodate'
                      ? 'You are up to date'
                      : '—'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={check}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}
              >
                <RefreshCw size={15} className={status === 'checking' ? 'animate-spin' : ''} />
                Check for Updates
              </button>
              {status === 'available' && (
                <button
                  onClick={download}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}
                >
                  <Download size={15} />
                  Download Update
                </button>
              )}
              {status === 'downloaded' && (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: '#166534', color: '#fff' }}
                >
                  <RotateCcw size={15} />
                  Restart &amp; Update
                </button>
              )}
            </div>
          </div>

          {status === 'downloading' && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Downloading v{version}… {percent}%
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(transferred)} / {formatBytes(total)}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-active, rgba(0,0,0,0.06))' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: 'var(--action-primary)', width: `${Math.max(0, Math.min(100, percent))}%` }}
                />
              </div>
            </div>
          )}

          {status === 'downloaded' && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border" style={{ background: '#16653410', borderColor: '#16653440' }}>
              <CheckCircle2 size={20} className="shrink-0" style={{ color: '#166534' }} />
              <div className="text-sm">
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Update v{version} downloaded
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Restart the app to apply the update. This will not happen automatically.
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: '#dc262610', borderColor: '#dc262640' }}>
              {offline ? <WifiOff size={20} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} /> : <XCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} />}
              <div className="text-sm">
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Update error</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{error}</div>
              </div>
            </div>
          )}

          {status === 'uptodate' && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border" style={{ background: '#16a34a10', borderColor: '#16a34a40' }}>
              <CheckCircle2 size={20} className="shrink-0" style={{ color: '#16a34a' }} />
              <div className="text-sm">
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>You're up to date</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Workora v{installedVersion} is the latest version.
                </div>
              </div>
            </div>
          )}

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <Github size={18} />
              <span style={{ color: 'var(--text-muted)' }}>
                Updates are distributed via the official GitHub release channel.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
