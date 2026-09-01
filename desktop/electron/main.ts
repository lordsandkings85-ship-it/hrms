import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { registerSecurity } from './security';
import { registerIPC, getWindowBounds, saveWindowBounds } from './ipc';
import { createAppMenu } from './menu';
import { initAutoUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function getResourcePath(...segments: string[]): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', ...segments);
  }
  return join(__dirname, '..', '..', 'resources', ...segments);
}

function getRendererPath(): string {
  if (isDev && VITE_DEV_SERVER_URL) {
    return VITE_DEV_SERVER_URL;
  }
  if (app.isPackaged) {
    return join(app.getAppPath(), 'dist', 'renderer', 'index.html');
  }
  return join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
}

function createSplashWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const splashPath = getResourcePath('loading.html');
  win.loadFile(splashPath);
  return win;
}

function createMainWindow(): BrowserWindow {
  const bounds = getWindowBounds();

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    show: false,
    title: 'Workora HRMS',
    icon: getResourcePath('icon-256.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
    },
  });

  win.on('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }

    win.show();
    win.focus();

    if (bounds.isMaximized) {
      win.maximize();
    }
  });

  win.on('maximize', () => {
    win.webContents.send('window:maximize-change', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:maximize-change', false);
  });

  win.on('resize', () => {
    if (!win.isMaximized()) {
      const [width, height] = win.getSize();
      saveWindowBounds({ width, height, isMaximized: false });
    }
  });

  win.on('move', () => {
    if (!win.isMaximized()) {
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      saveWindowBounds({ x, y, width, height, isMaximized: false });
    }
  });

  win.on('close', () => {
    const bounds = win.getBounds();
    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: win.isMaximized(),
    });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const rendererPath = getRendererPath();
  if (isDev && VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(rendererPath);
  }

  return win;
}

registerSecurity(app);
registerIPC();

app.whenReady().then(() => {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  splashWindow = createSplashWindow();
  mainWindow = createMainWindow();
  createAppMenu(mainWindow);
  initAutoUpdater(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized(),
    });
  }
});
