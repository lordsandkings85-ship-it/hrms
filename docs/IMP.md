# Workora HRMS — Implementation Plan (IMP)

**Version**: 2.0.0 · **Status**: Phase B complete, 4 of 17 phases done
**Rule**: every phase ends with verification (build/tests/API/live checks) before the next begins.

---

## 1. Mission & Ground Rules

Deliver a fully functional, production-ready HRMS & Payroll covering **every menu** in the brief, preserving the existing stack and data, with **no mock data, placeholder pages, dead buttons, or fake success messages**. Admin/HR/Employee are one system.

Non-negotiables: never remove/rename/re-hierarchize menus; don't replace architecture; reuse/fix existing APIs; no hardcoded business data; no destructive DB changes without migration + data-safety review; final end-to-end audit + Hostinger handoff at the end.

## 2. Status Ledger (completed)

| # | Phase | What was done | Verified |
|---|---|---|---|
| P0 | Security P0 (completed) | AES-256-GCM PII encryption (`crypto.util.ts`) + legacy CBC decrypt; permissions.guard self-bypass blocks; company-scoped payroll | `crypto.util.spec` (10+ cases); guards specs green; live 401 on bad login |
| P1 | Auth hardening (completed) | Helmet, CORS allow-list, `trust proxy 1`, auth throttling, timing-safe login, JWT access/refresh rotation, `.env`/`.env.example`/`render.yaml` config | Logins verified for all 3 portals; wrong password → 401 |
| P2 | MySQL foundation (Phase A) | Hostinger dump (87 tables) imported to Docker MySQL 8; backup at `backend/db-backups/hrms_prod_dump_2026-08-15.sql`; Prisma rebaselined to mysql (3 migrations applied, `migrate status` up to date) | 87 tables, 1 company, 3 users, 2 employees, 2 payroll cycles, 3 payslips, 18 attendance logs verified via SQL + API |
| P3 | Money hardening (Phase A) | 41 money columns → `DECIMAL(10,2)` (16 models); 32 TS errors fixed with `Number()`; `DecimalToNumberInterceptor` global | Build clean; API returns numeric `grossPay: 47068`; live payslip payloads numeric |
| P4 | Payroll correctness (Phase B) | FY25-26 tax (87A rebate 12L, surcharge 25%); runPayroll: structure by `effectiveFrom desc`, real LOP = working days − distinct logged working days (multi-punch dedupe, weekend exclusion) − holidays, shift allowance proration (`effectiveFrom < month end`), net ≥ 0 clamp; real attendance summary; real sendPayslips via nodemailer (MailService, env-gated) | **52/52 tests**; lint 0 errors; Aug 2026 payslips hand-verified (HR-001 net 43927.86 LOP 0; LKE1807 LOP 15 net 4364.29); summary ↔ payslip consistent; sendPayslips → 400 when SMTP unconfigured; HR-001 attendance backfilled (20 manual punches) |

## 3. Remaining Roadmap

Ordered to fail fast and end production-ready. Each phase: **Tasks → Verification**.

### P5 — Menus → Pages audit
- Walk every route in `Layout.tsx` (Admin 12 groups / HR 5 / Employee 9) against `pages/` + `routes/` routers.
- Inventory: which pages exist vs missing vs stubbed; build a per-route table (route → component → API calls → backend endpoints used).
- Flag dead imports, unused routes, duplicate pages.
- **Verify**: 100% of menu labels in PRD §3 resolve to a component; table exported as `docs/menu-coverage.md`.

### P6 — Pages → Buttons audit
- For each page: every visible button/action → real API call or real state change. No toast-only fakes, no inert controls.
- Fix or wire: forms → POST/PUT; tables → server data; exports → real files (jspdf present).
- **Verify**: click-through checklist per page (scripted API trace for a sample page per module).

### P7 — Portals (Admin / HR / Employee)
- Role-based nav filtering (`navigation/permissions.ts` + guards) end-to-end for all 3 accounts.
- HR portal approvals flows, employee self-service flows, admin control flows.
- **Verify**: login as all 3 seeded users; each sees exactly its PRD §3 menus; cross-role route access → 403.

