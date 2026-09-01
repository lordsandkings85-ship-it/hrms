import { session, shell } from 'electron';

export function registerSecurity(app: Electron.App): void {
  const allowExternal = (url: string): boolean =>
    typeof url === 'string' && /^https?:\/\//i.test(url);

  const allowedNavigate = (url: string): boolean => {
    if (url.startsWith('file://')) return true;
    // Permit the localhost dev server only in development (never packaged).
    if (!app.isPackaged && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url)) {
      return true;
    }
    return false;
  };

  app.whenReady().then(() => {
    const ses = session.defaultSession;

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
            "connect-src 'self' https://hrms-backend-rl2c.onrender.com wss://hrms-backend-rl2c.onrender.com; " +
            "frame-src 'none'; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self';",
          ],
        },
      });
    });

    ses.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });

    ses.setPermissionCheckHandler(() => false);
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (allowExternal(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    contents.on('will-navigate', (navEvent, url) => {
      if (!allowedNavigate(url)) {
        navEvent.preventDefault();
      }
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
