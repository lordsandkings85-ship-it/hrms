# Workora HRMS — Complete Bug Report

**Audit commit:** `8473ca0`  
**Date:** 2026-11-04  
**Scope:** all findings, deduplicated across security, API, frontend, business logic, database, desktop, performance and missing features.  
**Companion data:** `12-FULL-ISSUE-INVENTORY.json` (machine-readable, canonical IDs).

---

## How to read this report

- **ID prefix** identifies the domain: `SEC` security, `API` backend contract, `FE` frontend, `BL` business logic, `DB` database, `DESK` desktop, `PERF` performance, `MF` missing feature.
- **Severity:** P0 critical, P1 high, P2 medium, P3 low, P4 informational.
- **Confidence:** `CONFIRMED` = directly observed in source or an executed command; `SUSPECTED` = plausible but runtime-dependent; `NOT TESTED` = could not be verified safely; `NOT APPLICABLE` = checked and not an issue in this stack.
- **Location** uses `path:line` relative to the repository root. Line numbers are from commit `8473ca0`.
- Where two domains describe the same root cause, one canonical ID is kept and the other is listed as a cross-reference (`dupOf` in JSON). Cross-references do not inflate the counts.
- **No secret values are reproduced.** Where a file contains a credential, only the file and line are cited.

---

## 1. Master finding table

### 1.1 Security (23 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| SEC-001 | P0 | CONFIRMED | Public repo tracks production DB dumps with PII, payroll and credential material | `backend/db-backups/hrms_prod_dump_2026-08-15.sql`, `mariadb/full_dump.sql`, `mariadb/full_dump_fixed.sql` |
| SEC-002 | P0 | CONFIRMED | Published default passwords and plaintext credential scripts | `HOSTINGER.md:153-157`, `backend/update_admin.js:6-7`, `backend/create-hr.js:7-8`, `backend/check_user.js:5-9`, `backend/seed_remote.js:1` |
| SEC-003 | P0 | CONFIRMED | Group-wide privilege granted by role-name substring, system flag and hardcoded emails | `backend/src/utils/group-access.util.ts:20-37` |
| SEC-004 | P0 | CONFIRMED | `GET /companies/:id/employees` enumerates any tenant | `companies.controller.ts:32-35`, `companies.service.ts:301-311` |
| SEC-005 | P0 | CONFIRMED | `GET /group/employees` returns every employee in every tenant | `companies.controller.ts:38-41`, `companies.service.ts:316-326` |
| SEC-006 | P0 | CONFIRMED | `GET /documents/all` returns every document in every tenant | `documents.controller.ts:15`, `documents.service.ts:14-16` |
| SEC-007 | P1 | CONFIRMED | Leave apply/balance/monthly-balance fall back to unscoped employee lookups | `leave.service.ts:68-77`, `:653-660`, `:830-841`, `:1119-1125` |
| SEC-008 | P1 | CONFIRMED | Project/task writes have no tenant or permission check | `projects.controller.ts:10-13`, `projects.service.ts:13-18` |
| SEC-009 | P1 | CONFIRMED | Announcements list queries all companies regardless of tenant | `announcements.service.ts:9-33` |
| SEC-010 | P1 | CONFIRMED | `assign-employees` moves arbitrary employee ids across tenants | `companies.controller.ts:43-52`, `companies.service.ts:331-369` |
| SEC-011 | P1 | CONFIRMED | `PermissionsGuard` defaults to allow when no decorator is present | `permissions.guard.ts:55` |
| SEC-012 | P1 | CONFIRMED | Device enforcement uses entirely client-supplied context | `security.service.ts:90-108`, `main.ts:64-77` |
| SEC-013 | P2 | CONFIRMED | Access and refresh tokens stored in `localStorage` | `client.ts:13-15`, `LoginPage.tsx:33-34`, `useAuthStore.ts:83-84` |
| SEC-014 | P1 | CONFIRMED | No logout/revocation endpoint; 7-day refresh tokens remain valid | `auth.controller.ts:11-45`, `auth.service.ts`, `render.yaml:22-23` |
| SEC-015 | P1 | CONFIRMED | Generated employee password is the lowercased employee code | `employees.service.ts:37` |
| SEC-016 | P2 | CONFIRMED | Hardcoded privileged email addresses in authorization code | `group-access.util.ts:22-24` |
| SEC-017 | P2 | CONFIRMED | CORS falls back to trusting every `*.vercel.app` and `*.onrender.com` origin | `main.ts:36-48` |
| SEC-018 | P2 | CONFIRMED | MFA can only be enabled; no verify, disable, or recovery flow | `auth.controller.ts:35-39` |
| SEC-019 | P2 | CONFIRMED | Document upload accepts a client-supplied `fileUrl` with no type/size validation | `documents.service.ts:8-10` |
| SEC-020 | P2 | CONFIRMED | Any same-tenant user can e-sign a document as another employee | `documents.controller.ts:17-25`, `documents.service.ts:18-37` |
| SEC-021 | P2 | SUSPECTED | Bulk PII reads (`/employees`, `/documents/all`, group endpoints) write no audit record | `audit-log` usage limited to mutation paths |
| SEC-022 | P3 | CONFIRMED | `decrypt()` returns ciphertext silently on GCM auth failure | `crypto.util.ts:65-72` |
| SEC-023 | P3 | CONFIRMED | No secret-scanning/pre-commit guard for dumps, `.env` or credential scripts | `.gitignore`, `.github/workflows/ci.yml` |

### 1.2 Backend API (14 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| API-001 | P1 | CONFIRMED | Tenant scoping is per-endpoint; only 17/36 controllers use `CompanyScopeGuard` | repository-wide |
| API-002 | P2 | CONFIRMED | No health/readiness endpoint | `app.module.ts`, `main.ts` |
| API-003 | P2 | CONFIRMED | No OpenAPI/Swagger documentation for 367 endpoints | `main.ts`, `package.json` |
| API-004 | P2 | CONFIRMED | Inline object/`any` bodies bypass `class-validator` | `leave.controller.ts:54-60`, `companies.controller.ts:64-66`, many others |
| API-005 | P2 | CONFIRMED | `@Body('primitive')` endpoints bypass validation entirely | `companies.controller.ts:89`, `:135`, `:151`; `projects.controller.ts:11-13` |
| API-006 | P2 | CONFIRMED | Global throttle 100/min; auth-specific limits exist but no per-account lockout | `app.module.ts:45-48`, `auth.controller.ts:16-33` |
| API-007 | P1 | CONFIRMED | Client calls `GET /leave/monthly-allocation`; backend is `@Post` | `client.ts:577`, `leave.controller.ts:248` |
| API-008 | P2 | CONFIRMED | Several list endpoints have no pagination or hard cap | `leave.service.ts:616-651`, `documents.service.ts:14-16`, `companies.service.ts:316-326` |
| API-009 | P2 | CONFIRMED | `settings/config` accepts untyped `unknown` values | `companies.controller.ts:149-159` |
| API-010 | P2 | CONFIRMED | Duplicate alias routes increase surface (`salary-structure` vs `structure`) | `payroll.controller.ts:20-30` |
| API-011 | P2 | CONFIRMED | No idempotency key for payroll run or monthly allocation | `payroll.controller.ts:32-35`, `leave.controller.ts:248-262` |
| API-012 | P2 | CONFIRMED | Error response shape is inconsistent (string vs object vs Nest default) | `permissions.guard.ts:194`, `security.service.ts:200-206` |
| API-013 | P3 | CONFIRMED | No deprecation/versioning policy beyond the `v1` prefix | `main.ts:80` |
| API-014 | P2 | CONFIRMED | No `enableShutdownHooks`; Prisma disconnect not wired to process signals | `main.ts:18-95` |

