# 05 — Database Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04 · **Scope:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/`  
**Canonical IDs:** `DB-001` … `DB-017`

---

## 1. Inventory

| Metric | Value |
|---|---|
| Provider | **MySQL** (`schema.prisma:6`) |
| Models | 100 |
| Relations | 152 |
| Indexes | 43 |
| Unique constraints | 14 |
| Cascading deletes | 58 |
| `SetNull` | 3 |
| `Restrict` | 2 |
| Migration directories | 17 |
| `prisma validate` | PASS |
| `prisma format --check` | **FAIL** |

The schema is valid and reasonably normalized, but it is missing several **natural-key uniqueness constraints** that the application's correctness depends on. It also has a hard-delete cascade policy that conflicts with statutory retention.

---

## 2. Findings

### DB-001 — Employee hard delete cascades across 58 relations (P1, CONFIRMED)

**Where:** `employees.service.ts:354-362`; `schema.prisma` (`onDelete: Cascade`).

```ts
async remove(companyId, userId, id) {
  ...
  return this.prisma.$transaction([
    this.prisma.employee.delete({ where: { id } }),
    ...
  ]);
}
```

`Employee` cascades into `AttendanceLog`, `Payslip`, `LeaveRequest`, `SalaryStructure`, `TaxDeclaration`, `EmployeeDocument` and 52 other relations.

**Impact:** deleting an employee erases payroll and attendance history that may be legally required to be retained. This is an irreversible destructive operation exposed through the UI.

**Fix**

1. Replace with soft delete: `status: 'terminated'`, `deletedAt`.
2. Restrict hard delete to a super-admin maintenance path with a retention check.
3. Change `onDelete` to `Restrict` for payroll, attendance and document relations.

**Complexity:** High (migration + all queries must respect `deletedAt`).

---

### DB-002 — `AttendanceLog` has no unique `(employeeId, date)` (P1, CONFIRMED)

**Where:** `schema.prisma:76-108` (index at `107-108`).

```prisma
@@index([employeeId, date])
```

An index is not a constraint. Duplicate day rows are possible from retries, concurrent check-ins, or the unscoped fallback paths.

**Impact:** duplicate attendance rows double-count paid days and corrupt payroll (`BL-002`).

**Fix:** `@@unique([employeeId, date])` after deduplicating existing rows.

---

### DB-003 — `Payslip` has no unique `(employeeId, payrollCycleId)` (P1, CONFIRMED)

**Where:** `schema.prisma:734-750`.

The payroll loop uses `findFirst` then `update`/`create` (`PERF-001`). Without a constraint, concurrent or retried runs can create duplicate payslips.

**Fix:** add the unique constraint and switch to `upsert`; add idempotency (`API-011`).

---

### DB-004 — `PermissionRequest` has no natural-key uniqueness (P1, CONFIRMED)

**Where:** `schema.prisma:127-146`.

No unique on `(employeeId, date, fromTime)`. Duplicate corrective requests and conflicting approvals are possible.

**Fix:** add the unique constraint and handle conflicts explicitly (return the existing request).

---

### DB-005 — `Holiday` has no unique `(companyId, date)` (P1, CONFIRMED)

**Where:** `schema.prisma:597-605`.

**Impact:** duplicate holidays are double-subtracted when counting working days (`BL-022`).

**Fix:** `@@unique([companyId, date])` and deduplicate.

---

### DB-006 — `SalaryStructure` has no unique `(employeeId, effectiveFrom)` and no `companyId` (P1, CONFIRMED)

**Where:** `schema.prisma:908-923`.

- No uniqueness → duplicate revisions for the same date (`BL-021`).
- No direct `companyId` → tenant scoping must go through the employee relation, making queries slower and easier to get wrong.

**Fix:** `@@unique([employeeId, effectiveFrom])`; consider a denormalized `companyId` with an index for scope queries.

---

### DB-007 — Money and balances use `Float` (P2, CONFIRMED)

**Where:** `schema.prisma:174-205, 691-702`.

Floating-point arithmetic in payroll and leave balances produces drift. The application rounds in places (e.g. `Math.round` on payslip totals), which masks rather than fixes the issue.

**Fix:** migrate to `Decimal(12,2)` (money) and `Decimal(6,2)` (days); add rounding tests. **Complexity:** High — requires a data migration and a period of dual reads.

---

### DB-008 — `User.email` is globally unique (P2, CONFIRMED)

**Where:** `schema.prisma:1036`.

The same person cannot hold accounts in two tenants. In a multi-tenant product this forces either account sharing or email aliasing, and makes login ambiguous.

**Fix:** `@@unique([companyId, email])` plus an explicit cross-tenant identity table if one login should span tenants.

**Complexity:** High (identity model change).

---

### DB-009 — `Role` has no unique `(companyId, name)` (P2, CONFIRMED)

**Where:** `schema.prisma:897-906`.

Duplicate roles with divergent grants. Because authorization is name-based (`SEC-003`), duplicates make the outcome ambiguous.

**Fix:** `@@unique([companyId, name])` and deduplicate.

---

### DB-010 — No soft-delete/retention columns (P2, CONFIRMED)

