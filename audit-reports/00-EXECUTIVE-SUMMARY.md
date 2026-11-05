# Workora HRMS — Executive Summary

**Audit type:** Read-only, evidence-based full-stack audit  
**Repository:** `D:\work\HRMS`  
**Commit audited:** `8473ca0` (working tree clean at audit start)  
**Audit date:** 2026-11-04  
**Report version:** 1.0  
**Auditor:** automated static analysis plus manual source verification

---

## 1. What was audited

| Layer | Scope | Evidence basis |
|---|---|---|
| Backend | 36 controllers, 43 services, 367 endpoints, 214 TypeScript files | Source review, route inventory, build/typecheck/tests |
| Frontend | 131 pages, 126 route entries, 24 components, 172 TSX files | Source review, production build, bundle analysis |
| Database | 100 Prisma models, 152 relations, 17 migrations | `schema.prisma`, migration SQL, index/constraint analysis |
| Auth / RBAC | JWT, refresh rotation, permissions guard, company scope, group-wide logic, device security | Source review + manual trace of guard chain |
| Business logic | Attendance, leave, payroll, tax, FnF, exit, timesheets | Source review + rule tracing |
| Desktop | Electron 33 main/preload/renderer, packaging, updater, release workflow | Source review; **installer not executed** |
| Deployment | Render, Vercel, Docker Compose, GitHub Releases | Config review + public repo metadata |

**Not tested:** live production behaviour, real database migration state, Windows/macOS installer execution, end-to-end login with real accounts, and any destructive or state-changing operation. Every such item is marked `NOT TESTED` in the domain reports.

---

## 2. Headline result

**The application is not production-safe in its current state.**

The most severe problems are not subtle code-quality issues. They are:

1. **A public GitHub repository contains production data dumps with employee PII, payroll data, password hashes and refresh-token hashes.**
2. **The same repository publishes working default credentials for super-admin, HR and employee accounts.**
3. **Multi-tenant isolation is enforced inconsistently.** Several endpoints return cross-tenant data to any authenticated user, and the group-wide privilege check grants cross-tenant authority based on role-name substrings and hardcoded emails.
4. **The payroll and tax engine produces materially incorrect statutory results** for common cases (old-regime deductions, 87A marginal relief, mid-month joiners, overnight shifts).
5. **The desktop release is unsigned, has no publisher verification, and can be published partially or against the wrong tag.**

These are release-blocking. No amount of UI polish compensates for a public dump of Aadhaar/PAN/bank data and super-admin credentials.

---

## 3. Findings by severity

| Severity | Count | Meaning |
|---|---:|---|
| **P0 — Critical** | 6 | Active compromise or catastrophic data exposure; stop distribution and rotate credentials |
| **P1 — High** | 41 | Release-blocking; cross-tenant access, wrong pay/tax, broken core flows |
| **P2 — Medium** | 71 | Significant; fix before next release |
| **P3 — Low** | 18 | Moderate/low; schedule |
| **P4 — Informational** | 2 | Cleanup |
| **Total** | **138** | Deduplicated, see `12-FULL-ISSUE-INVENTORY.json` |

Confidence distribution: **126 CONFIRMED**, **11 SUSPECTED**, **1 NOT TESTED**. No finding is reported as CONFIRMED unless the code path or artifact was directly observed.

> Severity here is an audit judgement, not a CVSS score. A P0 is something that can be exploited today or has already leaked data. A P1 blocks a responsible production release.

---

## 4. The six P0 issues

### P0-1 — Public repository contains production database dumps (SEC-001)

- `backend/db-backups/hrms_prod_dump_2026-08-15.sql` (212,327 bytes) is tracked by Git.
- `mariadb/full_dump.sql` (470,988 bytes) and `mariadb/full_dump_fixed.sql` (235,116 bytes) are also tracked.
- The dump contains `INSERT INTO Employee`, `Payslip`, `SalaryStructure`, `TaxDeclaration`, `EmployeePaymentInfo`, `RefreshToken` and `User`, including password hashes and MFA secrets.
- GitHub API confirms the repository `lordsandkings85-ship-it/hrms` has `"private": false`, `"visibility": "public"`.

**Impact:** irreversible PII and credential exposure. Treat every account and database secret as compromised.

### P0-2 — Published default credentials and plaintext credential scripts (SEC-002)

