# 06 — HRMS Business Logic Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04 · **Scope:** attendance, leave, payroll, tax, FnF, timesheets  
**Canonical IDs:** `BL-001` … `BL-025`

---

## 1. Summary

The domain model is broad and the UI exposes a lot of policy configuration. The gap is between **configuration** and **enforcement**.

| Area | Status | Headline |
|---|---|---|
| Attendance | **FAIL** | Overnight shifts wrong; server-timezone date keys |
| Leave | **FAIL** | Most `LeaveType` rules are never read; half-day always 0.5 |
| Payroll | **FAIL** | Old-regime deductions missing; future revisions applied; joiner LOP |
| Tax | **FAIL** | 87A cliff; old-regime surcharge capped at 25% |
| FnF | **PARTIAL** | Simplified, not configurable, no legal validation |
| Timesheets / comp-off | **PARTIAL** | Comp-off auto-credited without approval |

These are **implementation defects** unless explicitly marked as a **business-rule disagreement** in section 5. A disagreement is a question for the product owner; a defect is code that does not do what the configuration says.

---

## 2. Attendance

### BL-001 — Overnight shift end on the same calendar day (P1, CONFIRMED)

**Where:** `backend/src/modules/hr/attendance/attendance.service.ts:144-150`

```ts
const shiftStart = zonedDateTime(tz, wall.y, wall.m, wall.d, sh, sm);
const shiftEnd   = zonedDateTime(tz, wall.y, wall.m, wall.d, eh, em);
```

For a 22:00–06:00 shift, `shiftEnd` is 06:00 on the **same** day, which is before `shiftStart`.

**Consequences**

- `requiredMinutes` becomes negative.
- Overtime is computed against a negative baseline.
- "Late" and "early exit" are inverted or always true.
- Payroll working minutes for night-shift staff are wrong.

**Fix:** if `(eh, em) <= (sh, sm)`, add one day to `shiftEnd`. Add tests for 22:00–06:00, 00:00–08:00 and 18:00–02:00.

**Complexity:** Low.

---

### BL-002 — Attendance date key uses server-local time (P1, CONFIRMED)

**Where:** `attendance.service.ts:189-190`

The attendance day is derived with `new Date()` and `new Date(y, m, d)` in the server timezone, even though the company has a `timezone` field used elsewhere in the same file.

**Scenario:** a 23:30 IST check-in on a UTC server lands on the previous UTC day. The row is keyed to the wrong date, splitting a shift across two rows and breaking payroll day counts. With `DB-002` (no unique day key) the split rows are not even rejected.

**Fix:** derive `startOfDay` from the company timezone using the existing wall-clock helper. Store UTC instants plus a canonical `dateKey` (`YYYY-MM-DD` in company TZ).

**Complexity:** Medium — needs a data migration for existing rows.

---

## 3. Leave

### BL-008 — Most leave rules are metadata only (P1, CONFIRMED)

**Where:** `leave.service.ts:68-200` (apply path).

`LeaveType` stores `maxConsecutiveDays`, `halfDayAllowed`, `carryForward`, `carryForwardLimit`, `encashment`, `attachmentRequired`, `applicableAfterDays`, `gender` and `approvalRequired` (`schema.prisma:685-711`).

A repository-wide search finds **no enforcement** for:

| Rule | Enforced? |
|---|---|
| Overlapping requests | No |
| `maxConsecutiveDays` | No |
| `applicableAfterDays` (eligibility) | No |
| `gender` restriction | No |
| `attachmentRequired` | No |
| `halfDayAllowed` | No (and half-day counting is wrong, BL-009) |
| `approvalRequired` | Partially — status defaults to pending |

**Impact:** admins configure policies that have no effect. Employees can book overlapping or ineligible leave.

**Fix:** a `validateLeaveRequest` pipeline with one function per rule, each returning a typed error code, plus unit tests per rule.

**Complexity:** High.

---

### BL-009 — Half-day always counts 0.5 (P1, CONFIRMED)

**Where:** `leave.service.ts:1399-1400`

```ts
function isHalfDayCount(start, end, isHalfDay, holidays) {
  if (isHalfDay) return 0.5;
  ...
}
```

