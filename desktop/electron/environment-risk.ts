import { app } from 'electron';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import os from 'os';
import { join } from 'path';
import ElectronStore from 'electron-store';

/**
 * Device identity/context collected from the Windows host itself (not from the
 * renderer). These values are authoritative for the desktop client: the
 * backend still re-assesses them, but a compromised page cannot forge the
 * platform, architecture or hypervisor evidence captured here.
 */
export interface DesktopDeviceContext {
  deviceId: string;
  clientType: 'desktop';
  platform: string;
  osName?: string;
  osVersion?: string;
  arch: string;
  signals: string[];
  webgl?: string;
  isEmulator?: boolean;
  isVirtualMachine?: boolean;
  vmHost?: string;
  touchPoints?: number;
  hardwareConcurrency?: number;
  deviceLabel?: string;
}

interface DeviceStore {
  deviceId: string;
  lastEmail?: string;
}

const store = new ElectronStore<DeviceStore>({
  name: 'workora-device',
  defaults: { deviceId: '' },
});

function getDeviceId(): string {
  let id = store.get('deviceId');
  if (!id) {
    id = randomUUID();
    store.set('deviceId', id);
  }
  return id;
}

let activeContext: DesktopDeviceContext | null = null;

/** Set once, before the main window is created, for the preload bridge. */
export function setActiveDeviceContext(context: DesktopDeviceContext): void {
  activeContext = context;
}

export function getActiveDeviceContext(): DesktopDeviceContext | null {
  return activeContext;
}

/** Remembered so a startup block can still be tied to the employee/company. */
export function setLastKnownEmail(email: string): void {
  const clean = email.trim().toLowerCase().slice(0, 254);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    store.set('lastEmail', clean);
  }
}

export function getLastKnownEmail(): string | undefined {
  return store.get('lastEmail') || undefined;
}

function run(command: string, args: string[], timeout = 5000): string {
  try {
    const out = execFileSync(command, args, {
      windowsHide: true,
      timeout,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return typeof out === 'string' ? out : String(out);
  } catch {
    return '';
  }
}

function registryValues(
  key: string,
  names: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of names) {
    const out = run('reg', ['query', key, '/v', name]);
    const line = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.toLowerCase().startsWith(name.toLowerCase() + ' '));
    if (!line) continue;
    const match = line.match(/REG_(?:SZ|EXPAND_SZ|MULTI_SZ)\s+(.+)$/i);
    if (match?.[1]) result[name] = match[1].trim();
  }
  return result;
}

const VM_PATTERNS: Array<[RegExp, string]> = [
  [/vmware/i, 'VMware'],
  [/virtualbox|innotek/i, 'VirtualBox'],
  [/hyper-?v|microsoft corporation virtual machine/i, 'Hyper-V'],
  [/parallels/i, 'Parallels'],
  [/qemu|kvm/i, 'QEMU/KVM'],
  [/\bxen\b/i, 'Xen'],
  [/bochs/i, 'Bochs'],
  [/virtual machine/i, 'Generic virtual machine'],
];

const VM_PROCESSES: Array<[RegExp, string]> = [
  [/^vmtoolsd\.exe$/i, 'VMware Tools'],
  [/^vmwaretray\.exe$/i, 'VMware Tools'],
  [/^vboxservice\.exe$/i, 'VirtualBox Guest Additions'],
  [/^vboxtray\.exe$/i, 'VirtualBox Guest Additions'],
  [/^prl_tools\.exe$/i, 'Parallels Tools'],
  [/^qemu-ga\.exe$/i, 'QEMU Guest Agent'],
  [/^xenservice\.exe$/i, 'Xen Guest Tools'],
];

