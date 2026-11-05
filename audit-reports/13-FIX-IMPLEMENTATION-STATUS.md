# 13 — Fix Implementation Status

**Baseline commit:** `8473ca0` · **Date:** 2026-11-04
**Scope:** fixes applied after the read-only audit, in the order agreed with the repo owner.
**State:** changes are **uncommitted** in the working tree.

Verification performed on the working tree:

| Check | Result |
|---|---|
| `backend: npx tsc --noEmit` | clean |
| `backend: npx jest --runInBand` | 20 suites, **305 tests passed** |
| `frontend: npx tsc -b` | clean |
| `frontend: npm run build` | succeeded (Vite build, 20.7 s) |

No runtime, database or packaged-desktop tests were executed. Statements below describe code and unit-test behaviour only.

---

## 1. Fixed

### 1.1 Secret hygiene (partial Phase 0)

| Action | Detail |
|---|---|
| Deleted credential/dump files from the working tree | `backend/db-backups/hrms_prod_dump_2026-08-15.sql`, `mariadb/full_dump.sql`, `mariadb/full_dump_fixed.sql`, `mariadb/stderr.txt`, `backend/update_admin.js`, `backend/create-hr.js`, `backend/check_user.js`, `backend/seed_remote.js` |
| `.gitignore` hardened | `.env.*` (except `.env.example`), `*.dump`, `*.sql.gz`, `backend/db-backups/`, `mariadb/`, `desktop/out/` |
| Redacted documentation | `HOSTINGER.md` §6 and the curl example; `README.md` restore command no longer prints a password |

`*.sql` was deliberately **not** ignored globally, because that would also hide Prisma migrations.

### 1.2 Tenant isolation and authorization

| Finding | Change |
|---|---|
| SEC-003 / SEC-016 | `backend/src/utils/group-access.util.ts` rewritten. Group-wide access now requires exactly one explicit DB signal: `User.isSuperAdmin`, a wildcard permission (`ALL`/`*`), or `organization:manage_all`. Role-name substrings, `role.isSystem` and the hardcoded e-mail allow-list no longer grant group reach. |
| SEC-004 | `GET /companies/:id/employees` is scoped by the caller's primary company + active `UserCompany` memberships; a foreign company id returns 404. |
| SEC-005 | `GET /group/employees` returns the whole group only for explicit group-wide users, otherwise only accessible companies. |
| SEC-010 | `assign-employees` validates the target company **and every employee** against the caller's accessible companies, still writes `EmployeeCompanyHistory`, and audits the change. |
| SEC-006 / SEC-020 | `GET /documents/all` is scoped by `employee.companyId` for non-group users. E-sign now resolves the signer from the authenticated user's employee record (never from the request body) and includes the signer's user id in the signature hash. |
| SEC-007 | Leave apply/balances/adjustment/monthly-ledger removed the unscoped `findUnique` employee fallbacks and the unscoped leave-type fallback. |
| SEC-008 | Project task create/update validates that the project/task belongs to the caller's company (404 otherwise). |
| SEC-009 | Announcement `list`/`listAll` are filtered to the caller's company unless the caller has the explicit group-wide capability. |
| SEC-017 | Production boot now fails when `CORS_ORIGINS` is empty; the `*.vercel.app` / `*.onrender.com` suffix wildcards were removed. Only localhost remains as a development default. |

Note: the two company-employee GETs deliberately rely on **service scoping** rather than a new `@Permissions` gate. The permission catalogue has no `organization:view`, so adding a gate would have produced 403s for legitimate HR screens. Default-deny remains SEC-011 (deferred).

### 1.3 Cross-tenant holiday leakage (BL-010)

Removed every "if this company has no holidays, use the global list" fallback in:

- `leave.service.ts` (approval and apply/balance paths)
- `payroll.service.ts` (working-day and holiday aggregation)
- `attendance.service.ts` (monthly summaries and workday summaries)
- `shifts.service.ts` (holiday listing)

A tenant with no holiday rows now has weekend-only non-working days. It can no longer inherit another company's calendar.

### 1.4 Payroll and attendance correctness

| Finding | Change |
|---|---|
| BL-001 | Overnight shifts roll the end time into the next day when `end <= start`. While adding the regression test, a second defect surfaced and was fixed: `00:00` was treated as falsy (`sh || 9`), which silently converted midnight starts to 09:00. Time parsing now uses an explicit `HH:mm` parser. |
| BL-003 | Salary revisions are filtered to `effectiveFrom < periodEnd`; a future-dated revision is not applied early. |
| BL-004 | Payroll loads approved `TaxDeclaration` rows for the correct Indian FY (`financialYearLabel`) and maps 80C, 80D, 24(b), and HRA rent plus metro/non-metro city type into `TaxInput`. |
| BL-005 | 87A marginal relief added for both regimes: tax is capped at the income earned above the rebate threshold instead of falling off a cliff. |
| BL-006 | Surcharge is now regime-aware: old regime keeps the 37% band above ₹5 Cr; new regime is capped at 25%. |
| BL-009 | A half-day request must start and end on the same date; `isHalfDayCount` now charges 0.5 per working date instead of always 0.5 total. |