A half-day request spanning Monday–Friday consumes 0.5 instead of 2.5.

**Fix:** reject multi-day half-day requests at validation, or count 0.5 per eligible date.

**Complexity:** Low.

---

### BL-010 — Holiday fallback leaks other tenants' calendars (P1, CONFIRMED)

**Where:** `leave.service.ts:109-115, 639-645, 808-812`; `payroll.service.ts:260-261, 572-574`.

```ts
if (holidays.length === 0 && !groupWide) {
  holidays = await this.prisma.holiday.findMany({ select: { date: true } });
}
```

When a tenant has no holiday calendar, **every company's** holidays are treated as non-working days.

**Impact:** paid days inflate and LOP shrinks for tenants without a calendar; payroll and leave disagree with reality.

**Fix:** remove the global fallback. Treat only weekends as non-working when no calendar exists, and surface a configuration warning.

**Complexity:** Low.

---

### BL-019 — Balances deduplicated by type name (P2, CONFIRMED)

**Where:** `leave.service.ts:668-678`.

Merging on `leaveType.name` silently collapses two distinct types that share a display name. Deduplicate by `id` and enforce a unique code per company (`DB-009`).

---

### BL-022 — Duplicate holidays double-count (P3, CONFIRMED)

See `DB-005`. One holiday row per duplicate is subtracted from working days, so the same date is excluded twice.

---

### BL-023 — Saturday weekly-off rules ignored in leave counting (P3, CONFIRMED)

**Where:** `leave.service.ts:1418-1430`.

Day counting skips Sundays only. `resolveSaturdayWeeklyOff` exists and is used by attendance and payroll, but not here.

**Impact:** leave consumes the wrong number of days for 5-day and alternate-Saturday policies.

---

### BL-024 — Dead configuration fields (P3, CONFIRMED)

`applicableAfterDays`, `gender`, `attachmentRequired`, `maxConsecutiveDays` have no call sites. Implement or remove from the UI.

---

### BL-015 — Carry-forward and encashment ignored at rollover (P2, SUSPECTED)

`carryForward`, `carryForwardLimit` and `encashment` exist on `LeaveType`, but the year-rollover path does not read them. Marked SUSPECTED because the rollover job was not executed; the code path was inspected and does not reference these fields.

**Fix:** apply limits and encashment inside the rollover transaction; add tests with a limited carry-forward and an encashable balance.

---

## 4. Payroll and tax

### BL-003 — Future salary revision applied early (P1, CONFIRMED)

**Where:** `payroll.service.ts:141-143`

```ts
salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
```

No `where: { effectiveFrom: { lte: monthEnd } }`. A revision dated next month changes this month's pay.

**Fix:** filter to the period end and add a regression test.

**Complexity:** Low.

---

### BL-004 — Old-regime deductions never supplied (P1, CONFIRMED)

**Where:** `payroll.service.ts:386-394`

```ts
const taxInput: TaxInput = { basic, hra, da, conveyance, medical, specialAllowance, regime };
```

`rentPaid`, `cityType`, `section80C`, `section80D` and `homeLoanInterest` are never passed. `computeIncomeTax` therefore computes:

- HRA exemption = 0
- 80C = 0 (cap ₹1.5 L)
- 80D = 0 (cap ₹25 k)
- Home-loan interest = 0 (cap ₹2 L)

even when `TaxDeclaration` rows exist.

**Impact:** every old-regime employee is systematically over-taxed; declared investments have no effect.

**Fix:** load the employee's `TaxDeclaration` for the financial year, map to `TaxInput`, and add golden tests for representative salaries.

**Complexity:** Medium.

---

### BL-005 — Section 87A rebate is a cliff (P1, CONFIRMED)

**Where:** `tax.calculator.ts:116-117` (new regime), `:93` (old regime)

```ts
if (taxableIncome <= 1200000) baseTax = 0;
```

At ₹12,00,001 the full slab tax applies:

| Income | Tax before cess | After 4% cess |
|---|---:|---:|
| ₹12,00,000 | ₹0 | ₹0 |
| ₹12,00,001 | ₹60,000 | ₹62,400 |