const EMULATOR_PROCESSES: Array<[RegExp, string]> = [
  [/^hd-player\.exe$/i, 'BlueStacks'],
  [/^bluestacks\.exe$/i, 'BlueStacks'],
  [/^nox\.exe$/i, 'NoxPlayer'],
  [/^memu\.exe$/i, 'MEmu'],
  [/^dnplayer\.exe$/i, 'LDPlayer'],
  [/^ldvboxheadless\.exe$/i, 'LDPlayer'],
  [/^ld9boxheadless\.exe$/i, 'LDPlayer'],
  [/^genymotion\.exe$/i, 'Genymotion'],
  [/^qemu-system-/i, 'QEMU system emulator'],
  [/^sdk_gphone/i, 'Android SDK emulator'],
];

const VM_DRIVERS = ['vmmouse.sys', 'vmhgfs.sys', 'vmci.sys', 'VBoxGuest.sys', 'VBoxMouse.sys', 'prl_fs.sys'];

const EMULATOR_FOLDERS: Array<[string, string]> = [
  ['BlueStacks', 'BlueStacks'],
  ['Nox', 'NoxPlayer'],
  ['Microvirt', 'MEmu'],
  ['LDPlayer', 'LDPlayer'],
  ['Genymotion', 'Genymotion'],
];

function detectVmHost(haystack: string): string | undefined {
  for (const [re, label] of VM_PATTERNS) {
    if (re.test(haystack)) return label;
  }
  return undefined;
}

function listProcesses(): string {
  return run('tasklist', ['/FO', 'CSV', '/NH'], 6000).toLowerCase();
}

function knownFolders(): string[] {
  const roots = [
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)'],
    process.env['LOCALAPPDATA'],
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);
  const found: string[] = [];
  for (const root of roots) {
    for (const [folder, label] of EMULATOR_FOLDERS) {
      try {
        if (existsSync(join(root, folder))) found.push(label);
      } catch {
        /* ignore */
      }
    }
  }
  return Array.from(new Set(found));
}

async function readGpu(): Promise<{ label?: string; vmHost?: string; signal?: string }> {
  try {
    const info: any = await app.getGPUInfo('complete');
    const device = Array.isArray(info?.gpuDevice) ? info.gpuDevice[0] : undefined;
    if (!device) return {};
    const vendorId = Number(device.vendorId ?? 0);
    const deviceId = Number(device.deviceId ?? 0);
    const name =
      device.deviceString ||
      device.vendorName ||
      device.driverVendor ||
      `GPU ${vendorId.toString(16)}:${deviceId.toString(16)}`;

    // Virtual GPU vendor IDs. Microsoft (0x1414) is deliberately excluded:
    // its Basic Render Driver also appears on real PCs without a GPU driver.
    const vmByVendor: Record<number, string> = {
      0x15ad: 'VMware',
      0x80ee: 'VirtualBox',
      0x1ab8: 'Parallels',
      0x1234: 'QEMU/KVM',
      0x5853: 'Xen',
    };
    const vmHost = vmByVendor[vendorId];
    return {
      label: String(name).slice(0, 200),
      vmHost,
      signal: vmHost ? `vm:gpu:${vmHost} (${String(name).slice(0, 120)})` : `gpu:${String(name).slice(0, 120)}`,
    };
  } catch {
    return {};
  }
}

/**
 * Collects the Windows identity + virtualisation evidence with independent,
 * corroborating signals (registry/BIOS, guest processes, drivers, installed
 * emulators, virtual GPU). A single weak signal never decides anything: the
 * policy decision is made server-side.
 */
