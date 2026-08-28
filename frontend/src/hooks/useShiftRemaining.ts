import { useMemo } from 'react';
import { useServerTime } from './useServerTime';

/**
 * Format minutes as "12h 15m", "45m", or "0m".
 * Uses floor parts so rounding can never produce "12h 60m" (0h) artifacts.
 */
export function fmtShiftHM(mins: number): string {
  const m = Math.max(0, Math.floor(mins));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  return `${h}h ${mm}m`;
}

/**
 * Live, server-clock-driven countdown of shift time remaining.
 *
 * Remaining = time until shift end, capped at the shift's required duration —
 * before the shift starts this reads the full "9h 0m" instead of hours until 19:00.
 * Ticks every second off the server-synced clock (useServerTime) and returns null
 * once the day has been checked out (no more active session).
 */
export function useShiftRemaining(todayStatus: any) {
  const { now } = useServerTime();

  return useMemo(() => {
    if (!todayStatus?.shiftEnd) return null;
    if (todayStatus.checkOut) return null;

    const required = todayStatus.requiredMinutes;
    const untilEndMs = new Date(todayStatus.shiftEnd).getTime() - now.getTime();
    const untilEnd = Math.max(0, Math.ceil(untilEndMs / 60000));
    const capped = required != null ? Math.min(untilEnd, required) : untilEnd;
    return capped;
  }, [todayStatus, now]);
}