- `HOSTINGER.md` contains a table of working default passwords for the super-admin, HR manager and an employee (values redacted in this report).
- `backend/update_admin.js`, `backend/create-hr.js`, `backend/check_user.js` and `backend/seed_remote.js` contain plaintext passwords and create/modify privileged accounts.
- `seed_remote.js` creates/updates `admin@acme.com`, which `group-access.util.ts:24` also hardcodes as group-wide.

**Impact:** if any password was not rotated after setup, the public repository hands an attacker super-admin access.

### P0-3 — Cross-tenant privilege is granted by substring and hardcoded email (SEC-003)

`backend/src/utils/group-access.util.ts:20-37` returns `true` for:

- `isSuperAdmin`
- three hardcoded email addresses
- **any role where `role.isSystem` is true**
- **any role whose lowercased name contains `admin`, `group`, or `hr admin`**
- any role holding a view grant on `employees`, `attendance`, `leave`, `payroll`, etc.

Every tenant is likely to have an “HR Admin” role. `CompanyScopeGuard:24` short-circuits all tenant checks for these users. The result is cross-tenant read/write of employee, payroll, document and leave data.

### P0-4 — `GET /companies/:id/employees` has no access check (SEC-004)

`companies.controller.ts:32-35` has no `@Permissions` decorator. `PermissionsGuard` returns `true` when no decorator is present (`permissions.guard.ts:55`). `companies.service.ts:301-311` then queries by the path `id` without verifying that the caller can access that company. Any authenticated user can enumerate any tenant’s employees.

### P0-5 — `GET /group/employees` returns every employee in every tenant (SEC-005)

`companies.controller.ts:38-41` again has no permission decorator. `companies.service.ts:316-326` builds the query with **no `where` clause at all** and returns all employees across all companies.

### P0-6 — `GET /documents/all` returns every document in the system (SEC-006)

`documents.controller.ts:15` exposes `listAll()` with no `@Permissions` decorator and no company scope. `documents.service.ts:14-16` is `employeeDocument.findMany({ orderBy: ... })` with no `where`. The `CompanyScopeGuard` on the controller cannot help because the request has no `employeeId` or record `id` to check. Any authenticated employee can list every document record in every tenant.

---

## 5. High-severity themes (P1)

### 5.1 Tenant isolation is per-endpoint and inconsistent

Only **17 of 36 controllers** use `CompanyScopeGuard`, and only **26 of 36** use `PermissionsGuard`. Several sensitive modules rely on the service layer doing the right thing:

- `leave.controller.ts` has **no** `CompanyScopeGuard`; `leave.service.ts:68-77`, `:653-660`, `:830-841`, `:1119-1125` fall back to an unscoped `findUnique` when the company-scoped lookup fails. A caller can read/adjust another tenant’s balances by passing a foreign `employeeId`.
- `projects.controller.ts` has only `JwtAuthGuard`; `POST /projects/:id/tasks` and `POST /projects/tasks/:taskId/status` accept any project/task id.
- `announcements.service.ts:9-33` loads **all companies** and queries announcements with `companyId: { in: allCompanyIds }`, even though `groupWide` is computed and then ignored.

### 5.2 Default-allow permission guard

`permissions.guard.ts:55` returns `true` when a handler has no `@Permissions` metadata. This converts “forgot the decorator” into “any logged-in user is authorized”. Combined with 35/36 controllers using `JwtAuthGuard`, every undecorated route is authenticated-only. This is the root cause of SEC-004/005/006 and several P2 findings.

### 5.3 Device security is client-controlled

`security.service.ts:90-108` builds the device context from the request body first, then the `X-Device-Context` header, then individual headers. Every value (`platform`, `arch`, `osVersion`, `isVirtualMachine`, `signals`) is supplied by the client. The server-side “Windows 10/11 only” enforcement can be bypassed by sending a different header. This is a P1 because the release documentation presents it as a server-side control.

### 5.4 Payroll and tax correctness

