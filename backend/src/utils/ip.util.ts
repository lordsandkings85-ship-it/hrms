import type { Request } from 'express';

/**
 * Extracts the real client IP address from an incoming HTTP request.
 * Prioritizes reverse-proxy headers (Cloudflare, X-Forwarded-For, X-Real-IP)
 * before falling back to req.ip and socket addresses.
 */
export function getClientIp(req?: Request | any): string | null {
  if (!req) return null;

  // 1. Cloudflare connecting IP
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cleanIp(cfIp);
  }

  // 2. X-Forwarded-For (client, proxy1, proxy2; client is the first entry)
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const first = forwarded.split(',')[0].trim();
    if (first) return cleanIp(first);
  }

  // 3. X-Real-IP
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return cleanIp(realIp);
  }

  // 4. Express req.ip
  if (typeof req.ip === 'string' && req.ip.trim()) {
    return cleanIp(req.ip);
  }

  // 5. Node socket / connection remote address
  if (typeof req.socket?.remoteAddress === 'string' && req.socket.remoteAddress.trim()) {
    return cleanIp(req.socket.remoteAddress);
  }

  if (typeof req.connection?.remoteAddress === 'string' && req.connection.remoteAddress.trim()) {
    return cleanIp(req.connection.remoteAddress);
  }

  return null;
}

function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  // Strip IPv4-mapped IPv6 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  return cleaned.slice(0, 64);
}