### P8 — Flows (cross-module journeys)
- Join-to-exit journey: requisition → offer → joining → salary structure → attendance → leave → claims → performance → resignation → FnF → exit clearance.
- Payroll journey: attendance process → run payroll → review → send payslips.
- Approval journeys: leave / compoff / travel / advance / loan / shift / OT / regularization / corrections.
- **Verify**: each journey exercised via API with real rows; audit trail intact.

### P9 — DB / API completeness
- Match frontend `services/` calls to backend endpoints; create any missing CRUD handlers; align DTOs.
- Fix N+1 queries and missing indexes on hot paths (attendance, payslips, leave).
- **Verify**: `prisma migrate status` clean; no endpoint returns 404 for a page action; response times < 300ms locally.

### P10 — RBAC final
- Role/permission matrix per PRD §3; `RolePermissions` + `User Assignment` admin screens functional.
- Server-side permission coverage on all sensitive controllers.
- **Verify**: matrix test — each role × each route (scripted 401/403/200 checks).

### P11 — UI/UX polish
- Consistent tables/forms/modals/toasts; empty states; loading states; error states; light/dark/system theme; command palette; responsive layout.
- **Verify**: visual pass per portal; no broken layout at 1366×768 and mobile widths.

### P12 — Security & data integrity
- Re-audit: auth rate limits, refresh rotation edge cases, company-scope on every query, encryption of new PII fields, secrets in git (none), CORS final origin list.
- DB: constraints + cascade behavior audit.
- **Verify**: security checklist signed; `npm audit` triaged.

### P13 — Performance & reliability
- Index coverage for all `where`/`orderBy` in services; pagination everywhere; queue/cron job correctness (Bull, node-cron).
- **Verify**: load smoke (100 payroll-run iterations idempotent — same payslips); API p95 < 500ms.

### P14 — Error handling & observability
- Global exception mapping; user-friendly messages; logging for payroll/email failures; no unhandled rejections.
- **Verify**: error-injection pass (bad IDs, missing fields, SMTP down) — every failure surfaces cleanly.

### P15 — Testing complete
- Extend Jest coverage to the modules touched in P5–P14 (target: controllers + services happy/error paths).
- **Verify**: `npm test` fully green; `npm run lint` 0 errors; build clean.

### P16 — Production verification
- Rebuild against clean MariaDB (fresh import of dump + all migrations) — proves Hostinger replayability.
- Render deploy smoke: env vars, migrations on prod DB, login, payroll run.
- **Verify**: fresh-env checklist signed (PRD §6 acceptance criteria).

### P17 — Final audit & handoff
- End-to-end re-audit against PRD §6; menu coverage 100%; no dead buttons; data preserved.
- Handoff pack: PRD/TRD/IMP, migration files, `.env` template, backup dump, credentials summary, runbooks.
- **Verify**: user sign-off; final summary report.

## 4. Definition of Done (project-wide)

1. Every menu in PRD §3 opens a real, working page.
2. Every button performs a real operation; truthful errors otherwise.
3. All three portals work for seeded accounts with correct role filtering.
4. Payroll matches hand-computed fixtures; payslips emailable.
5. Build/lint/tests green; migrations replayable on MariaDB.
6. Final audit report delivered with the handoff pack.

## 5. Environment & Handoff Checklist

- [ ] Local MySQL container up (`hrms-mysql`), dump imported, backups current
- [ ] Backend `npm run start:prod` on `:5000`; frontend Vite dev works
- [ ] `.env` populated (secrets not committed; `ENCRYPTION_KEY` 32+ bytes)
- [ ] Hostinger MariaDB reachable → import dump → apply 3 migrations → `prisma migrate status` up to date
- [ ] Render service env vars set (render.yaml sync:false vars)
- [ ] SMTP credentials configured before first payslip email
- [ ] Super Admin / HR / Employee accounts verified on prod
- [ ] `docs/` (PRD, TRD, IMP, menu-coverage) included in handoff