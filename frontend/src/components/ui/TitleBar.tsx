import { useEffect, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.isMaximized().then(setIsMaximized);

    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized);
    return cleanup;
  }, []);

  if (!isElectron()) return null;

  return (
    <div
      className="electron-titlebar"
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        ...dragStyle,
        position: 'relative',
        zIndex: 9999,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 12,
          ...dragStyle,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ borderRadius: 4 }}>
          <rect width="24" height="24" rx="5" fill="#6366f1" />
          <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="system-ui">W</text>
        </svg>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
          }}
        >
          Workora HRMS
        </span>
      </div>

      <div style={{ flex: 1, ...dragStyle }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          ...noDragStyle,
        }}
      >
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="electron-titlebar-btn"
          title="Minimize"
          style={{
            width: 46,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Minus size={14} />
        </button>

        <button
          onClick={() => window.electronAPI?.maximize()}
          className="electron-titlebar-btn"
          title={isMaximized ? 'Restore' : 'Maximize'}
          style={{
            width: 46,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
        </button>

        <button
          onClick={() => window.electronAPI?.close()}
          className="electron-titlebar-btn electron-titlebar-close"
          title="Close"
          style={{
            width: 46,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e81123';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
