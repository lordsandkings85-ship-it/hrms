import { autoUpdater, UpdateInfo } from 'electron-updater';
import type { ProgressInfo } from 'electron-updater/types';
import { BrowserWindow, app } from 'electron';
import log from 'electron-log';

let mainWindow: BrowserWindow | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

const OFFLINE_MESSAGE = 'Unable to check for updates. Check your internet connection and try again.';

function sendToRenderer(channel: string, payload?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload ?? {});
  }
}

export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    sendToRenderer('updater:checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`Update available: ${info.version}`);
    sendToRenderer('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
    sendToRenderer('updater:not-available');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    sendToRenderer('updater:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`Update downloaded: ${info.version}`);
    sendToRenderer('updater:downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    const message =
      typeof error === 'string'
        ? error
        : error?.message ?? 'An unknown update error occurred.';
    const offline = /network|connection|timed ?out|ECONN|offline|failed to fetch/i.test(message);
    sendToRenderer('updater:error', {
      message: offline ? OFFLINE_MESSAGE : `Update failed: ${message}`,
      offline,
    });
  });

  if (!app.isPackaged) return;

  app.whenReady().then(() => {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        log.warn('Initial update check failed:', err.message);
      });
    }, 10_000);

    updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        log.warn('Periodic update check failed:', err.message);
      });
    }, CHECK_INTERVAL_MS);
  });

  app.on('before-quit', () => {
    if (updateCheckInterval) {
      clearInterval(updateCheckInterval);
      updateCheckInterval = null;
    }
  });
}

export function checkForUpdatesNow(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    log.warn('Manual update check failed:', err.message);
  });
}

export function downloadUpdateNow(): void {
  autoUpdater.downloadUpdate().catch((err) => {
    log.warn('Update download failed:', err.message);
  });
}

export function installUpdate(): void {
  setImmediate(() => autoUpdater.quitAndInstall());
}