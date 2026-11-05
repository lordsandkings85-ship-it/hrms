# 02 — Security Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04 · **Mode:** read-only static review  
**Canonical IDs:** `SEC-001` … `SEC-023` (cross-referenced in `12-FULL-ISSUE-INVENTORY.json`)

---

## 1. Verdict

**FAIL.** The security posture is dominated by two problems outside the code:

1. A **public repository** contains **production database dumps** and **published default credentials**.
2. Tenant isolation is enforced **per endpoint** and fails open in several places.

The authentication primitives (bcrypt, JWT rotation, AES-256-GCM PII encryption, Helmet, CORS allow-list, ValidationPipe whitelist) are implemented competently. The failures are in **authorization coverage**, **secret hygiene**, and **operational release integrity**.

| Security domain | Status | Basis |
|---|---|---|
| Secret management | **FAIL** | SEC-001, SEC-002, SEC-016, SEC-023 |
| Tenant isolation | **FAIL** | SEC-003 … SEC-010 |
| Authorization default | **FAIL** | SEC-011 (fail-open guard) |
| Authentication | **PARTIAL** | Rotation exists; no logout (SEC-014), MFA incomplete (SEC-018), weak initial password (SEC-015) |
| Session/token handling | **PARTIAL** | localStorage (SEC-013), 7-day refresh, no revocation |
| Device trust | **FAIL** | Client-supplied context (SEC-012, DESK-007) |
| Transport/API hardening | **PARTIAL** | Helmet + CORS allow-list, but wildcard suffix fallback (SEC-017) |
| Crypto | **PARTIAL** | GCM good; fail-open decrypt (SEC-022) |
| Auditability | **PARTIAL** | Writes logged; bulk reads not (SEC-021) |

---

## 2. Threat model used

| Actor | Capability assumed |
|---|---|
| Anonymous internet user | Can read the public repository and download releases |
| Authenticated employee (lowest privilege) | Valid JWT, own company only |
| Tenant administrator | `organization:*` grants within one tenant |
| Compromised release channel | Can replace a GitHub release asset |
| Malicious local page on a user's machine | Can load a `file://` document in Electron |

The design intent is clearly multi-tenant SaaS with group-level administration. The audit tests whether a **tenant-level** actor can reach another tenant's data, because that is the boundary the product sells.

---

## 3. Authorization architecture (as built)

Request flow for a typical endpoint:

```
JwtAuthGuard            → validates access token, attaches AuthUser
PermissionsGuard        → checks @Permissions metadata (FAIL-OPEN if absent)
CompanyScopeGuard       → checks record/param ownership (only on 17/36 controllers)
Service                 → may re-check via isGroupWideUser, or may not
```

Measured coverage across 36 controllers:

| Guard | Controllers |
|---|---:|
| `JwtAuthGuard` | 35 / 36 |
| `PermissionsGuard` | 26 / 36 |
| `CompanyScopeGuard` | 17 / 36 |

`isGroupWideUser` is the single decision point for "may cross tenants". It is called from `CompanyScopeGuard:24` and from services in companies, leave, payroll, attendance, documents and announcements.

---

## 4. P0 findings

### SEC-001 — Production dumps in a public repository (CONFIRMED)

**Where:** `backend/db-backups/hrms_prod_dump_2026-08-15.sql` (212,327 B), `mariadb/full_dump.sql` (470,988 B), `mariadb/full_dump_fixed.sql` (235,116 B).

**Verified facts**

- `git ls-files` reports all three as tracked.
- Dump header: phpMyAdmin 5.2.2 export of `u593848004_hrms`, MariaDB 11.8.8, generated 2026-08-15.
- Table-level inspection (no row values reproduced) shows `INSERT INTO` for:
  `Employee`, `EmployeeContactInfo`, `EmployeeAdminInfo`, `EmployeePaymentInfo`, `Payslip`, `SalaryStructure`, `TaxDeclaration`, `RefreshToken`, `User`, `AttendanceLog`, `LeaveRequest`, `Expense`, `TravelRequest`, `AuditLog`.
