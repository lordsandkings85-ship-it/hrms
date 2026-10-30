/**
 * Saturday weekly-off resolution.
 *
 * Historically the only configurable Saturday off was the company policy
 * `custom.secondSaturdayOff` (2nd Saturday = day-of-month 8–14) applied to
 * 6-day workweek employees. An employee can now override it with
 * `Employee.saturdayOffRule`:
 *
 *   null / undefined → inherit the company policy (existing behaviour)
 *   'SECOND'         → 2nd Saturday off
 *   'FOURTH'         → 4th Saturday off (day-of-month 22–28)
 *   'NONE'           → no Saturday weekly off
 *
 * `Employee.saturdayOffEffectiveFrom` (optional) delays the override: before that
 * calendar date the employee keeps inheriting the company policy, so a mid-year
 * switch does not rewrite past months.
 *
 * A "4th Saturday" is the Saturday whose day-of-month is 22–28 (same convention as
 * the 2nd-Saturday 8–14 window). Months with five Saturdays leave the 5th as a
 * working day.
 */

export type SaturdayOffRule = 'SECOND' | 'FOURTH' | 'NONE';

/** Normalise a stored/entered rule. Unknown or empty values mean "inherit". */
export function parseSaturdayOffRule(value: unknown): SaturdayOffRule | null {
  if (value == null) return null;
  const normalised = String(value).trim().toUpperCase();
  if (normalised === 'SECOND' || normalised === 'FOURTH' || normalised === 'NONE') {
    return normalised;
  }
  return null;
}

/** YYYYMMDD key for a local calendar date (attendance dates are local). */
function localDayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * YYYYMMDD key for an effective-from timestamp. Prisma stores DateTime as UTC, so the
 * date the admin picked (e.g. 2026-11-01) is read back as 2026-11-01T00:00:00Z and its
 * UTC components are the intended calendar date.
 */
function effectiveDayKey(value: Date | string): number {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return 0;
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/**
 * Which Saturday-off rule applies to an employee on a given date.
 * Returns the effective rule ('NONE' when explicitly disabled), or null when neither
 * an employee rule nor the company policy configures a Saturday off.
 */
export function resolveSaturdayOffRule(params: {
  employeeRule?: string | null;
  effectiveFrom?: Date | string | null;
  companySecondSatOff?: boolean | null;
  date: Date;
}): SaturdayOffRule | null {
  const rule = parseSaturdayOffRule(params.employeeRule);
  if (rule) {
    if (!params.effectiveFrom || localDayKey(params.date) >= effectiveDayKey(params.effectiveFrom)) {
      return rule;
    }
    // Before the override's effective date the employee still follows the company policy.
  }
  return params.companySecondSatOff ? 'SECOND' : null;
}

/** True when the date is a Saturday and falls in the rule's off window. */
export function isSaturdayOff(date: Date, rule: SaturdayOffRule | null): boolean {
  if (!rule || date.getDay() !== 6) return false;
  const dom = date.getDate();
  if (rule === 'SECOND') return dom >= 8 && dom <= 14;
  if (rule === 'FOURTH') return dom >= 22 && dom <= 28;
  return false;
}

/**
 * Convenience wrapper used by the calendars: combines the 6-day-week requirement, the
 * employee's effective rule and the company fallback.
 */
export function resolveSaturdayWeeklyOff(params: {
  date: Date;
  workingDaysPerWeek?: number | null;
  employeeRule?: string | null;
  effectiveFrom?: Date | string | null;
  companySecondSatOff?: boolean | null;
}): { isOff: boolean; rule: SaturdayOffRule | null } {
  const rule = resolveSaturdayOffRule({
    employeeRule: params.employeeRule,
    effectiveFrom: params.effectiveFrom,
    companySecondSatOff: params.companySecondSatOff,
    date: params.date,
  });
  const workDays = params.workingDaysPerWeek ?? 5;
  // The Saturday weekly off only ever applies to a 6-day workweek. A 5-day week
  // already has every Saturday off; a 7-day week has none.
  if (workDays !== 6) return { isOff: false, rule };
  return { isOff: isSaturdayOff(params.date, rule), rule };
}

/** Human label for badges/audit copy. */
export function saturdayOffLabel(rule: SaturdayOffRule | null): string | null {
  if (rule === 'SECOND') return '2nd Saturday';
  if (rule === 'FOURTH') return '4th Saturday';
  return null;
}
