/**
 * Device context reported to the backend on every request.
 *
 * The backend never trusts these values on their own: they are corroborating
 * signals used by the multi-signal DeviceRiskService (user agent + WebGL +
 * touch + automation flags on the web, OS/arch/virtualisation on the desktop).
 */

export interface DeviceContext {
  deviceId: string;
  clientType: 'desktop' | 'web';
  platform?: string;
  osName?: string;
  osVersion?: string;
  arch?: string;
  macAddress?: string;
  signals: string[];
  webgl?: string;
  webdriver?: boolean;
  isEmulator?: boolean;
  isVirtualMachine?: boolean;
  vmHost?: string;
  touchPoints?: number;
  hardwareConcurrency?: number;
  deviceLabel?: string;
}

const DEVICE_ID_KEY = 'hrms.deviceId';

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return 'unknown-device';
  }
}

function detectWebgl(): string | undefined {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return undefined;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext
      ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string)
      : (gl.getParameter(gl.RENDERER) as string);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return typeof renderer === 'string' ? renderer.slice(0, 256) : undefined;
  } catch {
    return undefined;
  }
}

function browserPlatform(): string {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return 'win32';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/mac os x|macintosh/i.test(ua)) return 'darwin';
  if (/linux/i.test(ua)) return 'linux';
  return 'unknown';
}

function browserOsName(platform: string): string | undefined {
  const ua = navigator.userAgent;
  if (platform === 'win32') return /windows nt 11|windows nt 10\.0\.2[2-9]/i.test(ua) ? 'Windows 11' : 'Windows 10';
  if (platform === 'android') return 'Android';
  if (platform === 'ios') return 'iOS';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return undefined;
}

function browserSignals(): string[] {
  const signals: string[] = [];
  const ua = navigator.userAgent;

  if (/(bluestacks|noxplayer|memu|ldplayer|genymotion|andyroid|droid4x|koplayer)/i.test(ua)) {
    signals.push('ua:emulator');
  }
  if (/sdk_gphone|aosp on x86|android[^;]*;\s*x86/i.test(ua)) {
    signals.push('ua:android-x86');
  }
  if (navigator.webdriver) signals.push('webdriver:true');
  if (/headlesschrome/i.test(ua)) signals.push('ua:headless');
  return signals;
}

let cached: DeviceContext | null = null;

/**
 * Returns a memoised snapshot. The desktop bridge supplies authoritative
 * Windows identity (platform/arch/OS build/VM signals); the browser path
 * relies on user-agent + WebGL + touch heuristics.
 */
export function getDeviceContext(): DeviceContext {
  const desktop = typeof window !== 'undefined' ? window.electronAPI?.deviceContext : undefined;

  if (cached) {
    if (!cached.macAddress && desktop?.macAddress) {
      cached.macAddress = desktop.macAddress;
    }
    return cached;
  }

  if (desktop) {
    cached = {
      ...desktop,
      deviceId: getDeviceId(),
      macAddress: desktop.macAddress,
      clientType: 'desktop',
      signals: Array.isArray(desktop.signals) ? desktop.signals.slice(0, 40) : [],
    };
    return cached;
  }

  const platform = browserPlatform();
  const touchPoints =
    typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;

  cached = {
    deviceId: getDeviceId(),
    clientType: 'web',
    platform,
    osName: browserOsName(platform),
    osVersion: navigator.userAgent.slice(0, 96),
    arch: /x86_64|x64|win64|wow64/i.test(navigator.userAgent) ? 'x64' : undefined,
    signals: browserSignals(),
    webgl: detectWebgl(),
    webdriver: !!navigator.webdriver,
    touchPoints,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : undefined,
    deviceLabel: navigator.platform || undefined,
  };
  return cached;
}

/** Stable, URL-safe base64 encoding of the context for the request header. */
export function encodeDeviceContext(ctx: DeviceContext = getDeviceContext()): string {
  try {
    const json = JSON.stringify(ctx);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function deviceHeaders(): Record<string, string> {
  try {
    const ctx = getDeviceContext();
    const headers: Record<string, string> = {
      'X-Device-Id': ctx.deviceId,
      'X-Device-Context': encodeDeviceContext(ctx),
      'X-Client-Type': ctx.clientType,
    };
    if (ctx.platform) headers['X-Client-Platform'] = ctx.platform;
    if (ctx.arch) headers['X-Client-Arch'] = ctx.arch;
    if (ctx.osVersion) headers['X-OS-Version'] = ctx.osVersion.slice(0, 96);
    if (ctx.macAddress) headers['X-Device-MAC'] = ctx.macAddress;
    return headers;
  } catch {
    return {};
  }
}

/** Test/hot-reload hook. */
export function resetDeviceContextCache(): void {
  cached = null;
}
