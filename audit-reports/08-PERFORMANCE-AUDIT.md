# 08 — Performance Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04  
**Canonical IDs:** `PERF-001` … `PERF-012`  
**Method:** static analysis of query patterns, bundle output and caching configuration. **No load test, profiling session or production metrics were available.**

---

## 1. Summary

| Area | Risk | Headline |
|---|---|---|
| Payroll run | **High** | Serial per-employee queries inside one interactive transaction |
| API query patterns | **Medium** | Unbounded lists; per-request authorization queries |
| Frontend bundle | **High** | 938 kB ExcelJS + 357 kB jsPDF + 421 kB charts statically imported |
| Caching | **Medium** | Aggressive refetch; 5-minute stale permission cache |
| Indexes | **Medium** | No tenant/date composite for payroll-wide scans |
| Desktop startup | **Medium** | Synchronous OS probes before the splash |
| Deployment | **Medium** | Free tier sleeps; no connection-pool sizing |

Absolute latency numbers are **NOT TESTED** because no running environment was available. Severity reflects structural risk at expected HRMS scale (hundreds to low thousands of employees per tenant).

---

## 2. Findings

### PERF-001 — Payroll transaction loop (P1, CONFIRMED)

**Where:** `backend/src/modules/hr/payroll/payroll.service.ts:247-470`.

Inside one interactive `$transaction`, the code loops over every employee and issues:

1. `payslip.findFirst` for the employee/cycle,
2. `payslip.update` or `payslip.create`,
3. related writes.

For 500 employees that is **>1,000 round-trips** inside a single transaction, holding locks for the duration.

**Risks**

- Transaction timeout (Prisma default interactive timeout is 5 s unless overridden).
- Lock contention with attendance or payout writes.
- A single failure rolls back the entire payroll run.

**Fix**

1. Precompute every payslip row in memory (salary, attendance, holidays, tax already fetched in bulk).
2. `createMany` or batched `upsert` (with `DB-003` unique constraint).
3. Move email/notification work outside the transaction.
4. Add a 500-employee benchmark to CI or a pre-release check.

**Complexity:** Medium. **Expected gain:** order-of-magnitude reduction in payroll time.

---

### PERF-002 — Heavy export libraries in the main bundle (P1, CONFIRMED)

Production build chunk sizes:

| Chunk | Size |
|---|---:|
| `exceljs` | 938.27 kB |
| charts (Recharts) | 421 kB |
| `jspdf` | 357 kB |
| `PayslipPreviewModal` | 340 kB |
| `index` (main) | 227 kB |

`exceljs` and `jspdf` are only needed when a user exports. Static imports mean every user downloads them on first load, and the desktop renderer pays the parse cost at startup.

**Fix:** `const ExcelJS = await import('exceljs')` inside the export handler; same for jsPDF; lazy-load chart routes.

**Complexity:** Low. **Expected gain:** several hundred kB off the critical path.

---

### PERF-003 — Refetch-on-mount always plus focus refetch (P1, CONFIRMED)

**Where:** `frontend/src/main.tsx` — `queryClient` defaults.

Every tab switch and every remount reloads lists. Combined with `PERF-006` (per-request authorization query), this multiplies DB load.

**Fix:** set a `staleTime` appropriate to each resource (e.g. 30 s for lists, 5 min for reference data), disable `refetchOnMount: 'always'`, and invalidate targeted queries after mutations.

**Complexity:** Low.

---

### PERF-004 — Unbounded list endpoints (P2, CONFIRMED)

**Where:** `leave.service.ts:616-651`, `companies.service.ts:316-326`, `documents.service.ts:14-16`.

`findMany` without `take`/`skip` on tenant-wide collections. Memory and response time grow linearly with tenant size; serialization of large JSON becomes the bottleneck.

**Fix:** hard caps (e.g. 200) plus cursor pagination; return a `meta.nextCursor`.

**Complexity:** Medium (client changes).

---

### PERF-005 — Missing composite index for payroll-wide attendance scans (P2, CONFIRMED)

**Where:** `schema.prisma:107-108`.

`AttendanceLog` has `@@index([employeeId, date])`, which serves single-employee lookups but not the payroll-wide query that filters by company and date range across all employees.

**Fix:** add an index matching the actual predicate (likely `[employeeId, date]` plus a company-scoped path), and verify with `EXPLAIN` on a restored copy. Do **not** add indexes speculatively; confirm the query plan first.

**Complexity:** Low. **Verification:** NOT TESTED (no populated database).

---

### PERF-006 — `isGroupWideUser` query on nearly every request (P2, CONFIRMED)

**Where:** `backend/src/utils/group-access.util.ts:9-18`.

Each call loads the user with role permissions. It is invoked from `CompanyScopeGuard:24` and again from multiple services in the same request.

**Fix:** resolve capabilities once at login, embed a compact capability set in the session/JWT, and cache with invalidation on role change.

**Complexity:** Medium. **Security note:** any caching must preserve revocation semantics (see `PERF-007`).

---

### PERF-007 — Permission cache is per-process, 5-minute TTL, no invalidation (P2, CONFIRMED)

**Where:** `permissions.guard.ts:12, 32-48`.

An in-memory `Map` with `CACHE_TTL_MS = 5 * 60 * 1000`. There is no pub/sub and no per-instance coordination.

**Consequences**

- Revoked permissions persist up to 5 minutes (security-relevant).
- Multiple Render instances disagree about a user's grants.