- `Employee` columns include Aadhaar, PAN, passport, driving licence, bank account and IFSC.
- `User` includes `passwordHash` and `mfaSecret`; `RefreshToken` includes `tokenHash`.
- `GET https://api.github.com/repos/lordsandkings85-ship-it/hrms` → `private: false`, `visibility: public`.

**Why this is P0 and not "just a repo setting":** the exposure has already happened. Making the repo private does not un-publish forks, caches, or clones. Every credential in those tables must be treated as compromised.

**Minimum response:** private repo → history purge → full credential rotation → refresh-token revocation → employee notification.

---

### SEC-002 — Published default credentials (CONFIRMED presence; SUSPECTED validity)

**Where:** `HOSTINGER.md:153-157, 167-169`; `backend/update_admin.js:6-7`; `backend/create-hr.js:7-8`; `backend/check_user.js:5-9`; `backend/seed_remote.js:1`.

`HOSTINGER.md` publishes a table with super-admin, HR manager and employee emails and passwords. The same passwords are hardcoded in the three helper scripts. `seed_remote.js` creates `admin@acme.com` with `isSuperAdmin: true`.

`group-access.util.ts:22-24` hardcodes `admin@acme.com` as group-wide. That makes the seeded account a **persistent backdoor** independent of any role configuration.

**Not tested:** whether the passwords still work. No login attempt was made. The finding is that they are published and associated with accounts present in the dump; the live-validity part is explicitly labelled SUSPECTED.

---

### SEC-003 — Group-wide privilege by substring (CONFIRMED)

**Where:** `backend/src/utils/group-access.util.ts:20-37`.

```ts
if (user.isSuperAdmin) return true;
if (user.email === '<three hardcoded addresses>') return true;
if (user.role?.isSystem) return true;
const roleName = user.role?.name?.toLowerCase() || '';
if (roleName.includes('super admin') || roleName.includes('admin') ||
    roleName.includes('group') || roleName.includes('hr admin')) return true;
```

Plus: any role holding a **view** grant on `employees`, `attendance`, `leave` or `payroll` is treated as group-wide.

**Exploit reasoning (not executed against a live system)**

1. Tenant A admin creates or renames a role to `HR Admin`.
2. Assign it to a user in tenant A.
3. `CompanyScopeGuard:24` now returns `true` before any company check.
4. `GET /group/employees` or `GET /companies/<tenant-B>/employees` returns tenant B data.

Every tenant is likely to have an "HR Admin" role. This is not an edge case; it is the normal configuration.

**Remediation:** explicit `User.isGroupAdmin` boolean or an `organization:manage_all` permission resolved from the database. `role.isSystem` must mean "non-editable", never "cross-tenant". Delete the email allow-list. Add negative tests: tenant admin → 403 for every foreign resource.

---

### SEC-004 — `GET /companies/:id/employees` (CONFIRMED)

**Where:** `companies.controller.ts:32-35`, `companies.service.ts:301-311`.

No `@Permissions` decorator → `PermissionsGuard:55` returns `true`. Service:

```ts
const where = groupWide ? { companyId } : { companyId };
```

Both branches are identical. The caller's company is never consulted. Any authenticated user can enumerate any company's employees by guessing or observing an id.

**Fix:** require `organization:view`; verify `companyId ∈ caller.companyIds` unless genuine group admin; return 404 to prevent enumeration.

---

### SEC-005 — `GET /group/employees` (CONFIRMED)

**Where:** `companies.controller.ts:38-41`, `companies.service.ts:316-326`.

No decorator; service query is `employee.findMany({ where: { isSystem: false }, include: { company: true, department: true } })`. There is no company filter at all. `groupWide` is computed and never used.

**Impact:** full cross-tenant employee directory, including company and department, to any authenticated user.

---

### SEC-006 — `GET /documents/all` (CONFIRMED)

**Where:** `documents.controller.ts:15`, `documents.service.ts:14-16`.

