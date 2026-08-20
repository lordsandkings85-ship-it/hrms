let offset = 0;
let synced = false;
let syncPromise: Promise<void> | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

const API_BASE = (() => {
  const raw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';
  return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/+$/, '')}/api/v1`;
})();

export async function syncServerTime(): Promise<void> {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      const t0 = Date.now();
      const res = await fetch(`${API_BASE}/time`);
      const t1 = Date.now();
      const data = await res.json();
      const roundTrip = t1 - t0;
      const serverTime = data.unix;
      offset = serverTime - t0 - roundTrip / 2;
      synced = true;
      retryCount = 0;
    } catch {
      synced = false;
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        setTimeout(() => { syncPromise = null; syncServerTime(); }, delay);
      }
    } finally {
      syncPromise = null;
    }
  })();
  return syncPromise;
}

export function getServerNow(): Date {
  return new Date(Date.now() + offset);
}

export function getServerUnix(): number {
  return Date.now() + offset;
}

export function getServerISO(): string {
  return getServerNow().toISOString();
}

export function getServerDate(): string {
  const d = getServerNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getServerYear(): number {
  return getServerNow().getFullYear();
}

export function getServerMonth(): number {
  return getServerNow().getMonth() + 1;
}

export function isSynced(): boolean {
  return synced;
}

export function getOffset(): number {
  return offset;
}