One extra rupee of income costs ~₹62,400. The statute provides **marginal relief** so tax cannot exceed the income above the threshold. The old regime has the same cliff at ₹5 L (about ₹13,000).

**Fix:** above the threshold, `tax = min(slabTax, taxableIncome - threshold)` before cess.

**Complexity:** Low.

---

### BL-006 — Old-regime surcharge capped at 25% (P1, CONFIRMED)

**Where:** `tax.calculator.ts:120-125`

The same surcharge schedule, capped at 25%, is applied to both regimes.

| Income | Old regime | New regime |
|---|---|---|
| > ₹50 L | 10% | 10% |
| > ₹1 Cr | 15% | 15% |
| > ₹2 Cr | 25% | 25% |
| > ₹5 Cr | **37%** | 25% |

Old-regime high earners are under-taxed.

**Fix:** branch on `regime`; test at ₹50 L, ₹1 Cr, ₹2 Cr, ₹5 Cr and ₹5.01 Cr.

**Complexity:** Low.

---

### BL-007 — Mid-month joiners and leavers pay LOP (P1, CONFIRMED)

**Where:** `payroll.service.ts:287-333`.

Working days are counted for the **whole month**, while `paidDays` only includes days with an attendance log.

- Joiner on the 20th: days 1–19 have no logs → LOP → first salary short by roughly two-thirds.
- Leaver on the 10th: days 11–end are LOP.

**Fix:** clip the working window to `max(monthStart, joiningDate)` and `min(monthEnd, lastWorkingDay)`; prorate per day over the clipped window.

**Complexity:** Medium.

---

### BL-011 — No YTD TDS true-up (P2, CONFIRMED)

**Where:** `tax.calculator.ts:131`

Monthly TDS is annual liability ÷ 12. There is no year-to-date income or deduction tracking, so a mid-year salary change, arrears, or a declaration submitted late is not reconciled.

**Fix:** maintain a YTD ledger per employee and recompute the remaining monthly TDS.

**Complexity:** Medium.

---

### BL-012 — Professional tax is a fixed structure value (P2, CONFIRMED)

**Where:** `payroll.service.ts:383`

PT is read from the salary structure rather than computed from state slabs. This is wrong in most states, and it does not change when the employee's work state changes.

**Fix:** state-wise PT slabs keyed by work location.

**Complexity:** Medium.

---

### BL-013 — PF/ESI manual-flag semantics look inverted (P2, SUSPECTED)

**Where:** `payroll.service.ts:375-382`

Manual amounts are selected when `pfAsPerGovt === false` (and likewise for ESI). That reads as inverted. Payroll was not executed with these flags, so this is SUSPECTED.

**Fix:** rename to `pfMode`/`esiMode` with explicit values, migrate data, add fixture tests.

---

### BL-016 — Comp-off auto-credited without approval (P2, CONFIRMED)

**Where:** `attendance.service.ts:332-336`

Working a weekly off credits comp-off automatically. There is no manager review, no expiry, and no link to a `CompOffRequest`.

**Impact:** balance inflation and abuse.

**Fix:** create a `CompOffRequest` requiring approval before credit; make it policy-controlled.

---

### BL-017 — Late-penalty fallback constant (P2, CONFIRMED)

**Where:** `payroll.service.ts:206-207`; `late-allowance.util.ts` (`MAX_LATES_FALLBACK = 6`).

When no attendance policy is configured, 6 lates triggers a deduction. Companies without a policy silently penalise employees.

**Fix:** require an explicit policy, or apply no penalty with a visible warning.

---

### BL-020 — Payouts after lock (P2, CONFIRMED)

**Where:** `payroll.controller.ts:80-90`; `payroll.service.ts:103-111`.

Additional payouts can be created after a cycle is locked, without triggering recalculation. Locked payslips no longer match recorded payouts.

**Fix:** reject payouts on locked cycles, or create a new adjustment cycle with recalculation.

---

### BL-021 — Duplicate salary revisions (P3, CONFIRMED)

**Where:** `payroll.service.ts:51-66`.

Saving a structure for an existing effective date creates a new row instead of updating. Multiple rows feed the "latest" ordering in BL-003.

**Fix:** upsert on `(employeeId, effectiveFrom)`; add the constraint (`DB-006`).

