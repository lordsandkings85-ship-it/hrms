# 10 — Test Execution Report

**Commit:** `8473ca0` · **Date:** 2026-11-04  
**Purpose:** record exactly what was executed, what passed or failed, and what could not be executed safely.

---

## 1. Rules applied

- Only **read-only** commands were run, plus builds and tests that write to ignored output directories.
- No database was created, migrated, seeded, truncated or queried.
- No production endpoint was called with credentials.
- No installer was built or executed.
- `prisma format` was **not** run because it modifies `schema.prisma`; `--check` was used instead.
- Build outputs (`backend/dist`, `frontend/dist`) were produced as a side effect of verification commands.

---

## 2. Environment

| Item | Value |
|---|---|
| Platform | Windows (`win32`) |
| Working directory | `D:\work\HRMS` |
| Node/npm | Used the repository's installed dependencies |
| Database | Not connected |
| Network | Read-only GitHub API metadata call only |

---

## 3. Commands and results

| # | Command | Directory | Result | Notes |
|---|---|---|---|---|
| 1 | `npx tsc -p tsconfig.json --noEmit` | `backend` | **PASS** | No type errors |
| 2 | `npx tsc -b` | `frontend` | **PASS** | Project references build cleanly |
| 3 | `npm run build` (`nest build`) | `backend` | **PASS** | Emits `dist/` |
| 4 | `npm run build` (`tsc -b && vite build`) | `frontend` | **PASS** | Emits `dist/`; chunk-size warnings |
| 5 | `npx jest --runInBand` | `backend` | **PASS** | 19 suites, 292 tests, ~17 s |
| 6 | `npm run lint` | `backend` | **PASS with warnings** | 0 errors, 50 warnings |
| 7 | `npx prisma validate` | `backend` | **PASS** | Schema valid |
| 8 | `npx prisma format --check` | `backend` | **FAIL** | Schema valid but unformatted (`DB-012`) |
| 9 | `npm audit` | `backend` | **68 advisories** | 2 critical, 10 high, 48 moderate, 8 low |
| 10 | `npm audit` | `frontend` | **24 advisories** | 1 critical, 7 high, 16 moderate |
| 11 | `npm audit` | `desktop` | **39 advisories** | 1 critical, 20 high, 18 moderate |
| 12 | `git ls-files` (targeted) | repo root | **Findings** | Confirms tracked dumps and credential scripts |
| 13 | GitHub REST `repos/lordsandkings85-ship-it/hrms` | network | **Findings** | `private: false`, `visibility: public` |

### Why `--runInBand`

The backend Jest suite exhausts memory when run with parallel workers in this environment. `--runInBand` is the documented workaround. It does not change test semantics.

---

## 4. Detailed results

### 4.1 Backend typecheck

```
npx tsc -p tsconfig.json --noEmit
→ exit 0, no diagnostics
```

### 4.2 Frontend typecheck

```
npx tsc -b
→ exit 0, no diagnostics
```

### 4.3 Backend build

```
npm run build
→ nest build, exit 0
```

### 4.4 Frontend build

```
npm run build
→ vite build, exit 0
```

Chunk-size warning (summarized):

| Chunk | Size |
|---|---:|
| `exceljs` | 938.27 kB |
| charts | 421 kB |
| `jspdf` | 357 kB |
| `PayslipPreviewModal` | 340 kB |
| `index` | 227 kB |

This is the source for `PERF-002` and `PERF-008`.

### 4.5 Backend tests

```
npx jest --runInBand
→ 19 suites passed, 292 tests passed, ~17 s
```

Coverage includes payroll and leave unit tests. There are **no** frontend, desktop, E2E or packaged-app tests (`FE-008`, `MF-002`).

### 4.6 Lint

```
npm run lint
→ 0 errors, 50 warnings
```

Warnings are non-blocking in CI and were not individually triaged as findings.

### 4.7 Prisma

```
npx prisma validate      → valid
npx prisma format --check → would reformat schema.prisma
```

`prisma format` was intentionally not executed because it modifies a project file during a read-only audit.

### 4.8 Dependency advisories

`npm audit` output was summarized, not reproduced (advisory text can name exploitable packages and paths). The counts above are the actionable signal. No `npm audit fix` was run because it would modify lockfiles and source.

---

## 5. What the passing tests do and do not prove

