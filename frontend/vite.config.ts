import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Required for Electron file:// protocol — use './' in production, '/' in dev
  base: process.env.ELECTRON === 'true' ? './' : '/',
});
