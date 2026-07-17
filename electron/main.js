const { app, BrowserWindow } = require('electron');
const path = require('path');

let win;

const isDev = !app.isPackaged;
const rootDir = isDev ? path.join(__dirname, '..') : process.resourcesPath;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Enterprise HRMS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const frontendIndex = path.join(rootDir, 'frontend', 'dist', 'index.html');
  win.loadFile(frontendIndex);

  win.on('closed', () => {
    win = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
