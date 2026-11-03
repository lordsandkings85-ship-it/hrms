import { app, dialog, net } from 'electron';
import log from 'electron-log';
import { DesktopDeviceContext, getLastKnownEmail } from './environment-risk';

/** Exact copy required by the product/security specification. */
export const UNSUPPORTED_TITLE = 'Unsupported Operating System';
export const UNSUPPORTED_MESSAGE =
  'Workora HRMS Desktop is available only for supported Windows 10/11 (x64) and macOS computers. Please run the desktop application on a compatible computer.';

const MIN_WINDOWS_BUILD = 10240;

export type PlatformEventType =
  | 'UNSUPPORTED_PLATFORM'
  | 'UNSUPPORTED_ARCH'
  | 'UNSUPPORTED_OS_VERSION';

export interface PlatformCheck {
  supported: boolean;
  eventType?: PlatformEventType;
  reason?: string;
}

function windowsBuild(osVersion?: string): number | null {
  if (!osVersion) return null;
  const match = osVersion.match(/\b(\d+)\.(\d+)\.(\d{3,6})\b/);
  if (!match) return null;
  const major = Number(match[1]);
  const build = Number(match[3]);
  if (!Number.isFinite(build)) return null;
  // Windows NT 6.x (7/8/8.1) is always below the Windows 10 baseline.
  return major < 10 ? 0 : build;
}

/**
 * Local pre-flight check. The backend repeats the same checks on every login
 * and refresh; this one exists only to avoid loading the HRMS UI at all on a
 * machine that can never be supported.
 */
export function evaluatePlatform(context: DesktopDeviceContext): PlatformCheck {
  if (context.platform === 'win32') {
    if (context.arch !== 'x64') {
      return {
        supported: false,
        eventType: 'UNSUPPORTED_ARCH',
        reason: `Windows desktop client reported architecture "${context.arch}" (x64 required)`,
      };
    }
    const build = windowsBuild(context.osVersion);
    if (build !== null && build < MIN_WINDOWS_BUILD) {
      return {
        supported: false,
        eventType: 'UNSUPPORTED_OS_VERSION',
        reason: `${context.osName || 'Windows'} build ${build} is older than the supported Windows 10/11 releases`,
      };
    }
    return { supported: true };
  }

  if (context.platform === 'darwin') {
    if (context.arch !== 'arm64' && context.arch !== 'x64') {
      return {
        supported: false,
        eventType: 'UNSUPPORTED_ARCH',
        reason: `macOS desktop client reported unsupported architecture "${context.arch}"`,
      };
    }
    return { supported: true };
  }

  return {
    supported: false,
    eventType: 'UNSUPPORTED_PLATFORM',
    reason: `Desktop client reported unsupported operating system "${context.platform}"`,
  };
}

function apiBaseUrl(): string {
  const override = process.env['WORKORA_API_URL'];
  if (override) return override.replace(/\/+$/, '');
  return app.isPackaged
    ? 'https://hrms-backend-rl2c.onrender.com/api/v1'
    : 'http://localhost:5000/api/v1';
}

export interface StartupReportResult {
  recorded: boolean;
  eventId?: string;
  level?: 'allow' | 'monitor' | 'block';
  eventType?: string;
  reasons?: string[];
}

/**
 * Reports the blocked startup to the public security endpoint so the attempt
 * is auditable and authorized admins/super admins are notified. Best effort:
 * an offline machine must still be blocked and shown the dialog.
 */
export async function reportStartupBlock(
  context: DesktopDeviceContext,
  check: PlatformCheck,
): Promise<StartupReportResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await net.fetch(`${apiBaseUrl()}/security/device-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...context,
        email: getLastKnownEmail(),
        reason: check.reason || 'Unsupported Windows desktop environment',
      }),
    });
    if (!response.ok) {
      log.warn('Security startup report rejected:', response.status);
      return { recorded: false };
    }
    const data = (await response.json().catch(() => ({}))) as StartupReportResult;
    return { ...data, recorded: true };
  } catch (error: any) {
    log.warn('Security startup report failed:', error?.message ?? error);
    return { recorded: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Modal, blocking dialog. The HRMS renderer is never created when this runs.
 * `message`/`detail` intentionally carry the exact required copy.
 */
export function showUnsupportedDialog(): void {
  try {
    dialog.showMessageBoxSync({
      type: 'error',
      title: UNSUPPORTED_TITLE,
      message: UNSUPPORTED_TITLE,
      detail: UNSUPPORTED_MESSAGE,
      buttons: ['Close'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
  } catch (error: any) {
    log.error('Failed to show the unsupported-device dialog:', error?.message ?? error);
  }
}

export interface StartupGateResult {
  blocked: boolean;
  eventId?: string;
  reasons: string[];
}

/**
 * Runs before the splash/main window exist. Returns `blocked: true` after the
 * report has been attempted; the caller shows the dialog and quits.
 */
export async function runStartupGate(
  context: DesktopDeviceContext,
): Promise<StartupGateResult> {
  const check = evaluatePlatform(context);
  if (check.supported) return { blocked: false, reasons: [] };

  const report = await reportStartupBlock(context, check);
  const reasons = report.reasons?.length
    ? report.reasons
    : [check.reason || 'Unsupported Windows desktop environment'];
  log.warn(`Startup blocked (${check.eventType}): ${reasons.join('; ')}`);
  return { blocked: true, eventId: report.eventId, reasons };
}
