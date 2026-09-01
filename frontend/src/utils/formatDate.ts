const DEFAULT_LOCALE = 'en-IN';

export function fmtDate(value: any, locale: string = DEFAULT_LOCALE): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale);
}

export function fmtDateTime(value: any, locale: string = DEFAULT_LOCALE): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale);
}

export function fmtDateFull(value: any, locale: string = DEFAULT_LOCALE): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtDateShort(value: any, locale: string = DEFAULT_LOCALE): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateCompact(value: any, locale: string = DEFAULT_LOCALE): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format an ISO instant as 12-hour clock time, e.g. "02:02 PM" (browser-local timezone). */
export function fmtTime12(value: any): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const hh = d.getHours() % 12 || 12;
  const mm = d.getMinutes();
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

/** Format a "HH:mm" (or "HH:mm:ss") wall-clock string as 12-hour time, e.g. "15:00" → "03:00 PM". */
export function fmt24To12(hhmm?: string | null): string {
  if (!hhmm) return '';
  const [h, rest] = hhmm.split(':');
  const hh24 = parseInt(h, 10);
  if (Number.isNaN(hh24)) return hhmm;
  const mm = (rest || '00').slice(0, 2);
  return `${String(hh24 % 12 || 12).padStart(2, '0')}:${mm} ${hh24 >= 12 ? 'PM' : 'AM'}`;
}