### 1.5 Frontend broken flows

| Finding | Change |
|---|---|
| FE-001 | Removed the `logout()` effect from `LoginPage`; visiting `/login` no longer destroys a valid session. |
| FE-002 | `setUser` persists a valid active company and clears stale storage; `switchCompany` rejects companies the user is not a member of and clears the query cache; `logout` clears `activeCompanyId`; the API client prefers store state; `Layout` renders `CompanySelector` for multi-company users. |
| FE-003 | Both leave-screen employee dropdowns use `employeesApi.list()` and the correct `items` response shape instead of a raw `/api/v1` fetch. |
| FE-004 | Monthly allocation now sends `POST`. |

### 1.6 Operations

| Finding | Change |
|---|---|
| API-002 | New unauthenticated `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (executes `SELECT 1` and returns 503 without leaking driver details). |
| API-014 | `app.enableShutdownHooks()`; `PrismaService` already implements `OnModuleDestroy` and disconnects. |
| DESK-015 (partial) | `desktop/out/` added to `.gitignore` and the two tracked build artefacts untracked with `git rm --cached` (local files preserved). **No desktop CI job was added.** |

---

## 2. Tests added or updated

- Tax: 87A marginal relief in both regimes, old-regime 37% surcharge above ₹5 Cr, existing new-regime boundary updated to relief behaviour.
- Attendance: overnight 22:00–06:00 rollover and 00:00–08:00 same-day shift, both asserting positive `requiredMinutes` and exact UTC end instants.
- Attendance summaries: tests that previously asserted a global-holiday fallback now assert that no other tenant's calendar is borrowed.
- Companies: foreign-company read rejected; member-company read allowed; group listing scoped; explicit `organization:manage_all` grants group scope; role name alone does not.
- Leave: new `leave.service.spec.ts` covers multi-date half-day rejection, reversed date ranges, invalid dates, and unknown employees.

---

## 3. Deferred, with reasons

| Item | Reason |
|---|---|
| SEC-011 `PermissionsGuard` default-deny | ~76 of 367 routes have no `@Permissions` decorator. Flipping the default now would 403 self-service screens (attendance, leave, documents, helpdesk, etc.). Requires a deliberate `@Public` / `@SelfService` pass. |
| `role.isSystem` bypass inside `PermissionsGuard` | Still grants all permission checks. It no longer grants **group-wide tenant scope** (see SEC-003), but changing the permission bypass needs the same inventory as SEC-011. |
| BL-007 joiner/leaver proration | The current model pays `gross / totalWorkingDays`. Clipping only the denominator would overpay; clipping the numerator too changes pay for existing employees. Needs a product decision on proration semantics. |
| BL-002 timezone date keys | Depends on DB-002 (dedupe + canonical `dateKey`). |
| BL-013 PF/ESI flags | Suspected, not confirmed. The UI labels ("PF As Per Govt", "ESIC Applicable") are consistent with the current "unchecked = manual amount" interpretation; changing it could zero deliberately entered deductions. Needs product confirmation, not a code guess. |
| DB-002 … DB-006 constraints | Require de-duplicating live rows before `@@unique` can be added. |
| DESK-015 CI job, DESK-011/012 packaged runtime | The desktop/runtime part cannot be validated in this environment. |
| Credential rotation, repo privatisation, git history purge, refresh-token revocation | Require GitHub/production access and are outside a code change. The deleted files must still be treated as disclosed. |

---

## 4. Deployment notes (action required before release)

1. **Set `CORS_ORIGINS`** in every production environment. The backend now refuses to boot if it is empty. Use the exact web and desktop origins, comma-separated.
2. **Grant group-wide capability explicitly.** Any role that used to get group reach through its name, `role.isSystem` or the old e-mail allow-list now loses it. Before deploying, grant `organization:manage_all` (through the permissions UI or a seed) to the roles that genuinely need group-wide employee/payroll visibility. `isSuperAdmin` users are unaffected.
3. **Populate holiday calendars per company.** Companies that relied on the global fallback will show fewer paid holidays until their own rows exist.
4. **Review HRA declarations.** HRA declarations are divided by 12 and treated as monthly rent; the FY is derived from the payroll month (April–March). Confirm that the declaration UI stores annual rent, as assumed.
5. **Re-check HRA city type.** Metro is inferred only when the declaration description contains "metro"; otherwise it defaults to non-metro.

---

## 5. Remaining risk

- The repository is still public and its **history** still contains the deleted dumps and credentials. Rotation and history purge remain the highest-priority open items.
- Authorization is still inconsistent at the route layer: many routes have no `@Permissions`, and `PermissionsGuard` is fail-open. Tenant scoping has been added to the routes examined by the audit, but it is not enforced by construction.
- Desktop release integrity (`DESK-003`, `DESK-006`, `DESK-011`, `DESK-012`) is unchanged.
