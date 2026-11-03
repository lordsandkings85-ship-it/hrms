import { session, shell } from 'electron';
import { join } from 'path';
import { pathToFileURL } from 'url';

export function registerSecurity(app: Electron.App): void {
  const allowExternal = (url: string): boolean =>
    typeof url === 'string' && /^https?:\/\//i.test(url);

  const trustedRendererOrigin = (url?: string | null): boolean => {
    if (!url) return false;
    if (url.startsWith('file://')) return true;
    // Permit the localhost dev server only in development (never packaged).
    return (
      !app.isPackaged &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)
    );
  };

  const allowedNavigate = (url: string): boolean => {
    if (!app.isPackaged) return trustedRendererOrigin(url);
    // Packaged builds may only stay inside the bundled renderer document.
    const renderer = pathToFileURL(
      join(app.getAppPath(), 'dist', 'renderer', 'index.html'),
    ).toString();
    return url === renderer || url.startsWith(renderer + '#');
  };

  const ALLOWED_PERMISSIONS = new Set(['geolocation', 'notifications']);

  app.whenReady().then(() => {
    const ses = session.defaultSession;

    const connectSrc = app.isPackaged
      ? 'https://hrms-backend-rl2c.onrender.com wss://hrms-backend-rl2c.onrender.com'
      : 'http://localhost:5000 http://127.0.0.1:5000 ws://localhost:5000 http://localhost:5173 ws://localhost:5173';

    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob: https:; " +
            "font-src 'self' data:; " +
            `connect-src 'self' blob: ${connectSrc}; ` +
            "worker-src 'self' blob:; " +
            "frame-src 'self' blob:; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self';",
          ],
        },
      });
    });

    // GPS attendance is a core feature: allow location/notifications only for
    // the trusted app document, and keep every other permission denied.
    ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const url = details?.requestingUrl || webContents.getURL();
      callback(ALLOWED_PERMISSIONS.has(permission) && trustedRendererOrigin(url));
    });

    ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
      return ALLOWED_PERMISSIONS.has(permission) && trustedRendererOrigin(requestingOrigin);
    });
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (allowExternal(url)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      if (url.startsWith('blob:')) {
        return { action: 'allow' };
      }
      return { action: 'deny' };
    });

    contents.on('will-navigate', (navEvent, url) => {
      if (!allowedNavigate(url)) {
        navEvent.preventDefault();
      }
    });

    contents.on('will-redirect', (navEvent, url) => {
      if (!allowedNavigate(url)) {
        navEvent.preventDefault();
      }
    });

    // The app never embeds <webview>; reject any attempt to attach one.
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });

    contents.on('before-input-event', (inputEvent, input) => {
      const devKeys = ['i', 'j', 'c', 's'];
      const isDevCombo =
        (input.control || input.meta) && input.shift && devKeys.includes(input.key.toLowerCase());
      if (input.key === 'F12' || isDevCombo) {
        inputEvent.preventDefault();
      }
    });

    contents.setUserAgent(
      contents.getUserAgent().replace(/Electron\/[\d.]+\s/, '')
    );
  });
}
