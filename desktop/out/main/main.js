"use strict";
const electron = require("electron");
const path = require("path");
const ElectronStore = require("electron-store");
const electronUpdater = require("electron-updater");
const log = require("electron-log");
const ALLOWED_NAVIGATE_PREFIXES = [
  "file://",
  "http://localhost",
  "http://127.0.0.1"
];
function registerSecurity(app) {
  app.whenReady().then(() => {
    const ses = electron.session.defaultSession;
    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://hrms-backend-rl2c.onrender.com wss:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
          ]
        }
      });
    });
    ses.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    ses.setPermissionCheckHandler(() => false);
  });
  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("https://") || url.startsWith("http://")) {
        const { shell } = require("electron");
        shell.openExternal(url);
      }
      return { action: "deny" };
    });
    contents.on("will-navigate", (navEvent, url) => {
      const isAllowed = ALLOWED_NAVIGATE_PREFIXES.some(
        (prefix) => url.startsWith(prefix)
      );
      if (!isAllowed) {
        navEvent.preventDefault();
      }
    });
    contents.on("before-input-event", (inputEvent, input) => {
      if (input.control && input.key.toLowerCase() === "i") {
        inputEvent.preventDefault();
      }
    });
    contents.setUserAgent(
      contents.getUserAgent().replace(/Electron\/[\d.]+\s/, "")
    );
  });
}
let mainWindow$1 = null;
let updateCheckInterval = null;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1e3;
function initAutoUpdater(win) {
  mainWindow$1 = win;
  electronUpdater.autoUpdater.logger = log;
  electronUpdater.autoUpdater.autoDownload = false;
  electronUpdater.autoUpdater.autoInstallOnAppQuit = true;
  electronUpdater.autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
  });
  electronUpdater.autoUpdater.on("update-available", (info) => {
    log.info(`Update available: ${info.version}`);
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.webContents.send("updater:available", {
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    }
    electron.dialog.showMessageBox(mainWindow$1, {
      type: "info",
      title: "Update Available",
      message: `A new version (${info.version}) is available.`,
      detail: "Would you like to download and install it now?",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        electronUpdater.autoUpdater.downloadUpdate();
      }
    });
  });
  electronUpdater.autoUpdater.on("update-not-available", () => {
    log.info("No update available.");
  });
  electronUpdater.autoUpdater.on("download-progress", (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.webContents.send("updater:progress", {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      });
    }
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    log.info(`Update downloaded: ${info.version}`);
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.webContents.send("updater:downloaded", {
        version: info.version
      });
    }
    electron.dialog.showMessageBox(mainWindow$1, {
      type: "info",
      title: "Update Ready",
      message: `Version ${info.version} has been downloaded.`,
      detail: "The application will restart to apply the update.",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        setImmediate(() => electronUpdater.autoUpdater.quitAndInstall());
      }
    });
  });
  electronUpdater.autoUpdater.on("error", (error) => {
    log.error("Auto-updater error:", error);
  });
  electron.app.whenReady().then(() => {
    setTimeout(() => {
      electronUpdater.autoUpdater.checkForUpdates().catch((err) => {
        log.warn("Initial update check failed:", err.message);
      });
    }, 1e4);
    updateCheckInterval = setInterval(() => {
      electronUpdater.autoUpdater.checkForUpdates().catch((err) => {
        log.warn("Periodic update check failed:", err.message);
      });
    }, CHECK_INTERVAL_MS);
  });
  electron.app.on("before-quit", () => {
    if (updateCheckInterval) {
      clearInterval(updateCheckInterval);
      updateCheckInterval = null;
    }
  });
}
function checkForUpdatesNow() {
  electronUpdater.autoUpdater.checkForUpdates().catch((err) => {
    log.warn("Manual update check failed:", err.message);
  });
}
function installUpdate() {
  setImmediate(() => electronUpdater.autoUpdater.quitAndInstall());
}
const store = new ElectronStore({
  name: "workora-window",
  defaults: {
    window: {
      width: 1400,
      height: 900,
      isMaximized: false
    }
  }
});
function getWindowBounds() {
  return store.get("window");
}
function saveWindowBounds(bounds) {
  store.set("window", bounds);
}
function registerIPC() {
  electron.ipcMain.on("window:minimize", (event) => {
    electron.BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  electron.ipcMain.on("window:maximize", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });
  electron.ipcMain.on("window:close", (event) => {
    electron.BrowserWindow.fromWebContents(event.sender)?.close();
  });
  electron.ipcMain.handle("window:isMaximized", (event) => {
    return electron.BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
  electron.ipcMain.handle("app:version", () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("app:platform", () => {
    return process.platform;
  });
  electron.ipcMain.handle("dialog:save", async (event, options) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showSaveDialog(win, options);
    return result;
  });
  electron.ipcMain.handle("dialog:open", async (event, options) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showOpenDialog(win, options);
    return result;
  });
  electron.ipcMain.handle("dialog:message", async (event, options) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const result = await electron.dialog.showMessageBox(win, options);
    return result;
  });
  electron.ipcMain.on("app:print", (event, options) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.print(options ?? { silent: false });
    }
  });
  electron.ipcMain.on("clipboard:write", (_event, text) => {
    electron.clipboard.writeText(text);
  });
  electron.ipcMain.handle("clipboard:read", () => {
    return electron.clipboard.readText();
  });
  electron.ipcMain.handle("shell:openExternal", async (_event, url) => {
    await electron.shell.openExternal(url);
  });
  electron.ipcMain.handle("theme:get", () => {
    return electron.nativeTheme.shouldUseDarkColors ? "dark" : "light";
  });
  electron.ipcMain.on("updater:check", () => {
    checkForUpdatesNow();
  });
  electron.ipcMain.on("updater:install", () => {
    installUpdate();
  });
}
function createAppMenu(mainWindow2) {
  const isMac = process.platform === "darwin";
  const template = [
    ...isMac ? [{ role: "appMenu" }] : [],
    {
      label: "File",
      submenu: [
        {
          label: "Print…",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            mainWindow2.webContents.print({ silent: false });
          }
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Refresh",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            mainWindow2.webContents.reload();
          }
        },
        {
          label: "Force Refresh",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            mainWindow2.webContents.reloadIgnoringCache();
          }
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { type: "separator" },
        {
          label: "Developer Tools",
          accelerator: "F12",
          click: () => {
            mainWindow2.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "maximize" },
        ...isMac ? [
          { type: "separator" },
          { role: "front" }
        ] : []
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Workora HRMS",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow2, {
              type: "info",
              title: "About Workora HRMS",
              message: "Workora HRMS",
              detail: `Version: ${electron.app.getVersion()}
Electron: ${process.versions.electron}
Chromium: ${process.versions.chrome}
Node.js: ${process.versions.node}

Enterprise Human Resource Management System
© ${(/* @__PURE__ */ new Date()).getFullYear()} Lords & Kings Enterprise`
            });
          }
        },
        { type: "separator" },
        {
          label: "Workora Website",
          click: () => {
            electron.shell.openExternal("https://workora.com");
          }
        },
        {
          label: "Report Issue",
          click: () => {
            electron.shell.openExternal("https://github.com/Workora/hrms/issues");
          }
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(template);
  electron.Menu.setApplicationMenu(menu);
}
let mainWindow = null;
let splashWindow = null;
const isDev = !electron.app.isPackaged;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function getResourcePath(...segments) {
  if (electron.app.isPackaged) {
    return path.join(process.resourcesPath, "resources", ...segments);
  }
  return path.join(__dirname, "..", "..", "resources", ...segments);
}
function getRendererPath() {
  if (isDev && VITE_DEV_SERVER_URL) {
    return VITE_DEV_SERVER_URL;
  }
  if (electron.app.isPackaged) {
    return path.join(electron.app.getAppPath(), "dist", "renderer", "index.html");
  }
  return path.join(__dirname, "..", "..", "dist", "renderer", "index.html");
}
function createSplashWindow() {
  const win = new electron.BrowserWindow({
    width: 400,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const splashPath = getResourcePath("loading.html");
  win.loadFile(splashPath);
  return win;
}
function createMainWindow() {
  const bounds = getWindowBounds();
  const win = new electron.BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    show: false,
    title: "Workora HRMS",
    icon: getResourcePath("icon-256.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false
    }
  });
  win.on("ready-to-show", () => {
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
  win.on("maximize", () => {
    win.webContents.send("window:maximize-change", true);
  });
  win.on("unmaximize", () => {
    win.webContents.send("window:maximize-change", false);
  });
  win.on("resize", () => {
    if (!win.isMaximized()) {
      const [width, height] = win.getSize();
      saveWindowBounds({ width, height, isMaximized: false });
    }
  });
  win.on("move", () => {
    if (!win.isMaximized()) {
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      saveWindowBounds({ x, y, width, height, isMaximized: false });
    }
  });
  win.on("close", () => {
    const bounds2 = win.getBounds();
    saveWindowBounds({
      x: bounds2.x,
      y: bounds2.y,
      width: bounds2.width,
      height: bounds2.height,
      isMaximized: win.isMaximized()
    });
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  const rendererPath = getRendererPath();
  if (isDev && VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(rendererPath);
  }
  return win;
}
registerSecurity(electron.app);
registerIPC();
electron.app.whenReady().then(() => {
  const gotLock = electron.app.requestSingleInstanceLock();
  if (!gotLock) {
    electron.app.quit();
    return;
  }
  electron.app.on("second-instance", () => {
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
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});
electron.app.on("before-quit", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized()
    });
  }
});
