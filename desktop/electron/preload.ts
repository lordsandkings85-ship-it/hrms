import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;

  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  showSaveDialog: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showMessageBox: (options: Record<string, unknown>) => Promise<{ response: number; checkboxChecked: boolean }>;

  print: (options?: Record<string, unknown>) => void;

  writeText: (text: string) => void;
  readText: () => Promise<string>;

  openExternal: (url: string) => Promise<void>;

  isOnline: () => boolean;
  onOnline: (callback: () => void) => () => void;
  onOffline: (callback: () => void) => () => void;

  checkForUpdates: () => void;
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string | string[] }) => void) => () => void;
  onDownloadProgress: (callback: (info: { percent: number; transferred: number; total: number }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  quitAndInstall: () => void;

  getTheme: () => Promise<'light' | 'dark'>;
  onThemeChange: (callback: (theme: 'light' | 'dark') => void) => () => void;
}

function exposeAPI(): void {
  const api: ElectronAPI = {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

    onMaximizeChange: (callback) => {
      const handler = (_event: unknown, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window:maximize-change', handler);
      return () => ipcRenderer.removeListener('window:maximize-change', handler);
    },

    getVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => ipcRenderer.invoke('app:platform'),

    showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:message', options),

    print: (options) => ipcRenderer.send('app:print', options),

    writeText: (text) => ipcRenderer.send('clipboard:write', text),
    readText: () => ipcRenderer.invoke('clipboard:read'),

    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

    isOnline: () => navigator.onLine,
    onOnline: (callback) => {
      const handler = () => callback();
      window.addEventListener('online', handler);
      return () => window.removeEventListener('online', handler);
    },
    onOffline: (callback) => {
      const handler = () => callback();
      window.addEventListener('offline', handler);
      return () => window.removeEventListener('offline', handler);
    },

    checkForUpdates: () => ipcRenderer.send('updater:check'),
    onUpdateAvailable: (callback) => {
      const handler = (_event: unknown, info: { version: string; releaseNotes: string | string[] }) => callback(info);
      ipcRenderer.on('updater:available', handler);
      return () => ipcRenderer.removeListener('updater:available', handler);
    },
    onDownloadProgress: (callback) => {
      const handler = (_event: unknown, info: { percent: number; transferred: number; total: number }) => callback(info);
      ipcRenderer.on('updater:progress', handler);
      return () => ipcRenderer.removeListener('updater:progress', handler);
    },
    onUpdateDownloaded: (callback) => {
      const handler = (_event: unknown, info: { version: string }) => callback(info);
      ipcRenderer.on('updater:downloaded', handler);
      return () => ipcRenderer.removeListener('updater:downloaded', handler);
    },
    quitAndInstall: () => ipcRenderer.send('updater:install'),

    getTheme: () => ipcRenderer.invoke('theme:get'),
    onThemeChange: (callback) => {
      const handler = (_event: unknown, theme: 'light' | 'dark') => callback(theme);
      ipcRenderer.on('theme:change', handler);
      return () => ipcRenderer.removeListener('theme:change', handler);
    },
  };

  contextBridge.exposeInMainWorld('electronAPI', api);
}

exposeAPI();