### 1.3 Frontend (17 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| FE-001 | P1 | CONFIRMED | Login page calls `logout()` on every mount | `LoginPage.tsx:20` |
| FE-002 | P1 | CONFIRMED | `activeCompanyId` read from stale storage; `switchCompany` has no call sites | `client.ts:17-19`, `useAuthStore.ts:61-87` |
| FE-003 | P1 | CONFIRMED | Leave screens use relative `/api/v1` fetch and wrong response shape | `LeaveSections.tsx:115-119`, `:697-701` |
| FE-004 | P1 | CONFIRMED | Monthly allocation uses GET against a POST endpoint | `client.ts:572-578` |
| FE-005 | P2 | CONFIRMED | Employee login-management UI is shown to non-super-admins | `EmployeesPage.tsx:157-160`, `:585-615` |
| FE-006 | P2 | CONFIRMED | Navigation permissions use role-name substrings, contradicting backend grants | `navigation/permissions.ts:33-47` |
| FE-007 | P2 | CONFIRMED | `role.isSystem` treated as super-admin in the frontend | `App.tsx:163` |
| FE-008 | P2 | CONFIRMED | Zero frontend automated tests; no test runner configured | `frontend/package.json:8-12` |
| FE-009 | P2 | CONFIRMED | 1,663 `any`/`as any` occurrences weaken type safety | repository-wide |
| FE-010 | P2 | CONFIRMED | Monolithic route components (1,726 / 1,462 / 1,216 / 779 lines) | `OrganizationPage.tsx`, `AdvancedEmployeeForm.tsx`, `Layout.tsx`, `LeaveSections.tsx` |
| FE-011 | P2 | CONFIRMED | `refetchOnMount: 'always'` plus window-focus refetch causes repeated list reloads | `queryClient` configuration |
| FE-012 | P2 | SUSPECTED | Multiple `catch` blocks swallow errors without user feedback | frontend pages |
| FE-013 | P2 | CONFIRMED | Vercel deployment has no CSP/HSTS/frame/referrer headers | `frontend/vercel.json:1-8` |
| FE-014 | P3 | CONFIRMED | No per-route error boundary (only one global boundary) | `App.tsx:395-399` |
| FE-015 | P3 | CONFIRMED | 13 production `console.*` calls | frontend source |
| FE-016 | P3 | SUSPECTED | Icon-only controls and modals lack focus management/ARIA labels | shared UI components |
| FE-017 | P4 | CONFIRMED | `CompanySelector` component is dead code | `components/**/CompanySelector.tsx` |

### 1.4 HRMS business logic (25 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| BL-001 | P1 | CONFIRMED | Overnight shift end time is built on the same calendar day | `attendance.service.ts:144-150` |
| BL-002 | P1 | CONFIRMED | Attendance date keys use server-local time, not company timezone | `attendance.service.ts:189-190` |
| BL-003 | P1 | CONFIRMED | Payroll applies the latest salary structure even if effective in the future | `payroll.service.ts:141-143` |
| BL-004 | P1 | CONFIRMED | Old-regime tax inputs omit rent, metro type, 80C, 80D and home-loan interest | `payroll.service.ts:386-394` |
| BL-005 | P1 | CONFIRMED | Section 87A rebate implemented as a cliff without marginal relief | `tax.calculator.ts:116-117` |
| BL-006 | P1 | CONFIRMED | Old-regime surcharge capped at 25% above ₹5 Cr (should be 37%) | `tax.calculator.ts:120-125` |
| BL-007 | P1 | CONFIRMED | Mid-month joiners/leavers pay LOP for pre-joining/post-exit days | `payroll.service.ts:287-333` |
| BL-008 | P1 | CONFIRMED | Leave overlap, max-consecutive, eligibility, gender, attachment and half-day flags are not enforced | `leave.service.ts` (apply path) |
| BL-009 | P1 | CONFIRMED | Any half-day request counts as 0.5 day regardless of date range | `leave.service.ts:1399-1400` |
| BL-010 | P1 | CONFIRMED | Holiday queries fall back to every company’s holidays when the tenant has none | `leave.service.ts:109-115`, `:639-645`, `:808-812`; `payroll.service.ts:260-261` |
| BL-011 | P2 | CONFIRMED | TDS is annual tax ÷ 12 with no YTD true-up or declaration projection | `tax.calculator.ts:131` |
| BL-012 | P2 | CONFIRMED | Professional tax is a fixed structure value; no state slabs | `payroll.service.ts:383` |
| BL-013 | P2 | SUSPECTED | Manual PF/ESI flags use inverted-looking semantics (`pfAsPerGovt === false` → manual) | `payroll.service.ts:375-382` |
| BL-014 | P2 | SUSPECTED | FnF gratuity/notice calculations are simplified and not configurable | `fnf.service.ts:8-60` |
| BL-015 | P2 | SUSPECTED | Carry-forward limit and encashment flags are not applied at year rollover | `leave.service.ts`, `leave-accrual.service.ts` |
| BL-016 | P2 | CONFIRMED | Comp-off is auto-credited for working a weekly off without an approval workflow | `attendance.service.ts:332-336` |
| BL-017 | P2 | CONFIRMED | Late-penalty fallback constant (6) is used when no policy exists | `payroll.service.ts:206-207`, `late-allowance.util.ts` |
| BL-018 | P2 | CONFIRMED | Probation/confirmation has no workflow; `probation` is free text | `schema.prisma:435`, `employees.service.ts` |
| BL-019 | P2 | CONFIRMED | Leave balances are deduplicated by type name, masking duplicate types | `leave.service.ts:668-678` |
| BL-020 | P2 | CONFIRMED | Payouts can be added after a cycle is locked, leaving payslips stale | `payroll.controller.ts:80-90`, `payroll.service.ts:103-111` |
| BL-021 | P3 | CONFIRMED | Updating a salary structure on an existing effective date writes a duplicate revision row | `payroll.service.ts:51-66` |
| BL-022 | P3 | CONFIRMED | Duplicate holidays on the same company/date are allowed and double-counted | `schema.prisma:597-605`, `leave.service.ts:816-820` |
| BL-023 | P3 | CONFIRMED | Leave day counting excludes Sundays but ignores Saturday weekly-off rules | `leave.service.ts:1418-1430` |
| BL-024 | P3 | CONFIRMED | `applicableAfterDays`, `gender`, `attachmentRequired`, `maxConsecutiveDays` are dead configuration | `schema.prisma:685-703` |
| BL-025 | P2 | CONFIRMED | Payroll `gross` excludes employer PF/ESI while employee CTC is divided by 12 | `employees.service.ts:73-74`, `payroll.service.ts:253-254` |

### 1.5 Database (17 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| DB-001 | P1 | CONFIRMED | Employee delete is a hard delete cascading across 58 relations | `employees.service.ts:354-362`, `schema.prisma` |
| DB-002 | P1 | CONFIRMED | `AttendanceLog` has no unique `(employeeId, date)` | `schema.prisma:76-108` |
| DB-003 | P1 | CONFIRMED | `Payslip` has no unique `(employeeId, payrollCycleId)` | `schema.prisma:734-750` |
| DB-004 | P1 | CONFIRMED | `PermissionRequest` has no unique key for `(employeeId, date, fromTime)` | `schema.prisma:127-146` |
| DB-005 | P1 | CONFIRMED | `Holiday` has no unique `(companyId, date)` | `schema.prisma:597-605` |
| DB-006 | P1 | CONFIRMED | `SalaryStructure` has no unique `(employeeId, effectiveFrom)` and no `companyId` | `schema.prisma:908-923` |
| DB-007 | P2 | CONFIRMED | Money and leave balances use `Float` instead of `Decimal` | `schema.prisma:174-205`, `:691-702` |
| DB-008 | P2 | CONFIRMED | `User.email` is globally unique, preventing the same email in two tenants | `schema.prisma:1036` |
| DB-009 | P2 | CONFIRMED | `Role` has no unique `(companyId, name)` | `schema.prisma:897-906` |
| DB-010 | P2 | CONFIRMED | No soft-delete/retention columns on core HR entities | `schema.prisma` |
| DB-011 | P2 | CONFIRMED | Status fields are free-form strings with no check constraints | `schema.prisma` (status columns) |
| DB-012 | P2 | CONFIRMED | Prisma schema is valid but fails `prisma format --check` | `prisma/schema.prisma` |
| DB-013 | P2 | CONFIRMED | `docker-compose.yml` provisions PostgreSQL while Prisma uses MySQL | `docker-compose.yml:3-13`, `schema.prisma:6` |
| DB-014 | P2 | CONFIRMED | Render deploy never runs `prisma migrate deploy` | `render.yaml:7-8` |
| DB-015 | P3 | CONFIRMED | `Json` columns (`breakdown`, `companySnapshot`, `metadata`) are unvalidated | `schema.prisma:742-743` |
| DB-016 | P3 | CONFIRMED | Cascading deletes bypass application-level retention/business rules | `schema.prisma` (`onDelete: Cascade`) |
| DB-017 | P2 | NOT TESTED | Live migration history vs schema drift could not be verified | `prisma/migrations/*` |

