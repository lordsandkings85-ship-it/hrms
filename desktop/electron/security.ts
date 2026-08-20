import { session } from 'electron';

const ALLOWED_NAVIGATE_PREFIXES = [
  'file://',
  'http://localhost',
  'http://127.0.0.1',
];

export function registerSecurity(app: Electron.App): void {
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
            "connect-src 'self' https://hrms-backend-rl2c.onrender.com wss:; " +
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
      if (url.startsWith('https://') || url.startsWith('http://')) {
        const { shell } = require('electron');
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    contents.on('will-navigate', (navEvent, url) => {
      const isAllowed = ALLOWED_NAVIGATE_PREFIXES.some(
        (prefix) => url.startsWith(prefix)
      );

      if (!isAllowed) {
        navEvent.preventDefault();
      }
    });

    contents.on('before-input-event', (inputEvent, input) => {
      if (input.control && input.key.toLowerCase() === 'i') {
        inputEvent.preventDefault();
      }
    });

    contents.setUserAgent(
      contents.getUserAgent().replace(/Electron\/[\d.]+\s/, '')
    );
  });
}