| Issue | Evidence | Impact |
|---|---|---|
| Old-regime deductions never supplied | `payroll.service.ts:386-394` builds `TaxInput` without `rentPaid`, `cityType`, `section80C`, `section80D`, `homeLoanInterest` | Old-regime employees are over-taxed; HRA/80C/80D/24(b) always zero |
| 87A rebate is a cliff | `tax.calculator.ts:116-117` sets `baseTax = 0` at ≤ ₹12L, then taxes the full slab above it | Marginal relief missing; a ₹1 income increase can cost tens of thousands |
| Old-regime surcharge capped at 25% | `tax.calculator.ts:120-125` applies the same 25% cap to both regimes | Above ₹5 Cr, old-regime surcharge should be 37% |
| Future-dated revision applied early | `payroll.service.ts:143` takes `salaryStructures[0]` ordered by `effectiveFrom desc` with no `<= monthEnd` filter | A revision effective next month changes this month’s pay |
| Mid-month joiners pay LOP for pre-joining days | `payroll.service.ts:287-333` counts full-month working days but only actual attendance as paid | Underpayment of new joiners |
| Overnight shifts have same-day end | `attendance.service.ts:147-148` builds `shiftEnd` from the same calendar date | Night shift required minutes/OT/late are wrong |
| Attendance date key uses server timezone | `attendance.service.ts:189-190` uses `new Date()` local server date | Employees in other company timezones get wrong day rows |

### 5.5 Leave rule engine is mostly metadata

`LeaveType` stores `maxConsecutiveDays`, `halfDayAllowed`, `carryForward`, `carryForwardLimit`, `encashment`, `attachmentRequired`, `applicableAfterDays`, `gender` and `approvalRequired` (`schema.prisma:685-711`). A repository-wide search finds **no enforcement** for overlap, `maxConsecutiveDays`, `applicableAfterDays`, `gender`, `attachmentRequired` or `halfDayAllowed`. `isHalfDayCount` returns `0.5` for any half-day request regardless of range (`leave.service.ts:1399-1400`).

### 5.6 Frontend core flows are broken

- `LoginPage.tsx:20` calls `logout()` on every mount, wiping a valid session when the login page is revisited.
- `client.ts:17-19` reads `activeCompanyId` from `localStorage` on every request; `switchCompany` exists but has **zero call sites**. Users with multiple companies send a stale or absent company id.
- `LeaveSections.tsx:115-119` and `:697-701` call `fetch('/api/v1/employees?...')` directly and then read `json.data.items`. In the packaged app this resolves to `file:///C:/api/v1/...`; on Vercel the rewrite returns HTML. The employee dropdown is broken in both deployments.
- `client.ts:577` calls `GET /leave/monthly-allocation`, but the backend handler is `@Post` (`leave.controller.ts:248`). The action always fails with 404/405.
- Employee login-management buttons are rendered for non-super-admins (`EmployeesPage.tsx:157-160`, `:585-615`) while the backend guards them with `SuperAdminGuard`, producing 403s.

### 5.7 Desktop and release

- Installers are unsigned on Windows and macOS (`desktop/package.json:60-70`, `:84-111`, `CSC_IDENTITY_AUTO_DISCOVERY: false`).
- Auto-update verifies SHA-512 but not the publisher; there is no `win.publisherName` (`updater.ts:22-34`).
- `desktop-release.yml:98` publishes if **either** platform succeeds, and `:119` falls back to hardcoded tag `v3.1.1` on `workflow_dispatch`, risking asset overwrite.
- `platform-guard.ts` allows macOS despite Windows-only copy, and fails open on unparseable Windows version.
- `render.yaml` never runs `prisma migrate deploy`; a fresh deploy starts against an unmigrated schema.
- The packaged renderer may send `Origin: null` for `file://` requests, which the backend CORS allow-list does not accept (SUSPECTED, needs a packaged smoke test).

---

## 6. What is actually good

Credit where due — these controls are real and should not be regressed:

- Electron baseline: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `webviewTag: false` (`main.ts:71-80`).
- Navigation and `window.open` restrictions, external links opened in the system browser (`security.ts:70-97`).
- IPC sender validation and payload length limits (`ipc.ts`, `ipc-guard.ts`).
- Backend fails fast when `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` or `ENCRYPTION_KEY` are missing (`main.ts:8-19`).
- `helmet()`, an explicit CORS allow-list (no `*`), and a global `ValidationPipe` with `whitelist: true` (`main.ts:32-88`).
- Refresh-token rotation with hashed tokens and session revocation are implemented.
- PII encryption uses AES-256-GCM with a fresh nonce, plus legacy CBC read support (`crypto.util.ts`).
- Backend test suite: **19 suites / 292 tests pass**; backend and frontend TypeScript builds pass.
- `CompanyScopeGuard` does real record-level checks for 17 controllers, including a single parameterised raw-SQL union across 28 tables (table names are hardcoded, values are parameterised).
- Version numbers are consistent at `3.1.1` across backend, frontend, desktop and lockfiles.

---

## 7. Production-readiness verdict