### 1.6 Desktop and release (18 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| DESK-001 | P1 | CONFIRMED | Platform guard accepts macOS despite Windows-only product copy | `platform-guard.ts:100-114`, `:7-8` |
| DESK-002 | P1 | CONFIRMED | Unparseable Windows version fails open (`supported: true`) | `platform-guard.ts:23-45`, `:100-114` |
| DESK-003 | P1 | CONFIRMED | Windows and macOS builds are unsigned | `desktop/package.json:60-111`, `desktop-release.yml:38`, `:78-82` |
| DESK-004 | P1 | CONFIRMED | Updater verifies SHA-512 but not publisher/signature | `updater.ts:22-34` |
| DESK-005 | P2 | CONFIRMED | No `win.publisherName` configured | `desktop/package.json:60-70` |
| DESK-006 | P1 | CONFIRMED | Release publishes if either platform succeeds; manual runs fall back to `v3.1.1` | `desktop-release.yml:98`, `:119` |
| DESK-007 | P2 | CONFIRMED | Renderer overwrites the main-process device id with a `localStorage` UUID | `frontend/src/utils/deviceContext.ts:104-117` |
| DESK-008 | P2 | CONFIRMED | IPC sender guard accepts any `file://` URL | `ipc-guard.ts:13-15` |
| DESK-009 | P2 | CONFIRMED | No load-failure or renderer-crash handling; splash can hang | `main.ts:83-95`, `:140-145` |
| DESK-010 | P2 | CONFIRMED | macOS in-app update cannot work (`latest-mac.yml` absent, unsigned) | `desktop/package.json:108-111`, `updater.ts:124-131` |
| DESK-011 | P2 | SUSPECTED | CSP may not apply to `file://`; no meta fallback | `security.ts:37-56`, `index.html` |
| DESK-012 | P1 | SUSPECTED | Packaged renderer may send `Origin: null`, rejected by backend CORS | `main.ts:50-61`, `client.ts:137-146` |
| DESK-013 | P2 | CONFIRMED | In-process cron on Render free plan sleeps with the service | `render.yaml:5`, `app.module.ts:44` |
| DESK-014 | P2 | CONFIRMED | Blocking OS probes run before the splash is shown | `main.ts:172-191`, `environment-risk.ts:74-158` |
| DESK-015 | P2 | CONFIRMED | No desktop CI job; tracked `out/*.js` is stale | `.github/workflows/ci.yml:8-43`, `desktop/out/main/main.js` |
| DESK-016 | P3 | CONFIRMED | `copy:renderer` merges into an existing directory, shipping stale bundles | `desktop/package.json:13-14` |
| DESK-017 | P3 | CONFIRMED | Electron 33 is end-of-life | `desktop/package.json:32`, `package-lock.json` |
| DESK-018 | P4 | CONFIRMED | “Report Issue” links to the wrong GitHub organization | `menu.ts:109-112` |

### 1.7 Performance (12 findings)

| ID | Sev | Conf | Title | Location |
|---|---|---|---|---|
| PERF-001 | P1 | CONFIRMED | Payroll runs serial per-employee queries inside one interactive transaction | `payroll.service.ts:247-470` |
| PERF-002 | P1 | CONFIRMED | ExcelJS 938 kB and jsPDF 357 kB are in the main bundle | production build output |
| PERF-003 | P1 | CONFIRMED | `refetchOnMount: 'always'` + focus refetch reloads lists repeatedly | query client config |
| PERF-004 | P2 | CONFIRMED | Unbounded list endpoints load entire tenants into memory | `leave.service.ts:616-651`, `companies.service.ts:316-326` |
| PERF-005 | P2 | CONFIRMED | No composite index for attendance date-range queries per tenant | `schema.prisma:107-108` |
| PERF-006 | P2 | CONFIRMED | `isGroupWideUser` performs a user+role+permission query on nearly every request | `group-access.util.ts:9-18` |
| PERF-007 | P2 | CONFIRMED | Permission cache is per-process with 5-minute TTL and no invalidation | `permissions.guard.ts:12`, `:32-48` |
| PERF-008 | P2 | CONFIRMED | Recharts chunk is 421 kB and loaded for dashboard charts | build output |
| PERF-009 | P2 | CONFIRMED | Monolithic page components prevent effective route-level code splitting | `OrganizationPage.tsx` etc. |
| PERF-010 | P3 | CONFIRMED | Verbose `console.log` output in backend hot paths | `main.ts:92`, services |
| PERF-011 | P2 | CONFIRMED | Prisma queries return full rows including encrypted PII where `select` would do | multiple services |
| PERF-012 | P3 | SUSPECTED | No Prisma connection-pool sizing for a serverless/free-tier host | `prisma.service.ts`, `render.yaml` |

### 1.8 Missing features (12 unique findings)

| ID | Sev | Conf | Title | Note |
|---|---|---|---|---|
| MF-001 | P1 | CONFIRMED | No self-service password reset / forgot-password flow | Only admin reset exists |
| MF-002 | P1 | CONFIRMED | No E2E or packaged-app smoke tests | Backend unit tests only |
| MF-003 | P2 | CONFIRMED | MFA lifecycle incomplete (verify/disable/recovery) | Overlaps SEC-018 |
| MF-004 | P2 | CONFIRMED | No audit-log viewer for security/PII access | `AuditLog` model exists |
| MF-005 | P2 | SUSPECTED | Statutory returns (PF ECR, ESIC, 24Q, PT) not generated | Compliance masters exist |
| MF-006 | P2 | CONFIRMED | No bank/NEFT payout file export | Payroll computes net pay only |
| MF-007 | P2 | CONFIRMED | Email delivery has no queue/retry/observability | `MailService` direct send |
| MF-008 | P2 | CONFIRMED | No documented backup/restore/DR procedure | Ops docs absent |
| MF-009 | P2 | CONFIRMED | No account lockout/CAPTCHA after repeated failures | IP throttle only |
| MF-010 | P2 | CONFIRMED | No document virus/malware scanning | Client-supplied URLs |
| MF-011 | P3 | CONFIRMED | No i18n/localisation | English only |
| MF-012 | P3 | SUSPECTED | No accessibility conformance target or audit | Overlaps FE-016 |

---

## 2. P0 findings — full detail

### SEC-001 — Production database dumps are public

**Confidence:** CONFIRMED  
**Severity:** P0

**Evidence**

- `git ls-files` returns:
  - `backend/db-backups/hrms_prod_dump_2026-08-15.sql` — 212,327 bytes
  - `mariadb/full_dump.sql` — 470,988 bytes
  - `mariadb/full_dump_fixed.sql` — 235,116 bytes
- The dump header identifies a phpMyAdmin export of database `u593848004_hrms`, MariaDB 11.8.8, generated 2026-08-15.
- Table-level inspection (no row data reproduced) shows `INSERT INTO` statements for:
  `Employee`, `EmployeePaymentInfo`, `EmployeeAdminInfo`, `EmployeeContactInfo`, `Payslip`, `SalaryStructure`, `TaxDeclaration`, `RefreshToken`, `User`, `AuditLog`, `AttendanceLog`, `LeaveRequest`, `Expense`, `TravelRequest`.