```ts
listAll() { return this.prisma.employeeDocument.findMany({ orderBy: { uploadedAt: 'desc' } }); }
```

`CompanyScopeGuard` is present on the controller but only checks `employeeId`/record `id` values in the request. This route has neither, so the guard passes. There is no `PermissionsGuard`.

**Impact:** every document row in every tenant — employee id, type, `fileUrl`, signature state — readable by any authenticated user. If `fileUrl` points at public storage, this is direct document disclosure.

---

## 5. P1 findings

### SEC-007 — Leave service unscoped fallbacks (CONFIRMED)

**Where:** `leave.service.ts:68-77, 653-660, 830-841, 1119-1125`; `leave.controller.ts:9`.

The controller uses `JwtAuthGuard` + `PermissionsGuard` but **not** `CompanyScopeGuard`. The service pattern is:

```ts
let employee = await this.prisma.employee.findFirst({
  where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
});
if (!employee) {
  employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
}
```

The fallback runs for **every** caller, not only group-wide ones. A tenant A user can read or adjust tenant B balances and create leave requests against a foreign employee.

**Fix:** remove the fallback. If not group-wide and not in `companyId`, throw `NotFoundException`. Add `CompanyScopeGuard` and cross-tenant tests.

### SEC-008 — Project/task writes (CONFIRMED)

**Where:** `projects.controller.ts:10-13`, `projects.service.ts:13-18`.

Only `JwtAuthGuard`. `POST /projects/:id/tasks` and `POST /projects/tasks/:taskId/status` pass path ids straight to Prisma. Any authenticated user can add tasks to, or change the status of, any tenant's project tasks.

### SEC-009 — Announcements (CONFIRMED)

**Where:** `announcements.service.ts:9-33`.

`list()` computes `groupWide`, then ignores it and queries `companyId: { in: allCompanyIds }`. `listAll()` does the same without the `isActive` filter. Group-wide create clones announcements into every company.

### SEC-010 — `assign-employees` (CONFIRMED)

**Where:** `companies.controller.ts:43-52`, `companies.service.ts:331-369`.

Requires `organization:edit`, but the service accepts arbitrary `employeeIds` and writes `companyId = target` without verifying current ownership, writing history or emitting an audit record. A tenant admin can move another tenant's employees into their own tenant.

### SEC-011 — Fail-open permission guard (CONFIRMED)

**Where:** `permissions.guard.ts:55`.

```ts
if (!required || required.length === 0) return true;
```

This is the highest-leverage defect in the codebase. A forgotten decorator becomes "any logged-in user". It is the direct cause of SEC-004/005/006 and exposes undecorated settings, organization and role routes.

**Fix:** default-deny. Add `@Public()` for anonymous routes and explicit `@SelfService`/`@AnyAuthenticated` markers. Fail startup if a non-public handler has no metadata.

### SEC-012 — Spoofable device context (CONFIRMED)

**Where:** `security.service.ts:90-108`, `main.ts:64-77`.

```ts
return {
  ...decoded,
  ...device,                       // request body wins
  platform: device?.platform ?? decoded.platform ?? header('x-client-platform'),
  osVersion: device?.osVersion ?? decoded.osVersion ?? header('x-os-version'),
  signals: device?.signals ?? decoded.signals ?? [],
};
```

Every enforcement input is client-controlled. The documented "Windows 10/11 x64 only" server control is bypassable by a scripted client. The desktop gate also fails open (DESK-002), so there is no real barrier.

### SEC-014 — No logout or revocation (CONFIRMED)

**Where:** `auth.controller.ts:11-45`; `render.yaml:22-23`.

Routes are `register`, `login`, `refresh`, `mfa/enable`, `me`. There is no `POST /auth/logout`. Client `logout()` only clears `localStorage`. Refresh tokens live 7 days and are invalidated only by an admin action.

### SEC-015 — Predictable initial passwords (CONFIRMED)

**Where:** `employees.service.ts:37`.

```ts
const generatedPassword = !password ? dto.employeeCode.toLowerCase() : undefined;
```

