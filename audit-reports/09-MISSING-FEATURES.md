# 09 — Missing Features and Capability Gaps

**Commit:** `8473ca0` · **Date:** 2026-11-04  
**Canonical IDs:** `MF-001` … `MF-012`

---

## 1. How this report is scoped

This report covers **capabilities that an HRMS of this ambition is expected to have and that are absent or materially incomplete**. It deliberately excludes:

- **Defects** in existing features (see `01`, `06`). A broken leave rule is a defect, not a missing feature.
- **Polish** (see `03`).
- **Statutory business-rule decisions** that need product sign-off (see `06` §5).

Each item states what exists today, what is missing, and the operational consequence.

---

## 2. Summary table

| ID | Severity | Capability | Status today |
|---|---|---|---|
| MF-001 | P1 | Self-service password reset | Absent |
| MF-002 | P1 | E2E / packaged smoke tests | Absent |
| MF-003 | P2 | MFA lifecycle | Enable-only |
| MF-004 | P2 | Audit-log viewer | Model exists, no UI/API |
| MF-005 | P2 | Statutory returns (PF ECR, ESIC, 24Q, PT) | Absent |
| MF-006 | P2 | Bank/NEFT payout file | Absent |
| MF-007 | P2 | Queued email with retry | Direct send |
| MF-008 | P2 | Backup/restore/DR runbook | Absent |
| MF-009 | P2 | Account lockout / CAPTCHA | IP throttle only |
| MF-010 | P2 | Document malware scanning | Absent |
| MF-011 | P3 | i18n / localisation | English-only |
| MF-012 | P3 | Accessibility conformance | No target or audit |

---

## 3. P1 gaps

### MF-001 — No self-service password reset (P1, CONFIRMED)

**Exists:** admin-driven password reset (`employees.controller.ts`).

**Missing:** `POST /auth/forgot-password`, `POST /auth/reset-password`, single-use tokens, rate limiting, and the corresponding UI.

**Consequence:** every forgotten password requires an administrator. In a distributed workforce this becomes a support bottleneck and encourages weak, shared passwords.

**Implementation notes**

- Token: random 32 bytes, stored hashed, single use, 15–30 minute expiry.
- Always return 200 regardless of whether the email exists (no account enumeration).
- Rate-limit by account and IP; log the event.
- Invalidate all refresh tokens on successful reset.
- Force re-authentication after reset.

**Complexity:** Medium.

---

### MF-002 — No E2E or packaged-app smoke tests (P1, CONFIRMED)

**Exists:** 19 backend Jest suites / 292 tests.

**Missing:**

- Web E2E (Playwright/Cypress).
- Packaged desktop smoke test.
- Contract tests between client and server.
- Any frontend unit tests (`FE-008`).

**Consequence:** the release-blocking defects in this audit (login logout on mount, GET-vs-POST, broken leave fetches, `Origin: null` CORS) would each be caught by one smoke test. Without them, regressions ship silently.

**Minimum viable suite**

1. Login → token stored → dashboard loads.
2. Refresh token → request succeeds after access token expiry.
3. Company switch → correct `X-Company-Id` sent.
4. Leave apply → request created; balance decremented.
5. Monthly allocation → POST succeeds.
6. Employee list → renders rows.
7. Payroll run against a fixture DB → expected payslip values.
8. Packaged app → login + list fetch + update manifest check.

**Complexity:** Medium.

---

## 4. P2 gaps

### MF-003 — MFA lifecycle incomplete (P2, CONFIRMED)

**Exists:** `mfa/enable` issues a secret (`auth.controller.ts:35-39`).

**Missing:** verification at login, recovery codes, disable with re-authentication, audit events, admin enforcement policy.

**Consequence:** users can enable MFA and then be locked out, or never be challenged. The control is cosmetic.

**Complexity:** Medium.

---

### MF-004 — No audit-log viewer (P2, CONFIRMED)

**Exists:** `AuditLog` model written on mutations.

**Missing:** query API with filters (actor, entity, date, action), admin UI, export, retention policy.

**Consequence:** a security incident cannot be investigated by administrators; compliance evidence must be extracted manually from the database.

**Complexity:** Medium.

---

### MF-005 — Statutory returns not generated (P2, SUSPECTED)

**Exists:** compliance master data, tax calculator, PF/ESI computation.

**Missing:** PF ECR, ESIC contribution file, Form 24Q, state professional-tax returns, and reconciliation reports.

**Consequence:** statutory filing happens outside the system, so payroll and filings can diverge. Marked SUSPECTED because no export module was found by inspection; runtime confirmation was not possible.

**Complexity:** High — requires statutory format research and validation.

---

### MF-006 — No bank/NEFT payout file (P2, CONFIRMED)

**Exists:** net pay per employee.

