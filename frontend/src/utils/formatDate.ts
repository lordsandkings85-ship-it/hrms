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
