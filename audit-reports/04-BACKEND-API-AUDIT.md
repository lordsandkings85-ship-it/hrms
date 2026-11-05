# 04 — Backend / API Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04 · **Scope:** `backend/` (NestJS 10 + Prisma 5 + MySQL)  
**Canonical IDs:** `API-001` … `API-014`; authorization findings cross-reference `SEC-*`.

---

## 1. Inventory

| Metric | Value |
|---|---|
| Controllers | 36 |
| Services | 43 |
| Route handlers | 367 |
| TypeScript files | 214 |
| Prisma models | 100 |
| Bootstrap | `main.ts` — Helmet, CORS allow-list, global `ValidationPipe`, 50 MB JSON limit |
| API prefix | `api/v1` |
| Build | PASS (`nest build`) |
| Tests | 19 suites / 292 tests PASS (~17 s, `--runInBand`) |
| Lint | 0 errors / 50 warnings |

Guard coverage:

| Guard | Controllers |
|---|---:|
| `JwtAuthGuard` | 35 / 36 |
| `PermissionsGuard` | 26 / 36 |
| `CompanyScopeGuard` | 17 / 36 |

---

## 2. Findings

### API-001 — Tenant scoping is per endpoint (P1, CONFIRMED)

Only 17 of 36 controllers use `CompanyScopeGuard`. The rest depend on each service remembering to filter by `companyId`. The P0/P1 cross-tenant findings (`SEC-004` … `SEC-010`) are all instances of this.

**Why fixing endpoints individually will not hold:** every new controller starts unscoped. There is no architecture test that fails when a tenant-scoped route lacks a guard.

**Remediation options**

1. Make `CompanyScopeGuard` global with an explicit `@SkipCompanyScope()` opt-out for genuinely public/global routes.
2. Add a Prisma client extension that injects `companyId` for tenant-scoped models when the request context carries one.
3. Add a CI test that enumerates controllers and asserts every route has either a `@Public` marker or both guards.

Option 1 plus option 3 is the smallest change with lasting effect.

---

### API-002 — No health or readiness endpoint (P2, CONFIRMED)

No `/health`, `/ready`, no Terminus. Render's health check cannot distinguish "process up" from "database unreachable". Combined with the missing migration step (`DB-014`), a bad deploy looks healthy until the first user request.

**Fix:** `/health` (liveness, no DB) and `/ready` (DB `SELECT 1` + migration check).

---

### API-003 — No OpenAPI/Swagger for 367 endpoints (P2, CONFIRMED)

There is no `@nestjs/swagger` dependency and no `SwaggerModule` setup. Client/server drift is therefore undetectable except by reading both codebases. `API-007` (GET vs POST) is the concrete example.

**Fix:** add Swagger, annotate DTOs, publish the spec, generate the frontend client.

---

### API-004 — Inline object / `any` bodies bypass validation (P2, CONFIRMED)

**Where:** `leave.controller.ts:54-60`, `companies.controller.ts:64-66`, many others.

Handlers declare bodies as inline object literals or `any`. `ValidationPipe` only validates classes with decorators, so these payloads skip `whitelist` stripping and type checks.

**Impact:** mass assignment, type confusion, invalid data reaching Prisma.

**Fix:** DTO classes for every mutation; reject inline body types in review.

---

### API-005 — `@Body('primitive')` bypasses validation (P2, CONFIRMED)

**Where:** `companies.controller.ts:89, 135, 151`; `projects.controller.ts:11-13`.

Reading a single primitive from the body skips both DTO validation and whitelist stripping. `POST /projects/tasks/:taskId/status` accepts any string as a status.

**Fix:** DTOs; explicit enums for status values.

---

### API-006 — No per-account lockout (P2, CONFIRMED)

**Where:** `app.module.ts:45-48`; `auth.controller.ts:16-33`.

Global throttle is 100/min; auth endpoints are 5/min **per IP**. A distributed attacker rotates IPs.

**Fix:** per-account exponential backoff, CAPTCHA after N failures, alerting on spikes.

---

### API-007 — Monthly allocation method mismatch (P1, CONFIRMED)

**Where:** `frontend/src/api/client.ts:572-578` ↔ `leave.controller.ts:248`.

Client issues GET; server declares POST. The admin action always fails. See `FE-004`.

---

### API-008 — Unbounded list endpoints (P2, CONFIRMED)

**Where:** `leave.service.ts:616-651`, `documents.service.ts:14-16`, `companies.service.ts:316-326`.

`findMany` on tenant-wide collections without `take`/`skip`. Memory and latency grow with tenant size; also a bulk PII exposure path.

**Fix:** hard caps and cursor pagination on all list endpoints.

---

### API-009 — Untyped settings values (P2, CONFIRMED)

**Where:** `companies.controller.ts:149-159`.

`Record<string, unknown>` is persisted without schema validation. A malformed value can silently break a feature.

**Fix:** per-key schema (Zod or class-validator) and versioned migrations for config.

---

### API-010 — Duplicate alias routes (P2, CONFIRMED)

**Where:** `payroll.controller.ts:20-30`.

`salary-structure` and `structure` map to the same behaviour. Larger surface, more places to miss in review.

**Fix:** deprecate one alias with a sunset date.

---

### API-011 — No idempotency for payroll run / monthly allocation (P2, CONFIRMED)

No `Idempotency-Key` handling; no DB uniqueness preventing duplicate cycles/slips (`DB-003`). A retry or double click can duplicate payouts.