Employee codes are often sequential (`EMP001`). No forced change on first login.

---

## 6. P2 / P3 findings

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| SEC-013 | P2 | Tokens in `localStorage` | `client.ts:13-15,118-119`; `LoginPage.tsx:33-34` | Access token in memory; refresh in OS secure storage / httpOnly cookie |
| SEC-016 | P2 | Hardcoded privileged emails | `group-access.util.ts:22-24` | Remove; explicit capability |
| SEC-017 | P2 | CORS trusts all `*.vercel.app` / `*.onrender.com` when unset | `main.ts:36-48` | Require `CORS_ORIGINS`; fail boot if unset |
| SEC-018 | P2 | MFA enable-only | `auth.controller.ts:35-39` | Full TOTP verify/disable/recovery |
| SEC-019 | P2 | Client-supplied document URL | `documents.service.ts:8-10` | Server-side upload, MIME/size, signed storage |
| SEC-020 | P2 | E-sign as another employee | `documents.controller.ts:17-25`; `documents.service.ts:18-37` | Bind signer to `user.employeeId` |
| SEC-021 | P2 | No audit on bulk PII reads | bulk list endpoints | Log actor, route, filters, count |
| SEC-022 | P3 | Decrypt fails open | `crypto.util.ts:65-72` | Throw + alert |
| SEC-023 | P3 | No secret scanning | `.gitignore`, CI | gitleaks + pre-commit |

---

## 7. Controls that are actually implemented

These were verified and should not be regressed:

- **Password hashing:** bcrypt with cost factor applied at registration and reset.
- **Refresh-token rotation:** tokens are hashed at rest, rotated on use, and sessions can be revoked by an admin.
- **JWT separation:** access and refresh use separate secrets; both are mandatory at boot (`main.ts:19`).
- **PII encryption:** AES-256-GCM with a fresh 12-byte nonce and a `v2:` prefix; legacy CBC is read-only (`crypto.util.ts`).
- **Boot fail-fast:** `assertRequiredEnv(['JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','ENCRYPTION_KEY'])`.
- **Helmet** enabled; **CORS** is an allow-list, not `*`, with credentials.
- **ValidationPipe** with `whitelist: true`, `forbidNonWhitelisted` behaviour where DTOs exist.
- **Throttling** on auth endpoints (5/min per IP).
- **CompanyScopeGuard** performs real record-level checks for 17 controllers, including a parameterised raw-SQL union across 28 tables (table names hardcoded, values parameterised).
- **No `dangerouslySetInnerHTML`** and no hardcoded third-party API keys in source.

---

## 8. Remediation sequence

Ordered by risk reduction, not effort:

1. **Make the repository private** and begin history purge. *(hours)*
2. **Rotate every credential** in the dumps and scripts; revoke all refresh tokens; disable `admin@acme.com`. *(hours)*
3. **Fix SEC-004/005/006** — four endpoints, small diffs. *(1 day)*
4. **Make `PermissionsGuard` default-deny** and add `CompanyScopeGuard` to leave, projects and announcements. *(2–3 days, touches many controllers)*
5. **Replace `isGroupWideUser` heuristics** with an explicit capability. *(2 days)*
6. **Add logout/revocation** and move refresh tokens out of `localStorage`. *(2–3 days)*
7. **Add secret scanning and CI guardrails** so this cannot recur. *(1 day)*

---

## 9. NOT TESTED / limitations

| Item | Reason |
|---|---|
| Live exploitability of SEC-003/004/005/006 | No authorization to touch a production or staging environment |
| Whether published passwords remain valid | No login attempts performed |
| Runtime CORS behaviour for the packaged app | Installer not executed (DESK-012, SUSPECTED) |
| Effective CSP on `file://` | Requires packaged runtime instrumentation (DESK-011, SUSPECTED) |
| MFA end-to-end | Feature is incomplete by inspection |
| Rate-limit effectiveness under distributed load | Not load-tested |

No secret value is reproduced in this report. File and line references are provided so an authorised engineer can inspect them.
