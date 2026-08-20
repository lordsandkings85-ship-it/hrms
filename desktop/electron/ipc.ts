import { ipcMain, dialog, shell, clipboard, BrowserWindow, app, nativeTheme } from 'electron';
import ElectronStore from 'electron-store';

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
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
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
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:platform', () => {
    return process.platform;
  });

  ipcMain.handle('dialog:save', async (event, options: Electron.SaveDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(win!, options);
    return result;
  });

  ipcMain.handle('dialog:open', async (event, options: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, options);
    return result;
  });

  ipcMain.handle('dialog:message', async (event, options: Electron.MessageBoxOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showMessageBox(win!, options);
    return result;
  });

  ipcMain.on('app:print', (event, options?: Electron.PrintOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.print(options ?? { silent: false });
    }
  });

  ipcMain.on('clipboard:write', (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('clipboard:read', () => {
    return clipboard.readText();
  });

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('theme:get', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });
}