**Fix:** idempotency keys plus DB constraints.

---

### API-012 — Inconsistent error shape (P2, CONFIRMED)

**Where:** `permissions.guard.ts:194`; `security.service.ts:200-206`.

Some paths throw `ForbiddenException` with a string, others with an object, others return Nest defaults. Clients cannot reliably branch on error type.

**Fix:** global exception filter with stable error codes and a documented envelope.

---

### API-013 — No versioning/deprecation policy (P3, CONFIRMED)

URI `v1` is set globally; there is no policy for breaking changes or `Deprecation`/`Sunset` headers.

---

### API-014 — No shutdown hooks (P2, CONFIRMED)

**Where:** `main.ts:18-95`; `prisma.service.ts`.

`app.enableShutdownHooks()` is not called and `PrismaService` does not implement `OnModuleDestroy`. Deploys cut in-flight requests and DB connections abruptly.

---

## 3. Bootstrap and middleware (verified)

`backend/src/main.ts`:

| Line | Behaviour | Assessment |
|---|---|---|
| 8-16 | `assertRequiredEnv` | Good — fails fast |
| 19 | Requires `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` | Good |
| 21 | `bodyParser: false` | Intentional |
| 24-25 | JSON/urlencoded 50 MB | High but deliberate for logo uploads |
| 27+ | `trust proxy` first hop | Correct behind Render |
| 32+ | `helmet()` | Good |
| 36-48 | CORS allow-list with suffix fallback | Allow-list good; fallback is SEC-017 |
| 50-61 | CORS callback rejects unknown origins | Good |
| 64-77 | Device middleware | Spoofable (SEC-012) |
| 80 | Global prefix `api/v1` | Good |
| 82-88 | `ValidationPipe({ whitelist: true })` | Good where DTOs exist |
| 92 | `console.log` of startup | Minor (PERF-010) |

---

## 4. Module-level observations

| Module | Observation |
|---|---|
| `auth` | Rotation and revocation present; no logout, MFA incomplete (`SEC-014`, `SEC-018`) |
| `employees` | Predictable initial password (`SEC-015`); hard delete (`DB-001`) |
| `leave` | No `CompanyScopeGuard`; unscoped fallbacks; rules not enforced (`SEC-007`, `BL-008`) |
| `attendance` | Overnight/timezone defects (`BL-001`, `BL-002`) |
| `payroll` | Tax input gaps, proration defects, N+1 transaction (`BL-003`…`BL-007`, `PERF-001`) |
| `documents` | `/documents/all` leak, client-supplied URLs, e-sign impersonation (`SEC-006`, `SEC-019`, `SEC-020`) |
| `announcements` | Cross-tenant list (`SEC-009`) |
| `projects` | No tenant guard (`SEC-008`) |
| `companies` | Two unscoped employee endpoints, arbitrary reassignment (`SEC-004`, `SEC-005`, `SEC-010`) |
| `security` | Client-supplied device context (`SEC-012`) |
| `fnf` | Simplified statutory formulas (`BL-014`) |

---

## 5. Dependency and build health

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.json --noEmit` | PASS |
| `npm run build` (`nest build`) | PASS |
| `npx jest --runInBand` | 19 suites / 292 tests PASS |
| `npm run lint` | 0 errors / 50 warnings |
| `npx prisma validate` | PASS |
| `npx prisma format --check` | FAIL (unformatted schema, `DB-012`) |
| `npm audit` | 68 advisories: 2 critical, 10 high, 48 moderate, 8 low |

The audit findings were not resolved by any of these commands; passing builds indicate syntax and type health, not correctness or security.

---

## 6. What is well implemented

- Guard chain is coherent where applied: `JwtAuthGuard` → `PermissionsGuard` → `CompanyScopeGuard`.
- `CompanyScopeGuard` performs real record-level checks for 17 controllers, with a parameterised raw-SQL union across 28 tables (table names hardcoded, values parameterised).
- Refresh-token rotation, hashed token storage and admin session revocation.
- AES-256-GCM PII encryption with per-value nonce.
- Boot fail-fast on missing secrets.
- Helmet and an explicit CORS allow-list.
- Global `ValidationPipe` with `whitelist: true` (where DTOs exist).
- 292 passing backend tests, including payroll and leave unit coverage.

---

## 7. Recommended backend work, in order

1. **Default-deny `PermissionsGuard`** (`SEC-011`) — highest leverage.
2. **Fix the four unscoped endpoints** (`SEC-004/005/006`, `SEC-007`).
3. **Make `CompanyScopeGuard` global** (`API-001`) with an opt-out.
4. **Add DTOs to all mutations** (`API-004/005`).
5. **Add `/health` and `/ready`** and shutdown hooks (`API-002`, `API-014`).
6. **Add OpenAPI and generate the client** (`API-003`) — prevents `API-007` class of bug.
7. **Add idempotency and DB uniqueness for payroll** (`API-011`, `DB-003`).

---

## 8. NOT TESTED

| Item | Reason |
|---|---|
| Live endpoint behaviour | No authorised running environment |
| Rate-limit effectiveness | No load or distributed test |
| CORS behaviour from the packaged app | Installer not executed (`DESK-012`) |
| Migration drift | No DB connection (`DB-017`) |
| External integrations (SMTP, storage) | No credentials/authorization |

All findings are from source at `8473ca0`, supplemented by the build, test and lint commands listed in `10-TEST-EXECUTION-REPORT.md`.