No `deletedAt`/`archivedAt` on `Employee`, `Payslip`, `AttendanceLog` and related models. Accidental deletion is unrecoverable and retention policy cannot be expressed.

**Fix:** add `deletedAt` plus query scoping; define retention windows per entity.

---

### DB-011 — Status fields are free-form strings (P2, CONFIRMED)

Status and type columns are `String` with defaults; there are no enums or check constraints. A typo (`'aproved'`) creates an unreachable state that no filter matches.

**Fix:** Prisma enums or DB check constraints; migrate existing values with a backfill.

---

### DB-012 — Schema fails `prisma format --check` (P2, CONFIRMED)

`prisma validate` passes; `prisma format --check` reports differences. Formatting drift creates noisy diffs and hides real changes in review.

**Fix:** run `prisma format` (note: this modifies the schema file, so it was **not** run during this read-only audit) and add a CI check.

---

### DB-013 — Compose provisions PostgreSQL while the schema is MySQL (P2, CONFIRMED)

**Where:** `docker-compose.yml:3-13`; `schema.prisma:6`; `README.md:24-26`.

Compose starts `postgres:16-alpine` and `redis:7-alpine`. The README tells developers to start a non-existent `hrms-mysql` service. Prisma expects MySQL.

**Impact:** a new developer cannot get a working local database from the repository.

**Fix:** replace the Postgres service with MySQL (and only the dependencies actually used), or change the provider consistently. Either way, align `README.md`.

---

### DB-014 — Render deploy never runs `prisma migrate deploy` (P2, CONFIRMED)

**Where:** `render.yaml:7-8`.

Build: `npm install --include=dev && npx prisma generate && npm run build`. Start: `npm run start:prod`. No migration step.

**Impact:** a fresh or restored deployment starts against an unmigrated schema. `HOSTINGER.md:178` even instructs operators to use `prisma migrate deploy` — but nothing automates it.

**Fix:** add `npx prisma migrate deploy` as a pre-deploy command; fail the deploy if it fails.

---

### DB-015 — JSON columns are unvalidated (P3, CONFIRMED)

**Where:** `schema.prisma:742-743` and other `Json` columns (`breakdown`, `companySnapshot`, `metadata`).

Arbitrary structure is accepted. Malformed JSON breaks payslip rendering and audit reconstruction.

**Fix:** validate with Zod on write; version the payload shape.

---

### DB-016 — Cascades bypass retention rules (P3, CONFIRMED)

58 `Cascade`, 3 `SetNull`, 2 `Restrict`. Most business entities cascade from `Company` or `Employee`. Parent deletion silently erases regulated records without application checks.

**Fix:** use `Restrict` for payroll/attendance/document relations and handle deletion explicitly in services.

---

### DB-017 — Migration drift unknown (P2, NOT TESTED)

17 migration directories exist, but no authorised database connection was available, so `prisma migrate status` was not run against any environment. Production schema may differ from the migration history.

**Fix:** run `prisma migrate status` against a restored copy; add a drift check before deploy.

---

## 3. Index review

| Area | Current | Gap |
|---|---|---|
| Attendance by employee/day | `@@index([employeeId, date])` | Missing `companyId` path and date-first index for payroll-wide scans (`PERF-005`) |
| Employee by company | Indexed | Adequate |
| Payslip by cycle | Via relation | No unique, no covering index for cycle-wide fetch |
| Holiday by company/date | No unique | Duplicate rows possible |
| Audit log | Timestamp index | No actor/entity composite for investigations |
| Leave request | Employee/status indexes | No overlap-supporting range index |

The `20260815000400_hot_path_indexes` migration added several indexes, but the gaps above remain.

---

## 4. Data-safety observations

- The repo contains **real production dumps** (`SEC-001`). Treat every value in every table as already disclosed.
- `Employee` stores Aadhaar/PAN/passport/bank fields; encryption utilities exist (`crypto.util.ts`) but the dump shows plaintext-era data.
- `Payslip.breakdown` is a JSON blob, which makes statutory recomputation dependent on the stored shape.
- `AuditLog` exists and is written on mutations, but there is no viewer (`MF-004`) and bulk reads are not logged (`SEC-021`).

---

## 5. Recommended database work, in order

1. **Add the five missing unique constraints** (DB-002 … DB-006) after deduplicating. This is the highest correctness win per hour.
2. **Stop hard deletes** (DB-001) — soft delete plus `Restrict`.
3. **Add `prisma migrate deploy` to the deploy pipeline** (DB-014) and a drift check (DB-017).
4. **Fix local dev setup** (DB-013).
5. **Migrate money to `Decimal`** (DB-007) — plan carefully with a dual-read period.
6. **Enums for statuses** (DB-011) and JSON validation (DB-015).

---

## 6. NOT TESTED

| Item | Reason |
|---|---|
| Live schema vs migrations | No DB connection (`DB-017`) |
| Query plans / index usage | Requires a populated database |
| Data quality (duplicates, orphans) | Not queried; would require a restored copy |
| Migration rollback behaviour | Not executed |

All schema facts are read from `schema.prisma` and the 17 migration SQL files at `8473ca0`.
