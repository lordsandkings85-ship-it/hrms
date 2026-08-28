import { useEffect, useState } from 'react';
import { Download, RefreshCw, RotateCcw, X } from 'lucide-react';

type UpdateState = 'idle' | 'downloading' | 'downloaded';

export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const offAvailable = api.onUpdateAvailable((info) => {
      setVersion(info.version);
      setState('idle');
      setVisible(true);
    });
    const offProgress = api.onDownloadProgress((info) => {
      setPercent(Math.round(info.percent));
      setState('downloading');
      setVisible(true);
    });
    const offDownloaded = api.onUpdateDownloaded((info) => {
      setVersion(info.version);
      setState('downloaded');
      setVisible(true);
    });

    return () => {
      offAvailable();
      offProgress();
      offDownloaded();
    };
  }, []);

  if (!window.electronAPI || !visible || state === 'idle') return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-xs shrink-0"
      style={{ background: 'var(--action-primary)', color: 'var(--action-primary-text)' }}
    >
      {state === 'downloading' && (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>
            Downloading update v{version}… {percent}%
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-black/20 overflow-hidden">
            <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
      {state === 'downloaded' && (
        <>
          <Download size={14} />
          <span>Update v{version} downloaded — click Restart to apply changes.</span>
          <button
            onClick={() => window.electronAPI?.quitAndInstall()}
            className="ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-white/90 hover:bg-white"
            style={{ color: 'var(--action-primary)' }}
          >
            <RotateCcw size={11} className="inline mr-1 -mb-0.5" />
            Restart Now
          </button>
        </>
      )}
      <button
        onClick={() => setVisible(false)}
        title="Dismiss"
        className="ml-auto p-1 rounded-md hover:bg-black/10"
      >
        <X size={13} />
      </button>
    </div>
  );
}