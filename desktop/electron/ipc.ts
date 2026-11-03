import { ipcMain, dialog, shell, clipboard, BrowserWindow, app, nativeTheme } from 'electron';
import ElectronStore from 'electron-store';
import { checkForUpdatesNow, downloadUpdateNow, installUpdate } from './updater';
import { getActiveDeviceContext, setLastKnownEmail } from './environment-risk';
import { isBoundedString, isRecord, isTrustedSender } from './ipc-guard';

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const store = new ElectronStore<{ window: WindowBounds }>({
  name: 'workora-window',
  defaults: {
    window: {
      width: 1400,
      height: 900,
      isMaximized: false,
    },
  },
});

export function getWindowBounds(): WindowBounds {
  return store.get('window');
}

export function saveWindowBounds(bounds: WindowBounds): void {
  store.set('window', bounds);
}

export function registerIPC(): void {
  ipcMain.on('window:minimize', (event) => {
    if (!isTrustedSender(event)) return;
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    if (!isTrustedSender(event)) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window:close', (event) => {
    if (!isTrustedSender(event)) return;
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    if (!isTrustedSender(event)) return false;
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  ipcMain.handle('app:version', (event) => {
    if (!isTrustedSender(event)) return '';
    return app.getVersion();
  });

  ipcMain.handle('app:platform', (event) => {
    if (!isTrustedSender(event)) return '';
    return process.platform;
  });

  /**
   * Synchronous snapshot for the preload bridge. It is collected in the main
   * process before the renderer loads, so a compromised page cannot influence
   * the platform/VM evidence sent to the backend.
   */
  ipcMain.on('app:device-context', (event) => {
    event.returnValue = isTrustedSender(event) ? getActiveDeviceContext() : null;
  });

  /** Last successful login, used to attribute a pre-login startup block. */
  ipcMain.handle('app:set-identity', (event, email: unknown) => {
    if (!isTrustedSender(event)) return false;
    if (!isBoundedString(email, 254)) return false;
    setLastKnownEmail(email);
    return true;
  });

  ipcMain.on('app:quit', (event) => {
    if (!isTrustedSender(event)) return;
    app.quit();
  });

  ipcMain.handle('dialog:save', async (event, options: unknown) => {
    if (!isTrustedSender(event)) return { canceled: true };
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !isRecord(options)) return { canceled: true };
    return dialog.showSaveDialog(win, options as Electron.SaveDialogOptions);
  });

  ipcMain.handle('dialog:open', async (event, options: unknown) => {
    if (!isTrustedSender(event)) return { canceled: true, filePaths: [] };
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !isRecord(options)) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(win, options as Electron.OpenDialogOptions);
  });

  ipcMain.handle('dialog:message', async (event, options: unknown) => {
    if (!isTrustedSender(event)) return { response: 0, checkboxChecked: false };
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !isRecord(options)) return { response: 0, checkboxChecked: false };
    return dialog.showMessageBox(win, options as unknown as Electron.MessageBoxOptions);
  });

  ipcMain.on('app:print', (event, options?: unknown) => {
    if (!isTrustedSender(event)) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.print(isRecord(options) ? (options as Electron.WebContentsPrintOptions) : { silent: false });
    }
  });

  ipcMain.on('clipboard:write', (event, text: unknown) => {
    if (!isTrustedSender(event)) return;
    if (typeof text !== 'string' || text.length > 5_000_000) return;
    clipboard.writeText(text);
  });

  ipcMain.handle('clipboard:read', (event) => {
    if (!isTrustedSender(event)) return '';
    return clipboard.readText();
  });

  ipcMain.handle('shell:openExternal', async (event, url: unknown) => {
    if (!isTrustedSender(event)) return;
    // Only web links: never let a page launch arbitrary local handlers.
    if (typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url) && url.length <= 2048) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('theme:get', (event) => {
    if (!isTrustedSender(event)) return 'light';
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  ipcMain.on('updater:check', (event) => {
    if (!isTrustedSender(event)) return;
    checkForUpdatesNow();
  });

  ipcMain.on('updater:download', (event) => {
    if (!isTrustedSender(event)) return;
    downloadUpdateNow();
  });

  ipcMain.on('updater:install', (event) => {
    if (!isTrustedSender(event)) return;
    installUpdate();
  });
}
