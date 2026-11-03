import {
  DEFAULT_SECURITY_POLICY,
  DeviceRiskService,
  SecurityPolicy,
  normalizePolicy,
} from './device-risk.service';

const risk = new DeviceRiskService();

function policy(overrides: Partial<SecurityPolicy> = {}): SecurityPolicy {
  return { ...DEFAULT_SECURITY_POLICY, ...overrides };
}

describe('DeviceRiskService', () => {
  describe('Windows desktop client', () => {
    it('allows a normal Windows 10 x64 desktop', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        osName: 'Windows 10 Pro',
        osVersion: '10.0.19045',
        deviceId: 'dev-1',
      });
      expect(result.level).toBe('allow');
      expect(result.reasons).toEqual([]);
    });

    it('allows Windows 11 with an approved hybrid GPU', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        osName: 'Windows 11 Pro',
        osVersion: '10.0.22631',
        webgl: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
      });
      expect(result.level).toBe('allow');
    });

    it('blocks a non-Windows desktop client', () => {
      const result = risk.assess({ clientType: 'desktop', platform: 'linux', arch: 'x64' });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('UNSUPPORTED_PLATFORM');
    });

    it('blocks a 32-bit desktop client', () => {
      const result = risk.assess({ clientType: 'desktop', platform: 'win32', arch: 'ia32' });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('UNSUPPORTED_ARCH');
    });

    it('blocks Windows versions older than Windows 10', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        osName: 'Windows 8.1 Pro',
        osVersion: '6.3.9600',
      });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('UNSUPPORTED_OS_VERSION');
    });

    it('blocks Windows 10 builds older than the supported baseline', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        osName: 'Windows 10',
        osVersion: '10.0.9600',
      });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('UNSUPPORTED_OS_VERSION');
    });

    it('allows the Windows 10 RTM baseline build', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        osName: 'Windows 10',
        osVersion: '10.0.10240',
      });
      expect(result.level).toBe('allow');
    });

    it('treats emulator artefacts as information only (EXE cannot run in Android)', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        signals: ['emulator:process:HD-Player.exe', 'install:BlueStacks'],
        webgl: 'ANGLE (Google, Vulkan 1.1.0 (SwiftShader Device))',
      });
      expect(result.level).toBe('allow');
      expect(result.checks.emulatorSignals).toBeDefined();
    });

    it('monitors (but does not block) a Windows VM under the default policy', () => {
      const result = risk.assess({
        clientType: 'desktop',
        platform: 'win32',
        arch: 'x64',
        vmHost: 'VMware',
        signals: ['vm:registry:VMware, Inc.'],
      });
      expect(result.level).toBe('monitor');
      expect(result.eventType).toBe('VIRTUAL_MACHINE');
    });

    it('blocks a Windows VM when the company enables virtual-machine blocking', () => {
      const result = risk.assess(
        {
          clientType: 'desktop',
          platform: 'win32',
          arch: 'x64',
          vmHost: 'VirtualBox',
          signals: ['vm:bios:innotek GmbH'],
        },
        policy({ blockVirtualMachines: true }),
      );
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('VIRTUAL_MACHINE');
    });

    it('allows an explicitly approved enterprise virtual desktop', () => {
      const result = risk.assess(
        {
          clientType: 'desktop',
          platform: 'win32',
          arch: 'x64',
          vmHost: 'VMware Horizon',
          signals: ['vm:registry:VMware, Inc.'],
        },
        policy({ blockVirtualMachines: true, allowedVmHosts: ['vmware horizon'] }),
      );
      expect(result.level).toBe('allow');
      expect(result.checks.approvedVirtualDesktop).toBe(true);
    });
  });

  describe('browser clients', () => {
    it('allows a normal desktop browser', () => {
      const result = risk.assess({
        clientType: 'web',
        platform: 'win32',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        touchPoints: 0,
        webgl: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)',
      });
      expect(result.level).toBe('allow');
    });

    it('blocks a named Android emulator browser', () => {
      const result = risk.assess({
        clientType: 'web',
        platform: 'android',
        userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-G975F) AppleWebKit/537.36 BlueStacks',
        touchPoints: 5,
      });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('EMULATOR_DETECTED');
    });

    it('blocks a mobile user agent with no touch support', () => {
      const result = risk.assess({
        clientType: 'web',
        platform: 'android',
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
        touchPoints: 0,
      });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('EMULATOR_DETECTED');
    });

    it('allows a genuine mobile browser by default', () => {
      const result = risk.assess({
        clientType: 'web',
        platform: 'android',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        touchPoints: 5,
      });
      expect(result.level).toBe('allow');
    });

    it('can reject mobile clients when the policy asks for desktop-only access', () => {
      const result = risk.assess(
        {
          clientType: 'web',
          platform: 'ios',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          touchPoints: 5,
        },
        policy({ blockMobileClients: true }),
      );
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('UNSUPPORTED_PLATFORM');
    });

    it('does not block a Windows browser merely because a VM tool is installed', () => {
      const result = risk.assess({
        clientType: 'web',
        platform: 'win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',
        signals: ['install:VirtualBox'],
      });
      expect(result.level).toBe('monitor');
    });

    it('blocks a software-rendered emulator WebGL context', () => {
      const result = risk.assess({
        clientType: 'web',
        platform: 'android',
        userAgent: 'Mozilla/5.0 (Linux; Android 9) Chrome/120 Mobile Safari/537.36',
        touchPoints: 5,
        webgl: 'Google SwiftShader',
      });
      expect(result.level).toBe('block');
      expect(result.eventType).toBe('EMULATOR_DETECTED');
    });

    it('honours blockEmulators=false', () => {
      const result = risk.assess(
        {
          clientType: 'web',
          platform: 'android',
          userAgent: 'BlueStacks',
          touchPoints: 0,
        },
        policy({ blockEmulators: false }),
      );
      expect(result.level).toBe('monitor');
    });
  });

  it('never fails on missing device context', () => {
    const result = risk.assess({});
    expect(result.level).toBe('allow');
  });

  it('normalises malformed stored policies back to safe defaults', () => {
    expect(normalizePolicy(null)).toEqual(DEFAULT_SECURITY_POLICY);
    expect(normalizePolicy({ blockEmulators: 'nope' }).blockEmulators).toBe(true);
    expect(normalizePolicy({ blockVirtualMachines: true, allowedVmHosts: [' VMware ', 42] })).toMatchObject({
      blockVirtualMachines: true,
      allowedVmHosts: ['vmware'],
    });
  });
});
