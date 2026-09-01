import { Download, Check, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useUpdateState } from '../update/useUpdateState';
import { isElectron } from './TitleBar';
import { useState } from 'react';

export default function UpdateBanner() {
  const { state, check, install } = useUpdateState();
  const [visible, setVisible] = useState(true);

  if (!isElectron() || !visible) return null;

  const { status, version, percent } = state;

  if (status !== 'available' && status !== 'downloading' && status !== 'downloaded') return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-xs shrink-0"
      style={{ background: status === 'downloaded' ? '#166534' : 'var(--action-primary)', color: '#fff' }}
    >
      {status === 'available' && (
        <>
          <Download size={14} />
          <span>Version {version.length ? `v${version} ` : ''}is available.</span>
          <button
            onClick={check}
            className="ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-white/90 hover:bg-white"
            style={{ color: 'var(--action-primary)' }}
          >
            <RefreshCw size={11} className="inline mr-1 -mb-0.5" />
            Check
          </button>
        </>
      )}
      {status === 'downloading' && (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>Downloading update v{version}… {percent}%</span>
          <div className="flex-1 h-1.5 rounded-full bg-black/20 overflow-hidden">
            <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
      {status === 'downloaded' && (
        <>
          <Check size={14} />
          <span>Update v{version} downloaded — click Restart to apply.</span>
          <button
            onClick={install}
            className="ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-white/90 hover:bg-white"
            style={{ color: '#166534' }}
          >
            <RotateCcw size={11} className="inline mr-1 -mb-0.5" />
            Restart Now
          </button>
        </>
      )}
      <button
        onClick={() => setVisible(false)}
        title="Dismiss"
        className="p-1 rounded-md hover:bg-black/10"
      >
        <X size={13} />
      </button>
    </div>
  );
}
