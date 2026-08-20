import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, dialog, app } from 'electron';
import log from 'electron-log';

let mainWindow: BrowserWindow | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`Update available: ${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }

    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available.`,
        detail: 'Would you like to download and install it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`Update downloaded: ${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:downloaded', {
        version: info.version,
      });
    }

    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
  });

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