- The `User` insert includes `passwordHash` and `mfaSecret` columns. The `RefreshToken` insert includes `tokenHash`.
- `GET https://api.github.com/repos/lordsandkings85-ship-it/hrms` returns `"private": false`, `"visibility": "public"`.

**Reproduction (read-only)**

```powershell
git ls-files | Select-String -Pattern 'dump|backup'
(Invoke-RestMethod https://api.github.com/repos/lordsandkings85-ship-it/hrms).visibility
```

**Impact**

Employee identity documents, bank details, salary and tax data, password hashes, MFA secrets and session-token hashes are downloadable by anyone. This is an irreversible disclosure: deleting the file now does not undo copies, forks, caches or clones. Credential material must be treated as compromised.

**Root cause**

No pre-commit secret scanning; database dumps produced in the repository root and committed; `.gitignore` does not cover `*.sql`, `db-backups/` or `mariadb/`.

**Remediation**

1. Make the repository private immediately (buys time; does not undo exposure).
2. Remove the files from the working tree **and all history** (e.g. `git filter-repo`), then force-push and invalidate forks.
3. Rotate every credential present in the dump: all user passwords, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, database password, SMTP credentials.
4. Revoke all `RefreshToken` and `UserSession` rows.
5. Add `gitleaks`/`trufflehog` plus a pre-commit hook blocking `*.sql`, `*.dump`, `db-backups/`, `.env*` (except `.env.example`).
6. Notify affected employees per applicable privacy law.

**Fix complexity:** High (history rewrite + coordinated rotation). **Verification:** NOT TESTED (no destructive operations performed).

---

### SEC-002 — Default credentials published in the repository

**Confidence:** CONFIRMED (presence); SUSPECTED (whether they remain valid)  
**Severity:** P0

**Evidence**

- `HOSTINGER.md:153-157` contains a “Default Credentials” table listing the super-admin, HR manager and an employee email with plaintext passwords. **Values intentionally redacted here.**
- `backend/update_admin.js:6-7` hardcodes the super-admin email and password.
- `backend/create-hr.js:7-8` hardcodes the HR email and password.
- `backend/check_user.js:5-9` compares a hardcoded password against the super-admin hash.
- `backend/seed_remote.js:1` hashes a literal password and creates `admin@acme.com` with `isSuperAdmin: true`.
- `group-access.util.ts:22-24` treats `admin@acme.com` as group-wide.

**Impact**

If any credential was not rotated, a reader of the public repo has direct super-admin or HR access. `admin@acme.com` is a potential permanent backdoor because it is privileged both in the seed script and in authorization code.

**Root cause**

Bootstrap/setup scripts committed with literal secrets; deployment documentation written with real values; no environment-driven bootstrap.

**Remediation**

1. Rotate all three accounts and disable `admin@acme.com`.
2. Delete the four scripts and `HOSTINGER.md` credentials from history.
3. Replace with a one-time bootstrap command that reads from environment variables, refuses to run when `NODE_ENV=production` unless an explicit flag is set, and forces a password change on first login.
4. Remove the hardcoded email bypass in `group-access.util.ts`.

**Fix complexity:** Medium. **Verification:** NOT TESTED (no login attempts made).

---

### SEC-003 — Group-wide privilege escalation

**Confidence:** CONFIRMED  
**Severity:** P0

**Evidence**

`backend/src/utils/group-access.util.ts`:

```ts
20:  if (user.isSuperAdmin) return true;
22:  if (
23:    user.email === '<redacted-1>@lordsandkings.co>' ||
24:    user.email === '<redacted-2>@lordsandkings.co>' ||
25:    user.email === 'admin@acme.com'
26:  ) return true;
28:  if (user.role?.isSystem) return true;
29:  const roleName = user.role?.name?.toLowerCase() || '';
30:  if (
31:    roleName.includes('super admin') ||
32:    roleName.includes('admin') ||
33:    roleName.includes('group') ||
34:    roleName.includes('hr admin')
35:  ) return true;
```

The function is called from `CompanyScopeGuard:24`, which then returns `true` before any company check, and from service methods such as `companies.service.ts`, `leave.service.ts`, `payroll.service.ts`, `attendance.service.ts`, `documents.service.ts` and `announcements.service.ts`.

**Reproduction (authorization reasoning, not executed against production)**

1. Create a role named `HR Admin` in tenant A.
2. Assign a user in tenant A that role.
3. Call `GET /group/employees` or `GET /companies/<tenant-B-id>/employees`.
4. The guard short-circuits and the service returns tenant B data.

**Impact**

Any tenant administrator can read and often mutate another tenant’s employees, salaries, attendance, leave and documents. This defeats the entire multi-tenant model.

**Root cause**

Authorization based on mutable display strings and an overloaded `isSystem` flag instead of an explicit capability.

**Remediation**

- Replace with an explicit `User.isGroupAdmin` boolean or an `organization:manage_all` permission checked against the database.
- Delete the email allow-list.
- Make `role.isSystem` mean “cannot be edited”, never “cross-tenant”.
- Add negative integration tests: a tenant admin must receive 403 for every other tenant’s resources.

**Fix complexity:** Medium. **Verification:** NOT TESTED end-to-end.

---

### SEC-004 — `GET /companies/:id/employees` cross-tenant dump

**Confidence:** CONFIRMED  
**Severity:** P0

**Evidence**

```ts
// companies.controller.ts:32-35
@Get('companies/:id/employees')
listCompanyEmployees(@CurrentUser() user: AuthUser, @Param('id') id: string) {
  return this.companiesService.listCompanyEmployees(user.userId, id);
}
```

There is no `@Permissions` decorator. `permissions.guard.ts:55` returns `true` when `required` is empty, so the endpoint is authenticated-only.

```ts
// companies.service.ts:301-311
async listCompanyEmployees(userId: string, companyId: string) {
  const groupWide = await isGroupWideUser(this.prisma, userId);
  const where = groupWide ? { companyId } : { companyId };
  return this.prisma.employee.findMany({ where, ... });
}
```

The `where` clause is identical in both branches — the caller’s own company is never consulted.

**Impact**

Any logged-in user can enumerate names, emails, codes and other returned fields for any company id.

**Remediation**

- Require `@Permissions({ module: 'organization', action: 'view' })`.
- Verify `companyId` is in `user.companyIds` unless the caller has a genuine group-admin capability.
- Return 404 rather than 403 for companies outside scope, to avoid tenant enumeration.

**Fix complexity:** Low.

---

### SEC-005 — `GET /group/employees` returns all employees

**Confidence:** CONFIRMED  
**Severity:** P0

**Evidence**

```ts
// companies.controller.ts:38-41
@Get('group/employees')
listAllGroupEmployees(@CurrentUser() user: AuthUser) {
  return this.companiesService.listAllGroupEmployees(user.userId);
}
```

```ts
// companies.service.ts:316-326
async listAllGroupEmployees(userId: string) {
  const groupWide = await isGroupWideUser(this.prisma, userId);
  return this.prisma.employee.findMany({
    where: { isSystem: false },
    include: { company: true, department: true },
  });
}
```

There is no company filter at all. `groupWide` is computed and never used.

**Impact**

Full employee directory of every tenant, including company and department, to any authenticated user.

**Remediation**

- Gate with an explicit group-admin permission.
- If the endpoint is only for group admins, remove it from the tenant-facing controller or return `403` for non-group users.
- Add a mandatory `companyId` filter for non-group callers.

**Fix complexity:** Low.

---

### SEC-006 — `GET /documents/all` leaks every document record

**Confidence:** CONFIRMED  
**Severity:** P0

**Evidence**

```ts
// documents.controller.ts:7-15
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('documents')
export class DocumentsController {
  @Get('all') listAll() { return this.service.listAll(); }
}

// documents.service.ts:14-16
listAll() {
  return this.prisma.employeeDocument.findMany({ orderBy: { uploadedAt: 'desc' } });
}
```

`CompanyScopeGuard` only inspects `employeeId`/record `id` values in the request. `/documents/all` has neither, so the guard passes. There is no `PermissionsGuard` on the controller.

**Impact**

