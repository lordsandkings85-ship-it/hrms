import { getClientIp } from './ip.util';

describe('getClientIp', () => {
  it('returns null when req is undefined or null', () => {
    expect(getClientIp(undefined)).toBeNull();
    expect(getClientIp(null)).toBeNull();
  });

  it('prioritizes cf-connecting-ip', () => {
    const req = {
      headers: {
        'cf-connecting-ip': '203.0.113.195',
        'x-forwarded-for': '198.51.100.1, 192.0.2.1',
        'x-real-ip': '198.51.100.2',
      },
      ip: '127.0.0.1',
    };
    expect(getClientIp(req)).toBe('203.0.113.195');
  });

  it('extracts first client IP from x-forwarded-for', () => {
    const req = {
      headers: {
        'x-forwarded-for': '49.207.200.15, 10.0.0.1, 172.16.0.1',
      },
      ip: '10.0.0.1',
    };
    expect(getClientIp(req)).toBe('49.207.200.15');
  });

  it('extracts x-real-ip when x-forwarded-for is missing', () => {
    const req = {
      headers: {
        'x-real-ip': '103.21.244.2',
      },
      ip: '127.0.0.1',
    };
    expect(getClientIp(req)).toBe('103.21.244.2');
  });

  it('falls back to req.ip', () => {
    const req = {
      headers: {},
      ip: '192.168.1.100',
    };
    expect(getClientIp(req)).toBe('192.168.1.100');
  });

  it('falls back to socket remoteAddress', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '10.10.10.10' },
    };
    expect(getClientIp(req)).toBe('10.10.10.10');
  });

  it('strips ::ffff: IPv4-mapped IPv6 prefix', () => {
    const req = {
      headers: {},
      ip: '::ffff:192.168.1.50',
    };
    expect(getClientIp(req)).toBe('192.168.1.50');
  });
});
