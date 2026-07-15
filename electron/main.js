const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let backendProcess;
let win;

// When running as a packaged app, files are in process.resourcesPath
// When running in dev (electron .), __dirname is the project root
const isDev = !app.isPackaged;
const rootDir = isDev ? path.join(__dirname, '..') : process.resourcesPath;

function startBackend() {
  const backendEntry = path.join(rootDir, 'backend', 'dist', 'main.js');

  backendProcess = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'mysql://u593848004_hrms:Lords@2018@srv1259.hstgr.io:3306/u593848004_hrms',
      JWT_ACCESS_SECRET: 'change_me_access_secret',
      JWT_REFRESH_SECRET: 'change_me_refresh_secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    },
    stdio: 'inherit',
  });

  backendProcess.on('error', (err) => {
    console.error('Backend failed to start:', err.message);
  });
}

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
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    startBackend();
    // Wait 2 seconds for NestJS to fully start before opening the window
    setTimeout(createWindow, 2000);
  });
}

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) createWindow();
});
