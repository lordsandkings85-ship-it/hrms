"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const ElectronStore = require("electron-store");
const electronUpdater = require("electron-updater");
const log = require("electron-log");
const child_process = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
function registerSecurity(app) {
  const allowExternal = (url2) => typeof url2 === "string" && /^https?:\/\//i.test(url2);
  const trustedRendererOrigin = (url2) => {
    if (!url2) return false;
    if (url2.startsWith("file://")) return true;
    return !app.isPackaged && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url2);
  };
  const allowedNavigate = (url$1) => {
    if (!app.isPackaged) return trustedRendererOrigin(url$1);
    const renderer = url.pathToFileURL(
      path.join(app.getAppPath(), "dist", "renderer", "index.html")
    ).toString();
    return url$1 === renderer || url$1.startsWith(renderer + "#");
  };
  const ALLOWED_PERMISSIONS = /* @__PURE__ */ new Set(["geolocation", "notifications"]);
  app.whenReady().then(() => {
    const ses = electron.session.defaultSession;
    const connectSrc = app.isPackaged ? "https://hrms-backend-rl2c.onrender.com wss://hrms-backend-rl2c.onrender.com" : "http://localhost:5000 http://127.0.0.1:5000 ws://localhost:5000 http://localhost:5173 ws://localhost:5173";
    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: ${connectSrc}; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';`
          ]
        }
      });
    });
    ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const url2 = details?.requestingUrl || webContents.getURL();
      callback(ALLOWED_PERMISSIONS.has(permission) && trustedRendererOrigin(url2));
    });
    ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
      return ALLOWED_PERMISSIONS.has(permission) && trustedRendererOrigin(requestingOrigin);
    });
  });
  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url: url2 }) => {
      if (allowExternal(url2)) {
        electron.shell.openExternal(url2);
        return { action: "deny" };
      }
      if (url2.startsWith("blob:")) {
        return { action: "allow" };
      }
      return { action: "deny" };
    });
    contents.on("will-navigate", (navEvent, url2) => {
      if (!allowedNavigate(url2)) {
        navEvent.preventDefault();
      }
    });
    contents.on("will-redirect", (navEvent, url2) => {
      if (!allowedNavigate(url2)) {
        navEvent.preventDefault();
      }
    });
    contents.on("will-attach-webview", (event) => {
      event.preventDefault();
    });
    contents.on("before-input-event", (inputEvent, input) => {
      const devKeys = ["i", "j", "c", "s"];
      const isDevCombo = (input.control || input.meta) && input.shift && devKeys.includes(input.key.toLowerCase());
      if (input.key === "F12" || isDevCombo) {
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
const OFFLINE_MESSAGE = "Unable to check for updates. Check your internet connection and try again.";
function sendToRenderer(channel, payload) {
  if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
    mainWindow$1.webContents.send(channel, payload ?? {});
  }
}
function initAutoUpdater(win) {
  mainWindow$1 = win;
  electronUpdater.autoUpdater.logger = log;
  electronUpdater.autoUpdater.autoDownload = false;
  electronUpdater.autoUpdater.autoInstallOnAppQuit = false;
  electronUpdater.autoUpdater.allowDowngrade = false;
  electronUpdater.autoUpdater.allowPrerelease = false;
  electronUpdater.autoUpdater.disableWebInstaller = true;
  electronUpdater.autoUpdater.autoRunAppAfterInstall = true;
  electronUpdater.autoUpdater.forceDevUpdateConfig = false;
  electronUpdater.autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
    sendToRenderer("updater:checking");
  });
  electronUpdater.autoUpdater.on("update-available", (info) => {
    log.info(`Update available: ${info.version}`);
    sendToRenderer("updater:available", {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  });
  electronUpdater.autoUpdater.on("update-not-available", () => {
    log.info("No update available.");
    sendToRenderer("updater:not-available");
  });
  electronUpdater.autoUpdater.on("download-progress", (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    sendToRenderer("updater:progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    log.info(`Update downloaded: ${info.version}`);
    sendToRenderer("updater:downloaded", {
      version: info.version
    });
  });
  electronUpdater.autoUpdater.on("error", (error) => {
    log.error("Auto-updater error:", error);
    const message = typeof error === "string" ? error : error?.message ?? "An unknown update error occurred.";
    const offline = /network|connection|timed ?out|ECONN|offline|failed to fetch/i.test(message);
    sendToRenderer("updater:error", {
      message: offline ? OFFLINE_MESSAGE : `Update failed: ${message}`,
      offline
    });
  });
  if (!electron.app.isPackaged) return;
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
function downloadUpdateNow() {
  electronUpdater.autoUpdater.downloadUpdate().catch((err) => {
    log.warn("Update download failed:", err.message);
  });
}
function installUpdate() {
  setImmediate(() => electronUpdater.autoUpdater.quitAndInstall());
}
const store$1 = new ElectronStore({
  name: "workora-device",
  defaults: { deviceId: "" }
});
function getDeviceId() {
  let id = store$1.get("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    store$1.set("deviceId", id);
  }
  return id;
}
let activeContext = null;
function setActiveDeviceContext(context) {
  activeContext = context;
}
function getActiveDeviceContext() {
  return activeContext;
}
function setLastKnownEmail(email) {
  const clean = email.trim().toLowerCase().slice(0, 254);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    store$1.set("lastEmail", clean);
  }
}
function getLastKnownEmail() {
  return store$1.get("lastEmail") || void 0;
}
function run(command, args, timeout = 5e3) {
  try {
    const out = child_process.execFileSync(command, args, {
      windowsHide: true,
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return typeof out === "string" ? out : String(out);
  } catch {
    return "";
  }
}
function registryValues(key, names) {
  const result = {};
  for (const name of names) {
    const out = run("reg", ["query", key, "/v", name]);
    const line = out.split(/\r?\n/).map((l) => l.trim()).find((l) => l.toLowerCase().startsWith(name.toLowerCase() + " "));
    if (!line) continue;
    const match = line.match(/REG_(?:SZ|EXPAND_SZ|MULTI_SZ)\s+(.+)$/i);
    if (match?.[1]) result[name] = match[1].trim();
  }
  return result;
}
const VM_PATTERNS = [
  [/vmware/i, "VMware"],
  [/virtualbox|innotek/i, "VirtualBox"],
  [/hyper-?v|microsoft corporation virtual machine/i, "Hyper-V"],
  [/parallels/i, "Parallels"],
  [/qemu|kvm/i, "QEMU/KVM"],
  [/\bxen\b/i, "Xen"],
  [/bochs/i, "Bochs"],
  [/virtual machine/i, "Generic virtual machine"]
];
const VM_PROCESSES = [
  [/^vmtoolsd\.exe$/i, "VMware Tools"],
  [/^vmwaretray\.exe$/i, "VMware Tools"],
  [/^vboxservice\.exe$/i, "VirtualBox Guest Additions"],
  [/^vboxtray\.exe$/i, "VirtualBox Guest Additions"],
  [/^prl_tools\.exe$/i, "Parallels Tools"],
  [/^qemu-ga\.exe$/i, "QEMU Guest Agent"],
  [/^xenservice\.exe$/i, "Xen Guest Tools"]
];
const EMULATOR_PROCESSES = [
  [/^hd-player\.exe$/i, "BlueStacks"],
  [/^bluestacks\.exe$/i, "BlueStacks"],
  [/^nox\.exe$/i, "NoxPlayer"],
  [/^memu\.exe$/i, "MEmu"],
  [/^dnplayer\.exe$/i, "LDPlayer"],
  [/^ldvboxheadless\.exe$/i, "LDPlayer"],
  [/^ld9boxheadless\.exe$/i, "LDPlayer"],
  [/^genymotion\.exe$/i, "Genymotion"],
  [/^qemu-system-/i, "QEMU system emulator"],
  [/^sdk_gphone/i, "Android SDK emulator"]
];
const VM_DRIVERS = ["vmmouse.sys", "vmhgfs.sys", "vmci.sys", "VBoxGuest.sys", "VBoxMouse.sys", "prl_fs.sys"];
const EMULATOR_FOLDERS = [
  ["BlueStacks", "BlueStacks"],
  ["Nox", "NoxPlayer"],
  ["Microvirt", "MEmu"],
  ["LDPlayer", "LDPlayer"],
  ["Genymotion", "Genymotion"]
];
function detectVmHost(haystack) {
  for (const [re, label] of VM_PATTERNS) {
    if (re.test(haystack)) return label;
  }
  return void 0;
}
function listProcesses() {
  return run("tasklist", ["/FO", "CSV", "/NH"], 6e3).toLowerCase();
}
function knownFolders() {
  const roots = [
    process.env["ProgramFiles"],
    process.env["ProgramFiles(x86)"],
    process.env["LOCALAPPDATA"]
  ].filter((v) => typeof v === "string" && v.length > 0);
  const found = [];
  for (const root of roots) {
    for (const [folder, label] of EMULATOR_FOLDERS) {
      try {
        if (fs.existsSync(path.join(root, folder))) found.push(label);
      } catch {
      }
    }
  }
  return Array.from(new Set(found));
}
async function readGpu() {
  try {
    const info = await electron.app.getGPUInfo("complete");
    const device = Array.isArray(info?.gpuDevice) ? info.gpuDevice[0] : void 0;
    if (!device) return {};
    const vendorId = Number(device.vendorId ?? 0);
    const deviceId = Number(device.deviceId ?? 0);
    const name = device.deviceString || device.vendorName || device.driverVendor || `GPU ${vendorId.toString(16)}:${deviceId.toString(16)}`;
    const vmByVendor = {
      5549: "VMware",
      33006: "VirtualBox",
      6840: "Parallels",
      4660: "QEMU/KVM",
      22611: "Xen"
    };
    const vmHost = vmByVendor[vendorId];
    return {
      label: String(name).slice(0, 200),
      vmHost,
      signal: vmHost ? `vm:gpu:${vmHost} (${String(name).slice(0, 120)})` : `gpu:${String(name).slice(0, 120)}`
    };
  } catch {
    return {};
  }
}
async function collectDeviceContext() {
  const signals = /* @__PURE__ */ new Set();
  const bios = registryValues("HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS", [
    "SystemManufacturer",
    "SystemProductName",
    "SystemFamily",
    "BIOSVendor",
    "BIOSVersion"
  ]);
  for (const [name, value] of Object.entries(bios)) {
    if (!value) continue;
    const label = detectVmHost(value);
    if (label) signals.add(`vm:bios:${name}=${value}`);
  }
  const guestParams = registryValues("HKLM\\SOFTWARE\\Microsoft\\Virtual Machine\\Guest\\Parameters", [
    "PhysicalHostName",
    "HostName"
  ]);
  for (const [name, value] of Object.entries(guestParams)) {
    if (value) signals.add(`vm:guest:${name}=${value}`);
  }
  const diskEnum = registryValues("HKLM\\SYSTEM\\CurrentControlSet\\Services\\disk\\Enum", ["0"]);
  if (diskEnum["0"]) signals.add(`disk:enum=${diskEnum["0"].slice(0, 160)}`);
  const processes = listProcesses();
  for (const [re, label] of VM_PROCESSES) {
    if (re.test(processes)) signals.add(`vm:process:${label}`);
  }
  for (const [re, label] of EMULATOR_PROCESSES) {
    if (re.test(processes)) signals.add(`emulator:process:${label}`);
  }
  for (const driver of VM_DRIVERS) {
    try {
      if (fs.existsSync(path.join(process.env["SystemRoot"] || "C:\\Windows", "System32", "drivers", driver))) {
        signals.add(`vm:driver:${driver}`);
      }
    } catch {
    }
  }
  for (const label of knownFolders()) {
    signals.add(`install:${label}`);
  }
  const gpu = await readGpu();
  if (gpu.signal) signals.add(gpu.signal);
  const manufacturer = bios["SystemManufacturer"] || "";
  const product = bios["SystemProductName"] || "";
  const deviceLabel = [manufacturer, product].filter(Boolean).join(" ").trim().slice(0, 200);
  const haystack = [
    deviceLabel,
    ...Object.values(bios),
    ...Object.values(guestParams),
    diskEnum["0"] || "",
    gpu.vmHost || ""
  ].join(" ");
  const vmHost = detectVmHost(haystack) || gpu.vmHost;
  const release = os.release();
  const osName = (() => {
    const build = Number((release.match(/^10\.0\.(\d+)/) || [])[1] || 0);
    const version = typeof os.version === "function" ? os.version() : "";
    if (/windows 11/i.test(version) || build >= 22e3) return "Windows 11";
    if (build >= 10240) return "Windows 10";
    return version || "Windows";
  })();
  return {
    deviceId: getDeviceId(),
    clientType: "desktop",
    platform: process.platform,
    osName,
    osVersion: release,
    arch: process.arch,
    signals: Array.from(signals).slice(0, 24),
    webgl: gpu.label ? `desktop-gpu: ${gpu.label}` : void 0,
    isVirtualMachine: !!vmHost,
    vmHost,
    touchPoints: 0,
    hardwareConcurrency: os.cpus()?.length,
    deviceLabel: deviceLabel || void 0
  };
}
function isTrustedSender(event) {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return false;
  const url2 = event.senderFrame?.url || event.sender.getURL();
  if (!url2) return false;
  if (url2.startsWith("file://")) return true;
  if (!electron.app.isPackaged && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url2)) {
    return true;
  }
  return false;
}
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isBoundedString(value, max) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
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
    if (!isTrustedSender(event)) return;
    electron.BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  electron.ipcMain.on("window:maximize", (event) => {
    if (!isTrustedSender(event)) return;
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
    if (!isTrustedSender(event)) return;
    electron.BrowserWindow.fromWebContents(event.sender)?.close();
  });
  electron.ipcMain.handle("window:isMaximized", (event) => {
    if (!isTrustedSender(event)) return false;
    return electron.BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
  electron.ipcMain.handle("app:version", (event) => {
    if (!isTrustedSender(event)) return "";
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("app:platform", (event) => {
    if (!isTrustedSender(event)) return "";
    return process.platform;
  });
  electron.ipcMain.on("app:device-context", (event) => {
    event.returnValue = isTrustedSender(event) ? getActiveDeviceContext() : null;
  });
  electron.ipcMain.handle("app:set-identity", (event, email) => {
    if (!isTrustedSender(event)) return false;
    if (!isBoundedString(email, 254)) return false;
    setLastKnownEmail(email);
    return true;
  });
  electron.ipcMain.on("app:quit", (event) => {
    if (!isTrustedSender(event)) return;
    electron.app.quit();
  });
  electron.ipcMain.handle("dialog:save", async (event, options) => {
    if (!isTrustedSender(event)) return { canceled: true };
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (!win || !isRecord(options)) return { canceled: true };
    return electron.dialog.showSaveDialog(win, options);
  });
  electron.ipcMain.handle("dialog:open", async (event, options) => {
    if (!isTrustedSender(event)) return { canceled: true, filePaths: [] };
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (!win || !isRecord(options)) return { canceled: true, filePaths: [] };
    return electron.dialog.showOpenDialog(win, options);
  });
  electron.ipcMain.handle("dialog:message", async (event, options) => {
    if (!isTrustedSender(event)) return { response: 0, checkboxChecked: false };
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (!win || !isRecord(options)) return { response: 0, checkboxChecked: false };
    return electron.dialog.showMessageBox(win, options);
  });
  electron.ipcMain.on("app:print", (event, options) => {
    if (!isTrustedSender(event)) return;
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.print(isRecord(options) ? options : { silent: false });
    }
  });
  electron.ipcMain.on("clipboard:write", (event, text) => {
    if (!isTrustedSender(event)) return;
    if (typeof text !== "string" || text.length > 5e6) return;
    electron.clipboard.writeText(text);
  });
  electron.ipcMain.handle("clipboard:read", (event) => {
    if (!isTrustedSender(event)) return "";
    return electron.clipboard.readText();
  });
  electron.ipcMain.handle("shell:openExternal", async (event, url2) => {
    if (!isTrustedSender(event)) return;
    if (typeof url2 === "string" && /^https?:\/\/[^\s]+$/i.test(url2) && url2.length <= 2048) {
      await electron.shell.openExternal(url2);
    }
  });
  electron.ipcMain.handle("theme:get", (event) => {
    if (!isTrustedSender(event)) return "light";
    return electron.nativeTheme.shouldUseDarkColors ? "dark" : "light";
  });
  electron.ipcMain.on("updater:check", (event) => {
    if (!isTrustedSender(event)) return;
    checkForUpdatesNow();
  });
  electron.ipcMain.on("updater:download", (event) => {
    if (!isTrustedSender(event)) return;
    downloadUpdateNow();
  });
  electron.ipcMain.on("updater:install", (event) => {
    if (!isTrustedSender(event)) return;
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
        ...electron.app.isPackaged ? [] : [
          { type: "separator" },
          {
            label: "Developer Tools",
            accelerator: "F12",
            click: () => {
              mainWindow2.webContents.toggleDevTools();
            }
          }
        ]
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
const UNSUPPORTED_TITLE = "Unsupported Operating System";
const UNSUPPORTED_MESSAGE = "Workora HRMS Desktop is available only for supported Windows 10 and Windows 11 computers. Please install and run the Windows EXE on a compatible Windows computer.";
const MIN_WINDOWS_BUILD = 10240;
function windowsBuild(osVersion) {
  if (!osVersion) return null;
  const match = osVersion.match(/\b(\d+)\.(\d+)\.(\d{3,6})\b/);
  if (!match) return null;
  const major = Number(match[1]);
  const build = Number(match[3]);
  if (!Number.isFinite(build)) return null;
  return major < 10 ? 0 : build;
}
function evaluatePlatform(context) {
  if (context.platform !== "win32") {
    return {
      supported: false,
      eventType: "UNSUPPORTED_PLATFORM",
      reason: `Desktop client reported operating system "${context.platform}"`
    };
  }
  if (context.arch !== "x64") {
    return {
      supported: false,
      eventType: "UNSUPPORTED_ARCH",
      reason: `Desktop client reported architecture "${context.arch}"`
    };
  }
  const build = windowsBuild(context.osVersion);
  if (build !== null && build < MIN_WINDOWS_BUILD) {
    return {
      supported: false,
      eventType: "UNSUPPORTED_OS_VERSION",
      reason: `${context.osName || "Windows"} build ${build} is older than the supported Windows 10/11 releases`
    };
  }
  return { supported: true };
}
function apiBaseUrl() {
  const override = process.env["WORKORA_API_URL"];
  if (override) return override.replace(/\/+$/, "");
  return electron.app.isPackaged ? "https://hrms-backend-rl2c.onrender.com/api/v1" : "http://localhost:5000/api/v1";
}
async function reportStartupBlock(context, check) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6e3);
  try {
    const response = await electron.net.fetch(`${apiBaseUrl()}/security/device-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        ...context,
        email: getLastKnownEmail(),
        reason: check.reason || "Unsupported Windows desktop environment"
      })
    });
    if (!response.ok) {
      log.warn("Security startup report rejected:", response.status);
      return { recorded: false };
    }
    const data = await response.json().catch(() => ({}));
    return { ...data, recorded: true };
  } catch (error) {
    log.warn("Security startup report failed:", error?.message ?? error);
    return { recorded: false };
  } finally {
    clearTimeout(timer);
  }
}
function showUnsupportedDialog() {
  try {
    electron.dialog.showMessageBoxSync({
      type: "error",
      title: UNSUPPORTED_TITLE,
      message: UNSUPPORTED_TITLE,
      detail: UNSUPPORTED_MESSAGE,
      buttons: ["Close"],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });
  } catch (error) {
    log.error("Failed to show the unsupported-device dialog:", error?.message ?? error);
  }
}
async function runStartupGate(context) {
  const check = evaluatePlatform(context);
  if (check.supported) return { blocked: false, reasons: [] };
  const report = await reportStartupBlock(context, check);
  const reasons = report.reasons?.length ? report.reasons : [check.reason || "Unsupported Windows desktop environment"];
  log.warn(`Startup blocked (${check.eventType}): ${reasons.join("; ")}`);
  return { blocked: true, eventId: report.eventId, reasons };
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
      contextIsolation: true,
      sandbox: true
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
  win.webContents.setWindowOpenHandler(({ url: url2 }) => {
    if (url2.startsWith("https://") || url2.startsWith("http://")) {
      electron.shell.openExternal(url2);
    } else if (url2.startsWith("blob:")) {
      return { action: "allow" };
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
electron.app.whenReady().then(async () => {
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
  try {
    const context = await collectDeviceContext();
    setActiveDeviceContext(context);
    const gate = await runStartupGate(context);
    if (gate.blocked) {
      showUnsupportedDialog();
      electron.app.quit();
      return;
    }
  } catch (error) {
    log.error("Platform validation failed:", error?.message ?? error);
    showUnsupportedDialog();
    electron.app.quit();
    return;
  }
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