Every document row in every tenant — employee id, type, `fileUrl`, signature state and hash — is readable by any authenticated user. If `fileUrl` points at publicly accessible storage, this is a direct document disclosure.

**Remediation**

- Add `@UseGuards(PermissionsGuard)` and `@Permissions({ module: 'documents', action: 'view' })`.
- Scope the query by `employee.companyId` for non-group admins.
- Prefer signed, short-lived download URLs rather than stored public URLs.

**Fix complexity:** Low.

---

## 3. P1 findings — detail

> P1 means release-blocking. Fix or explicitly accept risk before production.

### 3.1 SEC-007 — Leave cross-tenant fallbacks

`leave.controller.ts:9` uses `@UseGuards(JwtAuthGuard, PermissionsGuard)` but **not** `CompanyScopeGuard`. The service then does:

```ts
// leave.service.ts:653-660 (balances)
let employee = await this.prisma.employee.findFirst({
  where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
});
if (!employee) {
  employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
}
```

The same pattern appears at `:68-77` (apply), `:830-841` (adjust balance) and `:1119-1125` (monthly balances). The fallback exists to support group admins, but it runs for **every** caller because `groupWide` is only used in the first query.

**Impact:** a user in tenant A can read or adjust tenant B’s leave balance by supplying a foreign employee id; applying leave can create a request against a foreign employee.

**Remediation:** remove the fallback; if `groupWide` is false and the employee is not in `companyId`, throw `NotFoundException`. Add `CompanyScopeGuard` to the controller. Add tests for cross-tenant ids.

**Complexity:** Low.

---

### 3.2 SEC-008 — Project/task writes are unauthenticated by tenant

`projects.controller.ts` has only `JwtAuthGuard`. `POST /projects/:id/tasks` and `POST /projects/tasks/:taskId/status` pass ids straight to Prisma (`projects.service.ts:13-18`) with no company check and no permission check.

**Impact:** any authenticated user can add tasks to, or change the status of, any tenant’s project tasks.

**Remediation:** add `CompanyScopeGuard`; verify project ownership in the service; require `projects:edit`; validate `status` against an enum.

**Complexity:** Low.

---

### 3.3 SEC-009 — Announcements are cross-tenant

`announcements.service.ts:9-22` computes `groupWide` but then loads **all** company ids and queries `where: { companyId: { in: allCompanyIds }, isActive: true }`. `listAll` at `:24-33` does the same without even the `isActive` filter. `create` at `:56-70` clones a group-wide announcement into every company.

**Impact:** every employee reads every tenant’s announcements; a group-wide author writes into all tenants.

**Remediation:** use `groupWide ? {} : { companyId }`; require an explicit permission for broadcast creation.

**Complexity:** Low.

---

### 3.4 SEC-010 — Arbitrary cross-tenant reassignment

`companies.controller.ts:43-52` requires `organization:edit`, but `companies.service.ts:331-369` accepts arbitrary `employeeIds` and writes `companyId = target` without verifying that each employee currently belongs to a company the caller controls. A tenant admin with `organization:edit` can move another tenant’s employees into their own tenant (or out of it).

**Remediation:** load each employee, assert current `companyId` is in the caller’s allowed set, write an `EmployeeCompanyHistory` row in a transaction, and emit an audit log.

**Complexity:** Medium.

---

### 3.5 SEC-011 — Default-allow permission guard

`permissions.guard.ts:55`:

```ts
if (!required || required.length === 0) return true;
```

This is the single highest-leverage authorization defect. Any route that forgets `@Permissions` becomes “any authenticated user”. It directly causes SEC-004/005/006 and exposes `GET /settings/company`, `GET /settings/roles`, `GET /organization/*` and others to every employee.

**Remediation:** default-deny. Introduce `@Public()` for unauthenticated routes and require either `@Permissions` or an explicit `@SelfService`/`@AnyAuthenticated` marker. Fail closed at startup if a non-public handler has neither.

**Complexity:** Medium (requires touching many controllers). **Priority:** do this before adding more features.

---

### 3.6 SEC-012 — Device enforcement is spoofable

`security.service.ts:90-108` does:

```ts
return {
  ...decoded,
  ...device,                                   // request body wins
  platform: device?.platform ?? decoded.platform ?? header('x-client-platform'),
  arch: device?.arch ?? decoded.arch ?? header('x-client-arch'),
  osVersion: device?.osVersion ?? decoded.osVersion ?? header('x-os-version'),
  signals: device?.signals ?? decoded.signals ?? [],
  ...
};
```

The body `device` object is attacker-controlled. Even when the desktop client reports honestly, a scripted client can send `platform: 'win32', osVersion: '10.0.19045', isVirtualMachine: false` and pass the gate. The server has no attestation.

**Impact:** the server-side “Windows 10/11 x64 only” control is bypassable; the desktop gate is the only real barrier, and it also fails open (DESK-002).

**Remediation:** treat device context as a signal, not a control. If enforcement is required, use a signed device attestation (e.g. a server-issued device certificate bound to a TPM/keystore key) and validate the signature; otherwise document the control as advisory.

**Complexity:** High.

---

### 3.7 SEC-014 — No logout or user-initiated revocation

`auth.controller.ts` exposes `register`, `login`, `refresh`, `mfa/enable` and `me`. There is **no** `POST /auth/logout`. The client’s `logout()` only removes `localStorage` values. Refresh tokens are valid for 7 days (`render.yaml:22-23`) and are only invalidated if an admin revokes a session.

**Impact:** a stolen refresh token remains usable after the user “logs out”; users have no way to terminate other sessions after a suspected compromise.

**Remediation:** add `POST /auth/logout` that revokes the presented refresh token/session; add `POST /auth/logout-all`; shorten refresh lifetime or rotate on every use with reuse detection; expose an active-sessions UI.

**Complexity:** Low–Medium.

---

### 3.8 SEC-015 — Predictable initial passwords

`employees.service.ts:37`:

```ts
const generatedPassword = !password ? dto.employeeCode.toLowerCase() : undefined;
```

Employee codes are often sequential (`EMP001`). The initial password is therefore guessable, and there is no forced change on first login.

**Remediation:** generate a cryptographically random temporary password, store only a hash, deliver it out-of-band, and force a password change at first login.

**Complexity:** Low.

---

### 3.9 API-001 — Tenant scoping is not centralized

Only 17 of 36 controllers use `CompanyScopeGuard`; 26 use `PermissionsGuard`. The remaining controllers rely on each service remembering to filter. The P0/P1 findings above are all instances of this pattern. Fixing individual endpoints without fixing the pattern will leave new endpoints exposed.

**Remediation:** make `CompanyScopeGuard` global (with an opt-out for genuinely public routes), or add a Prisma middleware/extension that injects `companyId` for tenant-scoped models. Add an architecture test that enumerates controllers and fails if a tenant-scoped route lacks both guards.

**Complexity:** High.

---

### 3.10 API-007 / FE-004 — Monthly allocation cannot be triggered

Client (`client.ts:572-578`):

```ts
return api<any>(`/leave/monthly-allocation?${qs.toString()}`);   // no method → GET
```

Server (`leave.controller.ts:248`):

```ts
@Post('monthly-allocation')
```

The request hits no handler and fails. The admin “run allocation” action is broken in both web and desktop.

**Remediation:** add `{ method: 'POST' }` to the client (and add a contract test that asserts method + path).

**Complexity:** Low.

---

### 3.11 FE-001 — Login page destroys valid sessions

`LoginPage.tsx:20`:

```tsx
useEffect(() => { useAuthStore.getState().logout(); }, []);
```

Every visit to `/login` clears tokens. A user who is redirected to login (for example after a transient 401) loses their session even if the refresh token is still valid. It also makes “back to login” destructive.

**Remediation:** remove the effect; clear state only on an explicit logout action.

**Complexity:** Low.

---

### 3.12 FE-002 — Company context is stale

`client.ts:17-19` reads `activeCompanyId` from `localStorage` on every request. `useAuthStore.ts:61-87` defines `switchCompany`, but a repository-wide search finds **zero** call sites for it or for `CompanySelector`. After login, `activeCompanyId` may be absent (header omitted) or left over from a previous user on the same browser.