---

### BL-025 — CTC vs gross mismatch (P2, CONFIRMED)

**Where:** `employees.service.ts:73-74`; `payroll.service.ts:253-254`.

CTC is divided by 12 and treated as a monthly total, while payroll gross excludes employer PF/ESI. Offer letters therefore show a number payroll never pays.

**Fix:** define CTC components explicitly (gross + employer contributions + benefits) and show them separately.

---

## 5. Business-rule disagreements (not defects)

These are product decisions, not code bugs. Each needs an owner decision before "fixing":

| Topic | Current behaviour | Question for the product owner |
|---|---|---|
| Notice period | FnF uses hardcoded notice recovery (`BL-014`) | 30/60/90 days? By grade? Garden leave? |
| Gratuity | Simplified formula | Include statutory 4.81% / 15-day formula and ceiling? |
| Leave accrual | Monthly accrual job | Accrue on calendar month or joining anniversary? Pro-rate the first month? |
| Comp-off expiry | None found | Expiry window (e.g. 90 days)? Approval required? |
| Probation | Free-text field (`BL-018`) | Auto-confirm, or require a review step? |
| PT slabs | Fixed value | Which states are in scope for launch? |
| TDS method | Annual ÷ 12 | Average-rate method with YTD true-up, or a simpler estimate? |
| Overtime | Computed from shift | 1×, 1.5× or 2×? Weekly-off premium? |
| Leave year | Calendar year | Calendar, financial year, or anniversary? |

Do not let these block the defect fixes above; they are tracked separately in `09-MISSING-FEATURES.md`.

---

## 6. Correctness scenarios (worked examples)

### Example A — Night shift

Employee: 22:00–06:00, checks in 21:55, checks out 06:10.

| Step | Expected | Current code |
|---|---|---|
| shiftEnd | next day 06:00 | same day 06:00 |
| required minutes | 480 | negative |
| overtime | ~10 min | wrong |
| late | 0 | likely flagged |

**Result:** BL-001 confirmed by construction.

### Example B — Old regime, ₹12 L CTC with declarations

Declared: rent ₹20 k/month (metro), 80C ₹1.5 L, 80D ₹25 k.

| Component | Expected exemption | Current |
|---|---:|---:|
| HRA | min(actual, 50% basic, rent − 10% basic) | 0 |
| 80C | ₹1,50,000 | 0 |
| 80D | ₹25,000 | 0 |
| Home loan | per declaration | 0 |

**Result:** BL-004 confirmed; tax is materially overstated.

### Example C — Joiner on the 20th

Working days in month: 22. Days employed: 10 (20th–end). Attendance logs: 10.

| Measure | Expected | Current |
|---|---:|---:|
| Payable days | 10 | 10 |
| LOP days | 0 | 12 |
| Salary | 10/22 of monthly | ~45% |

**Result:** BL-007 confirmed.

### Example D — 87A boundary

Taxable income ₹12,00,000 → ₹0. ₹12,00,001 → ₹62,400.

**Result:** BL-005 confirmed.

---

## 7. Recommended business-logic work, in order

1. **Payroll correctness before the next pay run:** BL-003, BL-004, BL-005, BL-006, BL-007. These change money owed to employees and to the tax authority.
2. **Attendance correctness:** BL-001, BL-002 — they feed payroll.
3. **Leave rule enforcement:** BL-008, BL-009, BL-010 — they affect balances and payroll.
4. **Tax year mechanics:** BL-011, BL-012.
5. **Policy gaps:** BL-014, BL-015, BL-016, BL-018.

Each fix needs a **golden test** with a fixed input, expected output and a comment citing the statutory or policy source.

---

## 8. NOT TESTED

| Item | Reason |
|---|---|
| Running a payroll cycle | Would write data; not authorized |
| Tax output against a real assessment | No statutory reference environment |
| Leave accrual/rollover job execution | Scheduled job not run |
| Attendance device integration | No devices or credentials |
| FnF settlement calculation | Not executed; formulas inspected only |
| Statutory filing formats | Feature absent (`MF-005`) |

All findings are from source at `8473ca0`. Worked examples are hand-calculated from the code path, not from a running system.
