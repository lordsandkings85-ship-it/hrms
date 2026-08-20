"use strict";
const electron = require("electron");
function exposeAPI() {
  const api = {
    minimize: () => electron.ipcRenderer.send("window:minimize"),
    maximize: () => electron.ipcRenderer.send("window:maximize"),
    close: () => electron.ipcRenderer.send("window:close"),
    isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
    onMaximizeChange: (callback) => {
      const handler = (_event, maximized) => callback(maximized);
      electron.ipcRenderer.on("window:maximize-change", handler);
      return () => electron.ipcRenderer.removeListener("window:maximize-change", handler);
    },
    getVersion: () => electron.ipcRenderer.invoke("app:version"),
    getPlatform: () => electron.ipcRenderer.invoke("app:platform"),
    showSaveDialog: (options) => electron.ipcRenderer.invoke("dialog:save", options),
    showOpenDialog: (options) => electron.ipcRenderer.invoke("dialog:open", options),
    showMessageBox: (options) => electron.ipcRenderer.invoke("dialog:message", options),
    print: (options) => electron.ipcRenderer.send("app:print", options),
    writeText: (text) => electron.ipcRenderer.send("clipboard:write", text),
    readText: () => electron.ipcRenderer.invoke("clipboard:read"),
    openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
    isOnline: () => navigator.onLine,
    onOnline: (callback) => {
      const handler = () => callback();
      window.addEventListener("online", handler);
      return () => window.removeEventListener("online", handler);
    },
    onOffline: (callback) => {
      const handler = () => callback();
      window.addEventListener("offline", handler);
      return () => window.removeEventListener("offline", handler);
    },
    checkForUpdates: () => electron.ipcRenderer.send("updater:check"),
    onUpdateAvailable: (callback) => {
      const handler = (_event, info) => callback(info);
      electron.ipcRenderer.on("updater:available", handler);
      return () => electron.ipcRenderer.removeListener("updater:available", handler);
    },
    onDownloadProgress: (callback) => {
      const handler = (_event, info) => callback(info);
      electron.ipcRenderer.on("updater:progress", handler);
      return () => electron.ipcRenderer.removeListener("updater:progress", handler);
    },
    onUpdateDownloaded: (callback) => {
      const handler = (_event, info) => callback(info);
      electron.ipcRenderer.on("updater:downloaded", handler);
      return () => electron.ipcRenderer.removeListener("updater:downloaded", handler);
    },
    quitAndInstall: () => electron.ipcRenderer.send("updater:install"),
    getTheme: () => electron.ipcRenderer.invoke("theme:get"),
    onThemeChange: (callback) => {
      const handler = (_event, theme) => callback(theme);
      electron.ipcRenderer.on("theme:change", handler);
      return () => electron.ipcRenderer.removeListener("theme:change", handler);
    }
  };
  electron.contextBridge.exposeInMainWorld("electronAPI", api);
}
exposeAPI();