| Passing check | Proves | Does **not** prove |
|---|---|---|
| `tsc --noEmit` | Type-level consistency | Runtime correctness |
| `tsc -b` | Frontend type consistency | That the UI works |
| `nest build` | Backend compiles | That endpoints are authorized |
| `vite build` | Frontend bundles | That the bundle is performant |
| `jest` | Unit-level behaviour covered by existing tests | Cross-tenant isolation, payroll correctness (see gaps below) |
| `prisma validate` | Schema syntax | Migration drift, constraint adequacy |

**Critical:** every P0 in this audit exists in code that compiles, lints and passes the existing tests. Test-passing status must not be read as a security or correctness signal.

---

## 6. Test coverage gaps identified

| Area | Existing coverage | Missing coverage |
|---|---|---|
| Backend units | 292 tests | — |
| Cross-tenant authorization | None found | Negative tests per tenant boundary |
| Payroll golden values | Some unit tests | Old-regime declarations, 87A boundary, proration |
| Attendance shifts | Some | Overnight shifts, timezone boundaries |
| Leave rules | Some balance logic | Overlap, max-consecutive, eligibility, gender, attachment |
| Frontend | None | Everything |
| Desktop | None | Everything |
| E2E | None | Login → core flows |
| Packaged app | None | Login, CORS, CSP, updater |
| Performance | None | Payroll at scale, bundle budget |
| Accessibility | None | axe/WCAG |

Recommended additions are listed in `MF-002` and `11-PRIORITIZED-FIX-ROADMAP.md`.

---

## 7. NOT TESTED register

Every item below is reported as NOT TESTED or SUSPECTED in the relevant domain report. None of them is asserted as a confirmed runtime failure.

| Area | Item | Reason | Where referenced |
|---|---|---|---|
| Security | Live exploitability of cross-tenant endpoints | No authorized environment | `SEC-003`…`SEC-010` |
| Security | Whether published passwords still work | No login attempts | `SEC-002` |
| Security | MFA end-to-end | Feature incomplete | `SEC-018` |
| Security | Rate limiting under distributed load | No load test | `API-006`, `MF-009` |
| Database | Migration history vs schema | No DB connection | `DB-017` |
| Database | Query plans / index effectiveness | No populated DB | `PERF-005` |
| Database | Duplicate/orphan data | No DB query | `DB-002`…`DB-006` |
| Business | Payroll run output | Would write data | `BL-003`…`BL-007` |
| Business | Accrual/rollover job | Scheduled job not run | `BL-015` |
| Business | FnF settlement | Not executed | `BL-014` |
| Frontend | Browser rendering and interaction | No dev server | `03` |
| Frontend | Accessibility audit | No browser automation | `FE-016` |
| Desktop | Installer build/install/update | Not executed | `07` |
| Desktop | `Origin: null` CORS | Requires packaged app | `DESK-012` (SUSPECTED) |
| Desktop | CSP interception on `file://` | Requires runtime instrumentation | `DESK-011` (SUSPECTED) |
| Desktop | Windows/macOS compatibility matrix | No test hardware | `07` |
| Deployment | Render/Vercel behaviour | No deployment access | `07` |

---

## 8. Reproduction commands for an authorized tester

These are the minimum safe checks to convert SUSPECTED items into CONFIRMED/NOT APPLICABLE. Run only against a disposable environment.

```powershell
# 1. Packaged CORS check (DESK-012)
#    Build the installer, run it, open DevTools via a debug build, and capture the
#    request Origin header sent to https://<backend>/api/v1/auth/login.
#    Expected finding if Origin is the literal string "null" and CORS rejects it.

# 2. Schema drift (DB-017) — against a restored copy only
cd backend
npx prisma migrate status

# 3. Cross-tenant authorization (SEC-003…SEC-010) — test tenant only
#    Create tenants A and B. As an A admin with role "HR Admin":
#      GET /api/v1/group/employees
#      GET /api/v1/companies/<B-id>/employees
#      GET /api/v1/documents/all
#    Expected after fix: 403/404. Observed before fix: 200 with B's data.

# 4. Payroll golden values (BL-003…BL-007)
#    Seed a disposable DB and run a cycle for:
#      - a joiner on the 20th
#      - an old-regime employee with 80C/80D/HRA declarations
#      - taxable income exactly at and just above 12,00,000
#    Compare with hand-computed statutory values.
```

---

## 9. Conclusion

The repository **builds, typechecks, lints (with warnings) and passes its 292 backend tests**. That is a genuine baseline.

It is not evidence of production readiness. The audit's P0 findings are in code paths that these checks never exercise: authorization coverage, secret hygiene, tenant boundaries and statutory calculations. The absence of frontend, desktop, E2E and packaged-app tests is why several release-blocking UI and packaging defects survive in a green build.