| Gate | Status | Reason |
|---|---|---|
| Data confidentiality | **FAIL** | Public dumps + cross-tenant endpoints |
| Credential hygiene | **FAIL** | Published default passwords, hardcoded privileged emails |
| Tenant isolation | **FAIL** | 6 P0/P1 cross-tenant paths; guard coverage 17/36 |
| Statutory payroll correctness | **FAIL** | Old-regime deductions, 87A, surcharge, proration |
| Attendance correctness | **FAIL** | Overnight shifts, timezone date keys |
| Desktop integrity | **FAIL** | Unsigned build, no publisher verification, partial-release workflow |
| Deployment reproducibility | **FAIL** | No `migrate deploy`; Compose provisions PostgreSQL while schema is MySQL |
| Secret management | **FAIL** | Dumps and passwords in a public repo |
| Build/test health | **PASS (with gaps)** | Builds and backend tests pass; no frontend/desktop/E2E tests |
| Observability | **PARTIAL** | Logging exists; no health/readiness/metrics endpoint |

**Verdict: do not distribute or operate this build for real employee data until P0-1, P0-2 and the tenant-isolation P0s are remediated and all exposed credentials are rotated.**

---

## 8. Required immediate actions (next 24–72 hours)

These are ordered by risk reduction per hour of effort, not by code difficulty:

1. **Make the repository private immediately.** Then purge the dumps and credential files from Git history.
2. **Rotate every credential** that appears in the dumps/scripts: super-admin, HR, employee accounts, database password, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, SMTP credentials. Revoke all refresh tokens and sessions.
3. **Disable/remove `admin@acme.com`** and the hardcoded email bypass in `group-access.util.ts`.
4. **Fix the four unscoped endpoints** (`/companies/:id/employees`, `/group/employees`, `/documents/all`, plus the leave fallbacks) before any further multi-tenant use.
5. **Make `PermissionsGuard` default-deny** for non-public routes and add `CompanyScopeGuard` to leave, projects and announcements.
6. **Stop shipping the desktop build** until it is signed, or publish it with an explicit “unsigned, verify checksum” warning and a correct release workflow.
7. **Fix payroll before the next pay run:** pass old-regime declarations, filter salary structures by period end, implement marginal relief, and prorate joiners/leavers.

Detailed remediation, dependencies and sequencing are in `11-PRIORITIZED-FIX-ROADMAP.md`.

---

## 9. Report index

| File | Contents |
|---|---|
| `00-EXECUTIVE-SUMMARY.md` | This document |
| `01-COMPLETE-BUG-REPORT.md` | All 138 findings, deduplicated, with evidence and remediation |
| `02-SECURITY-AUDIT.md` | Auth, RBAC, tenant isolation, secrets, device controls |
| `03-FRONTEND-AUDIT.md` | Routing, state, API client, UX, accessibility, bundle |
| `04-BACKEND-API-AUDIT.md` | Controller/service contracts, validation, pagination, errors |
| `05-DATABASE-AUDIT.md` | Schema, constraints, indexes, cascades, migrations |
| `06-HRMS-BUSINESS-LOGIC-AUDIT.md` | Attendance, leave, payroll, tax, FnF rule correctness |
| `07-ELECTRON-DESKTOP-AUDIT.md` | Electron hardening, packaging, updater, release |
| `08-PERFORMANCE-AUDIT.md` | Query patterns, bundle size, caching, indexes |
| `09-MISSING-FEATURES.md` | Capabilities expected of an HRMS but absent or partial |
| `10-TEST-EXECUTION-REPORT.md` | Commands run, results, coverage gaps, NOT TESTED register |
| `11-PRIORITIZED-FIX-ROADMAP.md` | Phased remediation with dependencies and acceptance criteria |
| `12-FULL-ISSUE-INVENTORY.json` | Machine-readable inventory of every finding |

---

## 10. Method and limitations

- Every P0 and P1 claim was verified by reading the cited file and line range.
- Subagent findings were treated as leads and re-verified before inclusion.
- Where a claim depends on runtime behaviour that could not be safely executed (installer, `file://` CORS, real migration state), it is marked **SUSPECTED** or **NOT TESTED** rather than asserted.
- Business-rule disagreements (for example, whether 90 days is the correct notice period) are separated from implementation defects in `06-HRMS-BUSINESS-LOGIC-AUDIT.md`.
- No secret value is reproduced in any report. File paths and line numbers are given so an authorised engineer can inspect them directly.
- Only build outputs (`backend/dist`, `frontend/dist`) were produced by permitted verification commands. No source, config, database or production state was modified.