export async function collectDeviceContext(): Promise<DesktopDeviceContext> {
  const signals = new Set<string>();
  let deviceLabel = '';
  let vmHost: string | undefined;

  if (process.platform === 'win32') {
    const bios = registryValues('HKLM\\HARDWARE\\DESCRIPTION\\System\\BIOS', [
      'SystemManufacturer',
      'SystemProductName',
      'SystemFamily',
      'BIOSVendor',
      'BIOSVersion',
    ]);
    for (const [name, value] of Object.entries(bios)) {
      if (!value) continue;
      const label = detectVmHost(value);
      if (label) signals.add(`vm:bios:${name}=${value}`);
    }

    // Hyper-V/KVM integration services expose guest parameters here.
    const guestParams = registryValues('HKLM\\SOFTWARE\\Microsoft\\Virtual Machine\\Guest\\Parameters', [
      'PhysicalHostName',
      'HostName',
    ]);
    for (const [name, value] of Object.entries(guestParams)) {
      if (value) signals.add(`vm:guest:${name}=${value}`);
    }

    // Disk/SCSI enumeration often exposes the hypervisor vendor string.
    const diskEnum = registryValues('HKLM\\SYSTEM\\CurrentControlSet\\Services\\disk\\Enum', ['0']);
    if (diskEnum['0']) signals.add(`disk:enum=${diskEnum['0'].slice(0, 160)}`);

    const processes = listProcesses();
    for (const [re, label] of VM_PROCESSES) {
      if (re.test(processes)) signals.add(`vm:process:${label}`);
    }
    for (const [re, label] of EMULATOR_PROCESSES) {
      if (re.test(processes)) signals.add(`emulator:process:${label}`);
    }

    for (const driver of VM_DRIVERS) {
      try {
        if (existsSync(join(process.env['SystemRoot'] || 'C:\\Windows', 'System32', 'drivers', driver))) {
          signals.add(`vm:driver:${driver}`);
        }
      } catch {
        /* ignore */
      }
    }

    for (const label of knownFolders()) {
      signals.add(`install:${label}`);
    }

    const manufacturer = bios['SystemManufacturer'] || '';
    const product = bios['SystemProductName'] || '';
    deviceLabel = [manufacturer, product].filter(Boolean).join(' ').trim().slice(0, 200);

    const haystack = [
      deviceLabel,
      ...Object.values(bios),
      ...Object.values(guestParams),
      diskEnum['0'] || '',
    ].join(' ');

    vmHost = detectVmHost(haystack);
  } else if (process.platform === 'darwin') {
    const hwModel = run('sysctl', ['-n', 'hw.model']).trim();
    const cpuBrand = run('sysctl', ['-n', 'machdep.cpu.brand_string']).trim();
    deviceLabel = hwModel || cpuBrand || 'Apple Mac';

    const macVm = detectVmHost(hwModel);
    if (macVm) {
      vmHost = macVm;
      signals.add(`vm:model=${hwModel}`);
    }
  }

  const gpu = await readGpu();
  if (gpu.signal) signals.add(gpu.signal);
  if (!vmHost && gpu.vmHost) vmHost = gpu.vmHost;

  const release = os.release();
  const osName = (() => {
    if (process.platform === 'darwin') {
      const darwinMajor = Number((release.match(/^(\d+)/) || [])[1] || 0);
      if (darwinMajor >= 24) return 'macOS 15 Sequoia';
      if (darwinMajor === 23) return 'macOS 14 Sonoma';
      if (darwinMajor === 22) return 'macOS 13 Ventura';
      if (darwinMajor === 21) return 'macOS 12 Monterey';
      if (darwinMajor === 20) return 'macOS 11 Big Sur';
      return 'macOS';
    }
    const build = Number((release.match(/^10\.0\.(\d+)/) || [])[1] || 0);
    const version = typeof os.version === 'function' ? os.version() : '';
    if (/windows 11/i.test(version) || build >= 22000) return 'Windows 11';
    if (build >= 10240) return 'Windows 10';
    return version || 'Windows';
  })();

  return {
    deviceId: getDeviceId(),
    clientType: 'desktop',
    platform: process.platform,
    osName,
    osVersion: release,
    arch: process.arch,
    signals: Array.from(signals).slice(0, 24),
    webgl: gpu.label ? `desktop-gpu: ${gpu.label}` : undefined,
    isVirtualMachine: !!vmHost,
    vmHost,
    touchPoints: 0,
    hardwareConcurrency: os.cpus()?.length,
    deviceLabel: deviceLabel || undefined,
  };
}
