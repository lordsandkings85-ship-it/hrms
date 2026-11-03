import { app, BrowserWindow } from 'electron';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

/**
 * Only the app's own renderer may use the privileged IPC bridge. Packaged
 * builds must be running from the bundled `file://` document; development may
 * additionally use the local Vite dev server.
 */
export function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return false;

  const url = event.senderFrame?.url || event.sender.getURL();
  if (!url) return false;
  if (url.startsWith('file://')) return true;
  if (!app.isPackaged && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)) {
    return true;
  }
  return false;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}