**Missing:** bank file generation (NEFT/RTGS/CSV), account validation, duplicate-payment checks, checksum/total reconciliation.

**Consequence:** bulk salary payment is prepared manually, which is slow and error-prone.

**Complexity:** Medium.

---

### MF-007 — Email delivery has no queue, retry or observability (P2, CONFIRMED)

**Exists:** `MailService` direct send; `@nestjs/bull` is already a dependency.

**Missing:** queue, retries with backoff, dead-letter queue, delivery metrics, suppression handling.

**Consequence:** payslip and notification emails are lost on transient SMTP failures with no visibility.

**Complexity:** Medium.

---

### MF-008 — No backup/restore/DR runbook (P2, CONFIRMED)

**Exists:** the only SQL backups in the repository are the **committed production dumps** (`SEC-001`).

**Missing:** documented backup schedule, encryption, off-site storage, restore drill, RPO/RTO targets.

**Consequence:** unproven recovery; a lost database could mean permanent loss of payroll history.

**Complexity:** Medium (mostly process).

---

### MF-009 — No account lockout or CAPTCHA (P2, CONFIRMED)

**Exists:** 5/min IP throttle on auth endpoints.

**Missing:** per-account failure counter, exponential backoff, CAPTCHA, alerting.

**Consequence:** distributed credential stuffing is not mitigated (`API-006`).

**Complexity:** Medium.

---

### MF-010 — No document malware scanning (P2, CONFIRMED)

**Exists:** document metadata rows with client-supplied URLs.

**Missing:** upload pipeline, MIME/size validation, virus scanning, signed download URLs.

**Consequence:** malicious files can be distributed to HR users; external content can be attached to employee records.

**Complexity:** Medium.

---

## 5. P3 gaps

### MF-011 — No internationalisation (P3, CONFIRMED)

All strings are hardcoded English; dates and numbers use implicit `en-IN` formatting. There is no locale layer, no translation catalogue and no RTL support.

**Consequence:** cannot serve non-English-speaking workforces without a fork.

**Complexity:** High.

---

### MF-012 — No accessibility conformance target (P3, SUSPECTED)

No axe/WCAG checks in CI and no documented target. Static review suggests gaps (`FE-016`).

**Consequence:** legal and usability risk; employees with disabilities may be unable to use core flows.

**Recommendation:** adopt WCAG 2.2 AA, run axe in CI, and do one manual keyboard/screen-reader pass on login, attendance and leave.

**Complexity:** Medium.

---

## 6. Capabilities that exist but are materially incomplete

These are not counted as missing features, but they should not be presented as complete:

| Capability | What exists | What is missing |
|---|---|---|
| Multi-company / group | Company model, group-wide flag | Safe, explicit group-admin capability (`SEC-003`); working company switcher (`FE-002`) |
| Leave policy engine | Full `LeaveType` configuration UI | Enforcement of most rules (`BL-008`) |
| Payroll | Run, payslips, tax calculator | Correct old-regime inputs, marginal relief, proration, YTD true-up (`BL-003`…`BL-007`, `BL-011`) |
| Attendance | Check-in/out, geofence, shifts | Overnight shifts, timezone-correct day keys (`BL-001`, `BL-002`) |
| E-signature | Sign endpoint and hash | Signer identity binding (`SEC-020`) |
| Device trust | Client context and startup gate | Server-side attestation (`SEC-012`); fail-closed version check (`DESK-002`) |
| Audit | Write-side logging | Viewer, bulk-read logging, retention (`MF-004`, `SEC-021`) |
| MFA | Enable | Verify/disable/recovery (`SEC-018`) |
| Desktop update | SHA-512 check | Publisher verification, signing, macOS manifest (`DESK-003`…`DESK-005`, `DESK-010`) |

---

## 7. Recommended sequencing

**Before any new feature work:**

1. Close the P0 security findings (`SEC-001` … `SEC-006`).
2. Fix payroll correctness (`BL-003` … `BL-007`, `BL-011`).
3. Add the E2E/smoke suite (`MF-002`) so subsequent work is verifiable.

**Next:**

4. Password reset (`MF-001`) — highest user-facing operational value.
5. Logout/revocation (`SEC-014`) and token storage (`SEC-013`).
6. Audit viewer (`MF-004`) and lockout (`MF-009`).
7. Bank file (`MF-006`) and statutory returns (`MF-005`).
8. Mail queue (`MF-007`), backup runbook (`MF-008`), malware scanning (`MF-010`).

**Later:**

9. i18n (`MF-011`) and accessibility (`MF-012`) once the core is stable.

---

## 8. NOT TESTED

Feature absence was determined by repository search and route/module inventory at `8473ca0`. No running instance was available, so a feature that exists only in an external service or an untracked branch would not be visible here. Where absence is inferred rather than proven (MF-005), it is marked SUSPECTED.