**Impact:** multi-company users see the wrong tenant’s data; after a user switch on a shared machine, requests can target the previous tenant until storage is cleared.

**Remediation:** populate `activeCompanyId` from the login/`me` response; call `switchCompany` from the selector; clear company state on logout; send the company id from the auth store rather than raw storage.

**Complexity:** Low–Medium.

---

### 3.13 FE-003 — Broken leave employee dropdowns

`LeaveSections.tsx:115-119` and `:697-701`:

```tsx
const res = await fetch('/api/v1/employees?page=1&pageSize=200', { headers: { Authorization: ... } });
const json = await res.json();
setEmployees(json.data.items || []);
```

Two defects:
1. Relative URL bypasses `API_BASE`; on desktop it resolves to `file:///C:/api/v1/...`, on Vercel the SPA rewrite returns `index.html`.
2. The API client returns `{ data, meta }` (or an array depending on endpoint), not `json.data.items`; the list stays empty.

**Impact:** admins cannot select an employee for balance allocation or transactions.

**Remediation:** use the shared `api()`/`employeesApi` client and the actual response shape; add a component test.

**Complexity:** Low.

---

### 3.14 FE-005 — UI offers actions the backend forbids

`EmployeesPage.tsx:157-160` and `:585-615` render “create login”, “reset password” and “toggle login” controls without checking `isSuperAdmin`. The backend guards these with `SuperAdminGuard` (`employees.controller.ts:83-117`), so non-super-admins get 403s.

**Remediation:** gate the controls behind the same capability the backend enforces; hide or disable with a tooltip explaining why.

**Complexity:** Low.

---

### 3.15 BL-001 — Overnight shifts

`attendance.service.ts:147-148`:

```ts
const shiftStart = zonedDateTime(tz, wall.y, wall.m, wall.d, sh, sm);
const shiftEnd = zonedDateTime(tz, wall.y, wall.m, wall.d, eh, em);
```

For a 22:00–06:00 shift, `shiftEnd` is 06:00 on the **same** day, i.e. before the start. `requiredMinutes` becomes negative, overtime and late calculations are wrong, and check-out may be treated as early.

**Remediation:** if `endTime <= startTime`, add one day to `shiftEnd`; add tests for 22:00–06:00 and 00:00–08:00.

**Complexity:** Low.

---

### 3.16 BL-002 — Timezone date keys

`attendance.service.ts:189-190` computes the attendance day with `new Date()` and `new Date(y, m, d)` in the **server’s** timezone, even though the company has a `timezone` field used elsewhere (`:142-148`). A 23:30 IST punch on a UTC server can land on the previous day.

**Remediation:** derive `startOfDay` from the company timezone using the existing `zonedWallClock` helper; store UTC instants plus a canonical `dateKey`.

**Complexity:** Medium.

---

### 3.17 BL-003 — Future salary revision applied early

`payroll.service.ts:141-143`:

```ts
salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
```

No `where: { effectiveFrom: { lte: monthEnd } }`. A revision dated next month is applied to this month’s payroll.

**Remediation:** filter to `effectiveFrom <= periodEnd` and add a regression test with a future-dated revision.

**Complexity:** Low.

---

### 3.18 BL-004 — Old-regime deductions missing

`payroll.service.ts:386-394` builds:

```ts
const taxInput: TaxInput = {
  basic, hra, da, conveyance, medical, specialAllowance, regime,
};
```

`rentPaid`, `cityType`, `section80C`, `section80D` and `homeLoanInterest` are never supplied. `computeIncomeTax` therefore computes HRA exemption 0, 80C 0, 80D 0 and home-loan 0 for every employee, even when `TaxDeclaration` rows exist in the database.

**Impact:** old-regime employees are systematically over-taxed; declared investments have no effect.

**Remediation:** load the employee’s `TaxDeclaration` rows for the financial year, map them to the `TaxInput`, and add golden tests for representative salaries.

**Complexity:** Medium.

---

### 3.19 BL-005 — 87A cliff

`tax.calculator.ts:116-117`:

```ts
// Rebate 87A (FY 2025-26): no tax for taxable income up to ₹12L in new regime
if (taxableIncome <= 1200000) baseTax = 0;
```

At ₹12,00,001 the full slab tax applies (₹60,000 + cess), so one extra rupee of income costs roughly ₹62,400. The statute provides marginal relief so tax cannot exceed income above the threshold. The old regime has the same cliff at ₹5L (`:93`).

**Remediation:** implement marginal relief: `tax = min(slabTax, taxableIncome - threshold)` above the threshold, then apply cess.

**Complexity:** Low.

---

### 3.20 BL-006 — Old-regime surcharge

`tax.calculator.ts:120-125` applies the same schedule to both regimes, capping at 25%. The old regime retains a 37% surcharge above ₹5 Cr. The new regime’s 25% cap is correct.

**Remediation:** branch on `regime`; add tests at ₹50L, ₹1Cr, ₹2Cr, ₹5Cr and ₹5.01Cr.

**Complexity:** Low.

---

### 3.21 BL-007 — Mid-month joiners and leavers

`payroll.service.ts:287-291` counts working days for the **whole month**. `paidDays` (`:326-331`) only includes days with an attendance log. An employee who joins on the 20th has no logs for the 1st–19th, so those days become LOP and the first salary is short by roughly two-thirds.

**Remediation:** clip the working-day window to `max(monthStart, joiningDate)` and `min(monthEnd, lastWorkingDay)`; compute per-day salary on the clipped window.

**Complexity:** Medium.

---

### 3.22 BL-008 — Leave rule engine is metadata only

A search across `backend/src/modules/hr/leave/*.ts` for `maxConsecutiveDays`, `applicableAfterDays`, `halfDayAllowed`, `attachmentRequired`, `gender` and overlap checks finds only CRUD persistence (`leave.service.ts:32-55`). The apply path (`:68-200`) validates balance and monthly ledger but not:

- overlapping approved/pending requests,
- maximum consecutive days,
- eligibility after N days of service,
- gender restriction,
- mandatory attachment,
- half-day allowance.

**Impact:** policy configuration in the UI has no effect; employees can book overlapping or ineligible leave.

**Remediation:** implement a `validateLeaveRequest` rule pipeline with one function per flag and unit tests per rule; reject with specific error codes.

**Complexity:** Medium–High.

---

### 3.23 BL-009 — Half-day always 0.5

`leave.service.ts:1399-1400`:

```ts
function isHalfDayCount(start, end, isHalfDay, holidays) {
  if (isHalfDay) return 0.5;
```

A request marked half-day from Monday to Friday returns 0.5 instead of 2.5. The `isHalfDay` flag should be valid only for a single date.

**Remediation:** reject multi-day half-day requests, or count 0.5 per date in range.

**Complexity:** Low.

---

### 3.24 BL-010 — Holiday fallback contaminates working days

When a company has no holidays, the code loads **all** holidays from every company:

```ts
// leave.service.ts:113-115
if (holidays.length === 0 && !groupWide) {
  holidays = await this.prisma.holiday.findMany({ select: { date: true } });
}
```

Same at `:643-645`, `:808-812`, `payroll.service.ts:260-261` and `:572-574`. Holidays belonging to other tenants are then treated as non-working days, inflating paid days and reducing LOP.

**Remediation:** remove the global fallback. If a tenant has no calendar, treat only weekends as non-working; surface a configuration warning.

**Complexity:** Low.

---

### 3.25 DB-001 — Hard delete destroys statutory history

`employees.service.ts:354-362`:

```ts
async remove(companyId, userId, id) {
  ...
  return this.prisma.$transaction([
    this.prisma.employee.delete({ where: { id } }),
    ...
  ]);
}
```

`Employee` has 58 cascading relations (`onDelete: Cascade`), including `AttendanceLog`, `Payslip`, `LeaveRequest`, `SalaryStructure`, `TaxDeclaration` and `EmployeeDocument`. Deleting an employee erases payroll and attendance history that may be legally required to be retained.

