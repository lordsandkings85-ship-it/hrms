// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
var __electron_vite_injected_dirname = "D:\\work\\HRMS\\desktop";
var projectRoot = resolve(__electron_vite_injected_dirname);
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(projectRoot, "electron/main.ts")
      },
      rollupOptions: {
        external: ["electron", "electron-store", "electron-updater", "electron-log", "path"]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(projectRoot, "electron/preload.ts")
      },
      rollupOptions: {
        external: ["electron"]
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
