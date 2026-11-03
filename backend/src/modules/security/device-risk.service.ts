import { Injectable } from '@nestjs/common';
import { DeviceContextDto } from './dto/device-context.dto';

export interface SecurityPolicy {
  /** Reject browsers/desktops showing definitive emulator evidence. */
  blockEmulators: boolean;
  /** Reject requests originating from a virtual machine (off by default). */
  blockVirtualMachines: boolean;
  /** Reject genuine mobile browsers too (off by default — desktop/web parity). */
  blockMobileClients: boolean;
  /** Automatically block the account when a definitive violation is detected. */
  autoBlockAccounts: boolean;
  /** Notify authorized admins about a violation. */
  notifyAdmins: boolean;
  /** Approved enterprise virtual-desktop hosts (matched case-insensitively). */
  allowedVmHosts: string[];
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  blockEmulators: true,
  blockVirtualMachines: false,
  blockMobileClients: false,
  autoBlockAccounts: true,
  notifyAdmins: true,
  allowedVmHosts: [],
};

export type RiskLevel = 'allow' | 'monitor' | 'block';

export type SecurityEventType =
  | 'EMULATOR_DETECTED'
  | 'VIRTUAL_MACHINE'
  | 'UNSUPPORTED_PLATFORM'
  | 'UNSUPPORTED_ARCH'
  | 'UNSUPPORTED_OS_VERSION'
  | 'ACCOUNT_BLOCKED'
  | 'ACCOUNT_UNBLOCKED'
  | 'SESSION_REVOKED';

export interface DeviceAssessment {
  level: RiskLevel;
  eventType?: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  policy: SecurityPolicy;
  context: DeviceContextDto;
  /** Corroborating details persisted with the security event. */
  checks: Record<string, unknown>;
}

const EMULATOR_UA: Array<[RegExp, string]> = [
  [/bluestacks/i, 'BlueStacks'],
  [/nox(?:player|appplayer)?/i, 'NoxPlayer'],
  [/\bmemu\b/i, 'MEmu'],
  [/ldplayer|ld9box/i, 'LDPlayer'],
  [/genymotion/i, 'Genymotion'],
  [/andyroid/i, 'Andy Android'],
  [/droid4x/i, 'Droid4X'],
  [/koplayer/i, 'KoPlayer'],
  [/sdk_gphone/i, 'Android SDK emulator'],
  [/aosp on x86|android[^;]*;\s*x86/i, 'Android x86 emulator'],
  [/\bemulator\b/i, 'Generic emulator user-agent'],
];

const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|android emulator opengl|angle \(google inc\. \(swiftshader\)/i;

const VM_HOSTS: Array<[RegExp, string]> = [
  [/vmware/i, 'VMware'],
  [/virtualbox|innotek/i, 'VirtualBox'],
  [/\bqemu\b|\bkvm\b/i, 'QEMU/KVM'],
  [/hyper-?v|microsoft corporation virtual machine/i, 'Hyper-V'],
  [/parallels/i, 'Parallels'],
  [/\bxen\b/i, 'Xen'],
  [/bochs/i, 'Bochs'],
  [/virtual machine/i, 'Generic virtual machine'],
];

const EMULATOR_ARTEFACT =
  /bluestacks|noxplayer|nox\b|memu|ldplayer|ld9box|genymotion|andyroid|droid4x|koplayer|qemu-system|hd-player|ldvboxheadless|sdk_gphone/i;

const MOBILE_PLATFORMS = new Set(['android', 'ios', 'iphone', 'ipad', 'ipados', 'mobile']);

/**
 * Windows 10 RTM (build 10240). Windows 11 is build 22000+. Older builds
 * (7/8/8.1) are unsupported regardless of architecture.
 */
const MIN_WINDOWS_BUILD = 10240;

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

function clean(value: unknown, max = 256): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Normalises an arbitrary JSON value stored in `Setting.value` into a policy.
 * Unknown shapes fall back to the safe defaults (emulator blocking on).
 */
export function normalizePolicy(raw: unknown): SecurityPolicy {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const allowed = Array.isArray(source.allowedVmHosts)
    ? source.allowedVmHosts
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 50)
    : [];

  return {
    blockEmulators: asBoolean(source.blockEmulators, DEFAULT_SECURITY_POLICY.blockEmulators),
    blockVirtualMachines: asBoolean(
      source.blockVirtualMachines,
      DEFAULT_SECURITY_POLICY.blockVirtualMachines,
    ),
    blockMobileClients: asBoolean(source.blockMobileClients, DEFAULT_SECURITY_POLICY.blockMobileClients),
    autoBlockAccounts: asBoolean(source.autoBlockAccounts, DEFAULT_SECURITY_POLICY.autoBlockAccounts),
    notifyAdmins: asBoolean(source.notifyAdmins, DEFAULT_SECURITY_POLICY.notifyAdmins),
    allowedVmHosts: allowed,
  };
}