**Fix:** shorten TTL, invalidate on role/permission change, or use a shared cache with events.

**Complexity:** Medium.

---

### PERF-008 — Recharts 421 kB loaded for dashboard charts (P2, CONFIRMED)

Charts are only needed on dashboard/analytics screens but are in a shared chunk. **Fix:** lazy-load the chart route or use a lighter library.

**Complexity:** Low.

---

### PERF-009 — Monolithic components block route-level splitting (P2, CONFIRMED)

**Where:** `OrganizationPage.tsx` (1,726 lines), `AdvancedEmployeeForm.tsx` (1,462), `Layout.tsx` (1,216), `LeaveSections.tsx` (779).

Large statically imported route components inflate the initial chunk and re-render broadly.

**Fix:** split by feature; `React.lazy` per route; extract hooks.

**Complexity:** High.

---

### PERF-010 — Verbose `console.log` in hot paths (P3, CONFIRMED)

Backend `console.log` remains in request/payroll paths (`main.ts:92` and services). Costs I/O and can leak PII into logs.

**Fix:** structured logger with levels and redaction.

---

### PERF-011 — Full-row queries including encrypted PII (P2, CONFIRMED)

Several services `findMany` without `select`, pulling encrypted PII columns that are then decrypted. This over-fetches and widens in-memory exposure.

**Fix:** explicit `select` per endpoint; decrypt only what is returned.

**Complexity:** Medium.

---

### PERF-012 — No Prisma pool sizing (P3, SUSPECTED)

No `connection_limit` in `DATABASE_URL` and no pool configuration. Free-tier hosts have low connection caps. Runtime exhaustion was not measured, so this is SUSPECTED.

**Fix:** set an explicit connection limit appropriate to the host; monitor pool saturation.

---

## 3. Frontend bundle strategy

Recommended split:

| Route group | Load strategy |
|---|---|
| Auth | eager (small) |
| Dashboard | eager shell, lazy chart library |
| Employees | lazy |
| Payroll | lazy; export libraries loaded on click |
| Organization | lazy (and split internally) |
| Reports | lazy; Excel/PDF on demand |

Expected outcome: main chunk under ~250 kB, export libraries removed from the critical path.

---

## 4. Backend query patterns

| Pattern | Where | Assessment |
|---|---|---|
| Bulk pre-fetch then loop | Payroll (`:134-180`) | Good, but then the loop writes per row (`PERF-001`) |
| N+1 in includes | Various services | `include` is generally used correctly; the problem is writes, not reads |
| Unbounded `findMany` | Leave, documents, companies | Fix with caps (`PERF-004`) |
| Per-request auth query | `isGroupWideUser` | Cache (`PERF-006`) |
| Raw SQL union | `CompanyScopeGuard` (28 tables) | Parameterised and bounded by table list; acceptable |
| Wide row fetches | Several services | Add `select` (`PERF-011`) |

---

## 5. Caching assessment

| Layer | Current | Recommendation |
|---|---|---|
| Permissions | 5-min in-memory Map | Short TTL + invalidation events |
| Auth capabilities | Recomputed per request | Embed compact set in session |
| Reference data (departments, roles) | Refetched aggressively | `staleTime` 5–15 min |
| List data | Refetch on mount + focus | `staleTime` 30–60 s |
| Static assets | Vite hashed filenames | Good |
| HTTP caching | Not configured for API | Consider ETag for reference endpoints |

---

## 6. Desktop startup performance

`main.ts:172-191` runs `collectDeviceContext()` and `runStartupGate()` before `createSplashWindow()`. `environment-risk.ts` performs synchronous `reg`, `tasklist`, `wmic`/PowerShell and file probes with 5–6 s timeouts; the startup report can add another 6 s.

On a slow or locked-down machine this can mean **tens of seconds with no UI** (`DESK-014`), which users interpret as a hang and often resolve by killing and relaunching.

**Fix:** splash first; async probes with an overall budget (e.g. 2 s) and cached results.

---

## 7. Scalability risks by tenant size

| Employees | Expected pain |
|---|---|
| < 100 | Payroll loop tolerable; bundle still slow on mobile web |
| 100–500 | Payroll transaction may approach timeout; unbounded lists noticeable |
| 500–2,000 | Payroll lock contention; missing indexes hurt; memory spikes on lists |
| > 2,000 | Unbounded queries and per-row writes become blocking |

These thresholds are **estimates**, not measurements. Validate with a restored dataset and a benchmark harness before quoting them externally.

---

## 8. Recommended performance work, in order

1. **Dynamic-import ExcelJS/jsPDF** (`PERF-002`) — hours, largest frontend win.
2. **Batch the payroll write path** (`PERF-001`) — days, largest backend win.
3. **Fix query cache defaults** (`PERF-003`) — hours.
4. **Cap and paginate lists** (`PERF-004`) — days.
5. **Cache authorization capabilities** (`PERF-006/007`) — days, coordinate with security.
6. **Add indexes only after `EXPLAIN`** (`PERF-005`).
7. **Lazy-load charts and split monoliths** (`PERF-008/009`).

---

## 9. NOT TESTED

| Item | Reason |
|---|---|
| Response times, p95/p99 | No running deployment |
| Payroll duration at scale | Would write data; not authorized |
| Bundle gzip sizes | Build reports raw sizes only |
| Query plans | No populated database |
| Memory under concurrent load | No load test |
| Desktop startup timing | Installer not executed |

All structural findings are from source at `8473ca0` and the local production build output.