**Impact:** irreversible loss of statutory records; audit trail destroyed; payroll reconciliation impossible.

**Remediation:** replace with soft delete (`status: 'terminated'`, `deletedAt`) or archive; restrict hard delete to a super-admin maintenance path with a retention check; add `onDelete: Restrict` for payroll/attendance.

**Complexity:** Medium–High (requires migration and UI changes).

---

### 3.26 DESK-001/002 — Platform gate does not match the product claim

`platform-guard.ts` returns `supported: true` for macOS (`:100-114`) and for Windows when `osVersion` cannot be parsed, while the dialog copy (`:7-8`) says Windows 10/11 only.

**Impact:** unsupported platforms are admitted; a malformed or spoofed version string bypasses the version check.

**Remediation:** decide the real supported matrix, then make the guard fail closed on parse failure and reject platforms outside the matrix. Keep the copy and the matrix in one constant.

**Complexity:** Low.

---

### 3.27 DESK-003/004/006 — Release integrity

- Windows and macOS artifacts are unsigned; `CSC_IDENTITY_AUTO_DISCOVERY: false`.
- The updater verifies the SHA-512 in `latest.yml`, but `latest.yml` is an unsigned GitHub asset and there is no `win.publisherName`.
- The publish job runs if either platform build succeeds and falls back to `v3.1.1` on manual dispatch.

**Impact:** SmartScreen/Gatekeeper warnings; a compromised release can deliver an unsigned binary; partial releases leave one platform without assets; manual runs can overwrite a released version.

**Remediation:** buy/configure code-signing certificates, notarize macOS, set `win.publisherName`, require both build jobs, derive the tag from `package.json`, and add a release concurrency lock.

**Complexity:** High (procurement + CI).

---

### 3.28 DESK-012 — `Origin: null` CORS risk

**Confidence:** SUSPECTED (needs a packaged smoke test).

A `file://` document sends `Origin: null` on cross-origin `fetch`. The backend only special-cases a **missing** origin:

```ts
if (!origin) return callback(null, true);
```

If Render’s `CORS_ORIGINS` does not include `null`, every packaged request is rejected. This would make the desktop build unusable.

**Remediation:** run a packaged smoke test and capture the Origin. Prefer serving the renderer through a custom `app://` protocol with a stable origin; otherwise allow `null` only for the desktop user agent, narrowly.

**Complexity:** Medium.

---

### 3.29 PERF-001 — Payroll transaction loop

`payroll.service.ts:247-470` opens an interactive transaction and loops over every employee, issuing `payslip.findFirst`, then `update` or `create`, plus `additionalPayout` lookups done in bulk earlier. For 500 employees this is >1,000 round-trips inside one transaction, holding locks and risking timeout.

**Remediation:** precompute all rows in memory, use `createMany`/`upsert` batches, and move email/notification work outside the transaction. Add a 500-employee benchmark.

**Complexity:** Medium.

---

### 3.30 PERF-002/003 — Bundle and refetch

- Build output: `exceljs` 938.27 kB, charts 421 kB, `jspdf` 357 kB, `PayslipPreviewModal` 340 kB, main `index` 227 kB.
- Query client uses `refetchOnMount: 'always'` and `refetchOnWindowFocus`, so every tab switch reloads lists.

**Remediation:** dynamic-import Excel/PDF libraries only on export; lazy-load chart routes; set `staleTime` and disable `refetchOnMount: 'always'`.

**Complexity:** Low–Medium.

---

### 3.31 MF-001/002 — Missing password reset and E2E tests

There is no forgot-password flow (`auth.controller.ts` has no reset route). There is also no frontend test runner and no E2E/packaged smoke test. These are P1 because they block safe operation and safe release respectively.

**Remediation:** add a token-based reset flow with single-use, short-lived tokens and rate limiting; add Playwright for web and a packaged smoke script that logs in, fetches a list and checks the updater manifest.

**Complexity:** Medium.

---

## 4. P2 findings — consolidated

| ID | Finding | Why it matters | Fix |
|---|---|---|---|
| SEC-013 | Tokens in `localStorage` | Any XSS/dependency compromise steals a 7-day refresh token | Move refresh token to OS secure storage (desktop) / httpOnly cookie (web); keep access token in memory |
| SEC-016 | Hardcoded privileged emails | Permanent bypass that survives role changes | Remove; use explicit capability |
| SEC-017 | CORS trusts all `*.vercel.app`/`*.onrender.com` by default | Any attacker-controlled deployment on those domains is trusted | Require `CORS_ORIGINS` in production; fail boot if unset |
| SEC-018 | MFA enable-only | Users can enable MFA but never verify or recover | Implement TOTP verify, recovery codes, disable with re-auth |
| SEC-019 | Client-supplied document URL | Arbitrary external/malicious content attached to employee records | Server-side upload, MIME/size checks, signed storage |
| SEC-020 | Same-tenant e-sign impersonation | Any colleague can sign as another employee | Tie signer to `user.employeeId`; add consent/audit |
| SEC-021 | No audit on bulk PII reads | Cannot investigate a leak | Log actor, route, record count, filters |
| API-002 | No health endpoint | Render/monitoring cannot distinguish up from ready | Add `/health` (liveness) and `/ready` (DB check) |
| API-003 | No OpenAPI | 367 endpoints undocumented; client drift (see API-007) | Generate Swagger from decorators/DTOs |
| API-004/005 | Inline bodies bypass validation | Mass-assignment and type errors | DTO classes with `class-validator`; forbid `@Body('x')` for mutations |
| API-006 | No account lockout | Distributed brute force bypasses IP throttle | Per-account exponential backoff + CAPTCHA |
| API-008 | Unbounded lists | Memory/latency blow-up | Hard caps + cursor pagination |
| API-009 | Untyped config values | Corrupt settings break features silently | Schema per config key |
| API-010 | Duplicate routes | Larger attack surface, client confusion | Deprecate alias |
| API-011 | No idempotency | Double payroll runs create duplicate payouts | Idempotency key + unique constraint |
| API-012 | Inconsistent errors | Client cannot distinguish causes | Global exception filter with stable codes |
| API-014 | No shutdown hooks | In-flight requests/DB connections cut on deploy | `app.enableShutdownHooks()` + Prisma disconnect |
| FE-005 | Super-admin actions visible to all | 403s and confusing UX | Capability-gate controls |
| FE-006/007 | Role-name and `isSystem` checks | Users see menus they cannot use, or miss menus they can | Use server-provided permission list |
| FE-008 | No frontend tests | Regressions like FE-001/003 ship silently | Vitest + Testing Library + Playwright |
| FE-009 | 1,663 `any` | Type system cannot catch API-shape bugs (FE-003) | `strict` + incremental typing |
| FE-010 | 1,700-line components | Hard to review/test; re-render hotspots | Split by feature; extract hooks |
| FE-011 | Refetch policy | API load and UI flicker | `staleTime`, targeted invalidation |
| FE-012 | Swallowed errors | Users see empty screens with no cause | Surface error states; log to telemetry |
| FE-013 | No web security headers | Clickjacking/XSS exposure on Vercel | Add CSP/HSTS/frame-ancestors/referrer policy |
| BL-011 | No YTD TDS true-up | Under/over-withholding across the year | Maintain YTD taxable income and adjust monthly |
| BL-012 | Professional tax fixed | Wrong deduction in most states | State-wise PT slabs from `ProfessionalTaxSlab` |
| BL-013 | PF/ESI flag semantics | Manual vs statutory deduction may invert | Rename to `pfMode`/`esiMode`; migrate data |
| BL-014 | FnF simplifications | Gratuity/notice may be legally wrong | Make formulas configurable; legal review |
| BL-015 | Carry-forward/encashment not applied | Configured policy ignored at year end | Implement rollover job with limits |
| BL-016 | Comp-off auto-credit | Employees accrue leave without approval | Require manager approval before credit |
| BL-017 | Late penalty fallback | Company without policy penalises at 6 lates | Explicit default + warning |
| BL-018 | No probation workflow | Confirmation dates never enforced | Scheduled probation review + auto-confirm/alert |
| BL-019 | Balance dedupe by name | Duplicate leave types hide data | Dedupe by id; enforce unique type code |
| BL-020 | Payouts after lock | Locked payslips become inconsistent | Reject payouts on locked cycles or trigger recalc |
| BL-025 | CTC vs gross mismatch | Offers show a number payroll never pays | Define CTC components explicitly; show employer contributions |
| DB-007 | `Float` money | Rounding drift in payroll/leave | `Decimal(12,2)` / `Decimal(6,2)` |
| DB-008 | Global unique email | Same person cannot exist in two tenants | `@@unique([companyId, email])` + explicit cross-tenant identity |
| DB-009 | No unique role name | Duplicate roles with divergent grants | `@@unique([companyId, name])` |
| DB-010 | No soft delete | Accidental loss, no retention | `deletedAt` on core models |
| DB-011 | Free-form statuses | Typos create unreachable states | Enum or check constraint |
| DB-012 | Schema unformatted | Noisy diffs, review friction | Run `prisma format` |
| DB-013 | Compose PostgreSQL vs MySQL | New dev setup cannot run | Align Compose with MySQL |
| DB-014 | No `migrate deploy` on Render | Fresh deploy fails at runtime | Add pre-deploy migration |
| DB-017 | Drift unknown | Schema may not match migrations | `prisma migrate status` on a copy |
| DESK-005 | No publisher name | Updater cannot check publisher | Set `win.publisherName` after signing |
| DESK-007 | Renderer overrides device id | Device identity is resettable | Preserve main-process id |
| DESK-008 | IPC accepts any `file://` | Privileged API exposed to any local page | Compare exact renderer path |
| DESK-009 | No crash/load handling | Permanent splash/blank on failure | `did-fail-load`, `render-process-gone`, retry |
| DESK-010 | macOS update broken | Mac users never auto-update | Sign + publish `latest-mac.yml`, or remove claim |
| DESK-011 | CSP may not apply on `file://` | Renderer may run without CSP | Meta fallback or custom protocol |
| DESK-013 | Cron sleeps on free plan | Attendance/leave jobs skipped | Always-on worker or external scheduler |
| DESK-014 | Blocking probes before splash | App appears hung on slow machines | Splash first, async probes |
| DESK-015 | No desktop CI; stale `out/` | Broken TypeScript can ship | Add desktop job, stop tracking `out/` |
| PERF-004 | Unbounded lists | See API-008 | Pagination |
| PERF-005 | No tenant/date composite index | Slow attendance/payroll queries at scale | `@@index([employeeId, date])` plus `companyId` path |
| PERF-006 | Group check per request | Extra DB round-trip on every call | Cache on the JWT/session |
| PERF-007 | Stale permission cache | Revoked access persists 5 minutes; not shared across instances | Short TTL + pub/sub invalidation |
| PERF-008 | 421 kB charts | Slow dashboard on mobile | Lazy-load chart library |
| PERF-009 | Monolithic components | No route-level splitting | Split + `React.lazy` |
| PERF-011 | Full-row PII reads | Over-fetch and decrypt cost | Explicit `select` |
| MF-003 | MFA lifecycle | See SEC-018 | Full TOTP flow |
| MF-004 | No audit viewer | Security events invisible to admins | Admin audit screen with filters |
| MF-005 | Statutory returns | Compliance cannot be filed from the system | Generate PF ECR/ESIC/24Q/PT exports |
| MF-006 | No bank file | Payroll cannot be paid in bulk | NEFT/CSV export with validation |
| MF-007 | No mail queue | Lost emails, no retry | Bull/BullMQ queue with DLQ |
| MF-008 | No backup/DR doc | Data loss risk | Document and test restore |
| MF-009 | No lockout/CAPTCHA | See API-006 | Implement |
| MF-010 | No malware scan | Malicious uploads | ClamAV or cloud scanner |