/**
 * Heuristic, multi-signal device risk assessment.
 *
 * Design rules:
 *  - A single weak signal never blocks (e.g. a hypervisor flag, a software GPU
 *    in a Remote Desktop session, or the mere presence of an installed
 *    emulator on disk).
 *  - "Definitive" evidence = a named emulator in the user agent, an emulator
 *    process/installation artefact reported by the Electron bridge, or a mobile
 *    platform that reports zero touch points.
 *  - The desktop (Electron) client can never legitimately run inside an
 *    Android guest, so desktop emulator artefacts are recorded as information
 *    only; what matters there is Windows virtual machines, which are blocked
 *    only when the company policy enables it or when they are not allowlisted.
 */
@Injectable()
export class DeviceRiskService {
  assess(input: DeviceContextDto, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): DeviceAssessment {
    const context: DeviceContextDto = {
      ...input,
      platform: clean(input.platform, 32).toLowerCase() || undefined,
      clientType: clean(input.clientType, 32).toLowerCase() || undefined,
      arch: clean(input.arch, 16).toLowerCase() || undefined,
      osName: clean(input.osName, 96) || undefined,
      osVersion: clean(input.osVersion, 96) || undefined,
      deviceId: clean(input.deviceId, 128) || undefined,
      webgl: clean(input.webgl, 256) || undefined,
      vmHost: clean(input.vmHost, 128) || undefined,
      signals: Array.isArray(input.signals)
        ? input.signals.slice(0, 40).map((s) => clean(s, 256)).filter(Boolean)
        : [],
    };

    const emulatorReasons = new Set<string>();
    const vmReasons = new Set<string>();
    const ua = clean((input as any).userAgent, 512);
    const platform = context.platform ?? '';
    const clientType = context.clientType ?? '';
    const isMobile = MOBILE_PLATFORMS.has(platform) || /android|iphone|ipad|mobile/i.test(ua);
    const isDesktopClient = clientType === 'desktop';

    for (const [re, label] of EMULATOR_UA) {
      if (re.test(ua)) emulatorReasons.add(`User agent identifies ${label}`);
    }

    for (const signal of context.signals ?? []) {
      if (EMULATOR_ARTEFACT.test(signal)) emulatorReasons.add(`Emulator artefact: ${signal}`);
      const vm = VM_HOSTS.find(([re]) => re.test(signal));
      if (vm) vmReasons.add(`${vm[1]} artefact: ${signal}`);
    }

    if (context.webgl) {
      if (SOFTWARE_GL.test(context.webgl)) {
        emulatorReasons.add(`Software WebGL renderer: ${context.webgl}`);
      }
      const vm = VM_HOSTS.find(([re]) => re.test(context.webgl!));
      if (vm) vmReasons.add(`${vm[1]} graphics adapter`);
    }

    if (context.isEmulator) emulatorReasons.add('Client reported an emulator environment');
    if (context.isVirtualMachine) vmReasons.add('Client reported a virtual machine');
    if (context.vmHost) {
      const vm = VM_HOSTS.find(([re]) => re.test(context.vmHost!));
      if (vm) vmReasons.add(`${vm[1]} host reported by client`);
    }

    // Mobile platform without a touch screen is a classic emulator signature.
    if (!isDesktopClient && isMobile && (context.touchPoints ?? 1) === 0) {
      emulatorReasons.add('Mobile platform reported with no touch support');
    }
    if (context.webdriver && (isMobile || emulatorReasons.size > 0)) {
      emulatorReasons.add('Automation-controlled browser (webdriver)');
    }

    const allowedVm = this.matchAllowedVm(context, policy.allowedVmHosts);
    const checks: Record<string, unknown> = {
      clientType: clientType || 'unknown',
      platform,
      arch: context.arch,
      osName: context.osName,
      osVersion: context.osVersion,
      deviceId: context.deviceId,
      webgl: context.webgl,
      touchPoints: context.touchPoints,
      webdriver: !!context.webdriver,
      emulatorSignals: [...emulatorReasons],
      virtualizationSignals: [...vmReasons],
      approvedVirtualDesktop: allowedVm,
    };

    // 1) Explicit desktop client identity from the Electron bridge (Windows + macOS).
    if (isDesktopClient) {
      const isWindows = platform === 'win32' || platform === 'windows';
      const isMac = platform === 'darwin' || platform === 'mac' || platform === 'macos';

      if (!isWindows && !isMac) {
        return this.block('UNSUPPORTED_PLATFORM', 'high', [`Desktop client reported unsupported platform "${platform}"`], policy, context, checks);
      }

      if (isWindows) {
        if (context.arch && context.arch !== 'x64' && context.arch !== 'amd64') {
          return this.block('UNSUPPORTED_ARCH', 'high', [`Windows desktop client reported architecture "${context.arch}" (x64 required)`], policy, context, checks);
        }
        const build = windowsBuild(context.osVersion);
        if (build !== null && build < MIN_WINDOWS_BUILD) {
          return this.block(
            'UNSUPPORTED_OS_VERSION',
            'high',
            [`Windows build ${build} is older than the supported Windows 10/11 releases`],
            policy,
            context,
            checks,
          );
        }
      }

      if (isMac) {
        if (context.arch && context.arch !== 'arm64' && context.arch !== 'x64' && context.arch !== 'amd64') {
          return this.block('UNSUPPORTED_ARCH', 'high', [`macOS desktop client reported architecture "${context.arch}" (arm64 or x64 required)`], policy, context, checks);
        }
      }

      if (vmReasons.size > 0 && policy.blockVirtualMachines && !allowedVm) {
        return this.block('VIRTUAL_MACHINE', 'high', [...vmReasons], policy, context, checks);
      }
      if (vmReasons.size > 0 && !allowedVm) {
        return this.monitor('VIRTUAL_MACHINE', [...vmReasons], policy, context, checks);
      }
      // Emulator artefacts on a desktop machine do not mean the desktop app is
      // running inside Android; keep them as informational evidence only.
      return { level: 'allow', severity: 'low', reasons: [...emulatorReasons, ...vmReasons], policy, context, checks };
    }

    // 2) Browser / unknown client.
    if (policy.blockEmulators && emulatorReasons.size > 0) {
      return this.block('EMULATOR_DETECTED', 'critical', [...emulatorReasons, ...vmReasons], policy, context, checks);
    }
    if (policy.blockMobileClients && isMobile) {
      return this.block('UNSUPPORTED_PLATFORM', 'high', ['Mobile client rejected by company policy'], policy, context, checks);
    }
    if (vmReasons.size > 0 && policy.blockVirtualMachines && !allowedVm) {
      return this.block('VIRTUAL_MACHINE', 'high', [...vmReasons], policy, context, checks);
    }
    if (vmReasons.size > 0 || emulatorReasons.size > 0) {
      return this.monitor(emulatorReasons.size > 0 ? 'EMULATOR_DETECTED' : 'VIRTUAL_MACHINE', [...emulatorReasons, ...vmReasons], policy, context, checks);
    }
    return { level: 'allow', severity: 'low', reasons: [], policy, context, checks };
  }

  private matchAllowedVm(context: DeviceContextDto, allowed: string[]): boolean {
    if (allowed.length === 0) return false;
    const haystack = [
      context.vmHost,
      context.osName,
      context.deviceLabel,
      ...(context.signals ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return allowed.some((host) => haystack.includes(host));
  }

  private block(
    eventType: SecurityEventType,
    severity: DeviceAssessment['severity'],
    reasons: string[],
    policy: SecurityPolicy,
    context: DeviceContextDto,
    checks: Record<string, unknown>,
  ): DeviceAssessment {
    return { level: 'block', eventType, severity, reasons, policy, context, checks };
  }

  private monitor(
    eventType: SecurityEventType,
    reasons: string[],
    policy: SecurityPolicy,
    context: DeviceContextDto,
    checks: Record<string, unknown>,
  ): DeviceAssessment {
    return { level: 'monitor', eventType, severity: 'medium', reasons, policy, context, checks };
  }
}
