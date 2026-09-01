import { useCallback, useEffect, useRef, useState } from 'react';
import { isElectron } from '../ui/TitleBar';

export type UpdateStatus = 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version: string;
  percent: number;
  transferred: number;
  total: number;
  error: string | null;
  offline: boolean;
  hasUpdate: boolean;
}

const initialState: UpdateState = {
  status: 'idle',
  version: '',
  percent: 0,
  transferred: 0,
  total: 0,
  error: null,
  offline: false,
  hasUpdate: false,
};

/**
 * Centralized update state machine. Subscribes once to all updater IPC
 * events and exposes imperative actions. Shared by the top banner and the
 * About/Updates page so both render from a single source of truth.
 */
export function useUpdateState() {
  const [state, setState] = useState<UpdateState>(initialState);
  const [installedVersion, setInstalledVersion] = useState('');
  const busyRef = useRef<{ checking: boolean; downloading: boolean }>({ checking: false, downloading: false });

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.getVersion().then(setInstalledVersion).catch(() => {});

    const offChecking = api.onUpdateChecking(() => {
      busyRef.current.checking = true;
      setState((s) => ({ ...s, status: 'checking', error: null, hasUpdate: false }));
    });
    const offAvailable = api.onUpdateAvailable((info) => {
      busyRef.current.checking = false;
      setState((s) => ({
        ...s,
        status: 'available',
        version: info.version,
        error: null,
        offline: false,
        hasUpdate: true,
      }));
    });
    const offNotAvailable = api.onUpdateNotAvailable(() => {
      busyRef.current.checking = false;
      setState((s) => ({ ...s, status: 'uptodate', error: null }));
    });
    const offProgress = api.onDownloadProgress((info) => {
      busyRef.current.downloading = true;
      setState((s) => ({
        ...s,
        status: 'downloading',
        percent: Math.round(info.percent),
        transferred: info.transferred,
        total: info.total,
        error: null,
      }));
    });
    const offDownloaded = api.onUpdateDownloaded((info) => {
      busyRef.current.downloading = false;
      setState((s) => ({ ...s, status: 'downloaded', version: info.version, percent: 100 }));
    });
    const offError = api.onUpdateError((info) => {
      busyRef.current.checking = false;
      busyRef.current.downloading = false;
      setState((s) => ({
        ...s,
        status: 'error',
        error: info.message,
        offline: info.offline,
        hasUpdate: false,
      }));
    });

    return () => {
      offChecking();
      offAvailable();
      offNotAvailable();
      offProgress();
      offDownloaded();
      offError();
    };
  }, []);

  const check = useCallback(() => {
    if (!isElectron() || busyRef.current.checking) return;
    window.electronAPI?.checkForUpdates();
  }, []);

  const download = useCallback(() => {
    if (!isElectron() || busyRef.current.downloading) return;
    window.electronAPI?.downloadUpdate();
  }, []);

  const install = useCallback(() => {
    if (!isElectron()) return;
    window.electronAPI?.quitAndInstall();
  }, []);

  return { state, installedVersion, check, download, install };
}