---

## 5. P3 / P4 findings

| ID | Sev | Finding | Fix |
|---|---|---|---|
| SEC-022 | P3 | `decrypt()` silently returns ciphertext on auth failure | Log a metric; surface a data-integrity alert |
| SEC-023 | P3 | No secret scanning | Add gitleaks + pre-commit |
| API-013 | P3 | No versioning/deprecation policy | Document and enforce |
| FE-014 | P3 | Only one global error boundary | Wrap route subtrees |
| FE-015 | P3 | 13 `console.*` calls | Route through a logger, strip in prod |
| FE-016 | P3 | Accessibility gaps (SUSPECTED) | Axe audit + focus trap for modals |
| DESK-016 | P3 | `copy:renderer` merges stale assets | `rm -rf dist/renderer` before copy |
| DESK-017 | P3 | Electron 33 EOL | Upgrade to a supported major |
| BL-021 | P3 | Duplicate salary revision rows | Update revision in place for same date |
| BL-022 | P3 | Duplicate holidays double-count | Unique `(companyId, date)` |
| BL-023 | P3 | Leave counting ignores Saturday rules | Reuse `resolveSaturdayWeeklyOff` |
| BL-024 | P3 | Dead leave configuration | Implement or remove from UI |
| DB-015 | P3 | Unvalidated JSON columns | Validate on write with Zod |
| DB-016 | P3 | Cascades bypass retention | Restrict critical relations |
| PERF-010 | P3 | Verbose logging | Structured logger with levels |
| PERF-012 | P3 | No pool sizing (SUSPECTED) | Configure `connection_limit` |
| MF-011 | P3 | No i18n | Extract strings; add locale layer |
| MF-012 | P3 | Accessibility target absent | Adopt WCAG 2.2 AA |
| FE-017 | P4 | Dead `CompanySelector` | Delete |
| DESK-018 | P4 | Wrong issue tracker URL | Fix link |

---

## 6. Positive verification (not findings)

These were specifically checked and found sound:

- No `dangerouslySetInnerHTML` in the frontend.
- No third-party API keys or private keys hardcoded in source (the exposed material is in dumps/scripts covered by SEC-001/002).
- `ErrorBoundary` exists and wraps the app (`App.tsx:395-399`).
- Refresh-token rotation, hashed token storage and admin session revocation are implemented.
- `helmet()` is enabled; CORS is an allow-list rather than `*`.
- `ValidationPipe` uses `whitelist: true`.
- PII encryption is AES-256-GCM with a per-value nonce; legacy CBC is read-only.
- Electron renderer hardening flags are all correctly set.
- Backend and frontend TypeScript builds pass; 292 backend tests pass.
- Version numbers are consistent across apps and lockfiles.

---

## 7. Deduplication notes

- SEC-011 and API-001 describe the same systemic guard weakness from different angles; both are kept because one is a concrete code defect and the other is a coverage metric.
- API-007 and FE-004 are the same defect (wrong HTTP method); FE-004 is canonical for the client side, API-007 for the contract.
- API-008 and PERF-004 are the same unbounded-query issue; API-008 is the contract finding, PERF-004 the performance finding.
- SEC-018 and MF-003 overlap; SEC-018 is the defect, MF-003 tracks the product capability.
- SEC-013 is the storage defect; it is referenced by the desktop token-storage finding rather than duplicated.
- DB-001 and DB-016 share the cascade root cause; DB-001 is the destructive operation, DB-016 the schema policy.
- DESK-012/011 are marked SUSPECTED and must not be presented as confirmed runtime failures.

---

## 8. Verification register for this report

| Claim type | How verified |
|---|---|
| File/line evidence | Direct `Get-Content`/`Select-String` reads at commit `8473ca0` |
| Public repo status | GitHub REST API call (read-only) |
| Dump contents | Table/column summary only; no row values reproduced |
| Build/test claims | `tsc --noEmit`, `tsc -b`, `nest build`, `vite build`, `jest --runInBand` |
| Runtime exploitability | **NOT TESTED** — no authorization to touch a live environment |
| Installer behaviour | **NOT TESTED** — no installer executed |
| Migration drift | **NOT TESTED** — no authorised DB connection |

See `10-TEST-EXECUTION-REPORT.md` for exact commands and outputs.
