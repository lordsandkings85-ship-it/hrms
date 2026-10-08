/**
 * Monthly "late allowance" rule.
 *
 * Each month an employee is allowed `allowance` late days that are fully paid.
 * Every late day after that is treated as a half-day LOP (loss of pay): it still
 * counts as a worked/late day in attendance, but payroll deducts an extra 0.5
 * day's pay per penalized late.
 *
 * Keys are local "YYYY-MM-DD" strings, so lexicographic sort is chronological.
 * The first `allowance` keys are allowed; the rest are penalized.
 */
export function computeLatePenalty(lateDayKeys: string[], allowance: number): {
  allowedCount: number;
  penalizedCount: number;
  penalizedKeys: Set<string>;
} {
  const allow = Math.max(0, Math.floor(Number.isFinite(allowance) ? allowance : 6));
  const sorted = [...lateDayKeys].sort();
  const penalizedKeys = new Set<string>();
  for (let i = allow; i < sorted.length; i++) penalizedKeys.add(sorted[i]);
  return {
    allowedCount: Math.min(sorted.length, allow),
    penalizedCount: Math.max(0, sorted.length - allow),
    penalizedKeys,
  };
}

/** Default + policy fallback for the monthly late allowance. */
export const MAX_LATES_FALLBACK = 6;
export const MAX_PERMISSIONS_FALLBACK = 6;