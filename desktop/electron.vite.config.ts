import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const projectRoot = resolve(__dirname);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(projectRoot, 'electron/main.ts'),
      },
      rollupOptions: {
        external: ['electron', 'electron-store', 'electron-updater', 'electron-log', 'path'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(projectRoot, 'electron/preload.ts'),
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
});
