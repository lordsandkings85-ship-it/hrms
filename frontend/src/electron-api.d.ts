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
      checkForUpdates: () => void;
      quitAndInstall: () => void;
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string | string[] }) => void) => () => void;
      onDownloadProgress: (callback: (info: { percent: number; transferred: number; total: number }) => void) => () => void;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
    };
  }
}