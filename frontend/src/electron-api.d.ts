export {};

declare global {
  interface Window {
    electronAPI?: {
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
      downloadUpdate: () => void;
      onUpdateChecking: (callback: () => void) => () => void;
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string | string[] }) => void) => () => void;
      onUpdateNotAvailable: (callback: () => void) => () => void;
      onDownloadProgress: (callback: (info: { percent: number; transferred: number; total: number }) => void) => () => void;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
      onUpdateError: (callback: (info: { message: string; offline: boolean }) => void) => () => void;
      quitAndInstall: () => void;
      getTheme: () => Promise<'light' | 'dark'>;
      onThemeChange: (callback: (theme: 'light' | 'dark') => void) => () => void;
    };
  }
}
