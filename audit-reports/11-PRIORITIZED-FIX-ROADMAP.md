# 11 — Prioritized Fix Roadmap

**Commit:** `8473ca0` · **Date:** 2026-11-04  
**Inputs:** `12-FULL-ISSUE-INVENTORY.json` (138 findings: 6 P0, 41 P1, 71 P2, 18 P3, 2 P4)

---

## 1. Guiding principles

1. **Stop the bleeding before building.** Credential exposure and cross-tenant reads are not "tech debt"; they are active risk.
2. **Fix classes, not instances.** Patching four endpoints without fixing `PermissionsGuard` guarantees a fifth.
3. **Money before features.** Payroll and tax correctness outranks any new screen.
4. **Every fix gets a test.** A fix without a regression test is a future regression.
5. **Ship nothing unsigned.** Desktop distribution is blocked until release integrity is restored.

Effort is expressed in **engineer-days** for one experienced full-stack engineer with repository familiarity. Ranges reflect uncertainty, not padding.

---

## 2. Phase 0 — Immediate containment (0–72 hours)

**Goal:** remove active exposure and stop new data loss. No feature work.

| # | Action | Findings | Effort | Owner |
|---|---|---|---|---|
| 0.1 | Make the GitHub repository **private** | SEC-001 | 0.1 d | Repo owner |
| 0.2 | Rotate **every** credential present in dumps/scripts: all user passwords, DB password, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, SMTP | SEC-001, SEC-002 | 0.5 d | Ops |
| 0.3 | Revoke all `RefreshToken`/session rows; force re-login everywhere | SEC-001, SEC-014 | 0.2 d | Backend |
| 0.4 | Disable `admin@acme.com` and remove the three hardcoded emails | SEC-002, SEC-016 | 0.1 d | Backend |
| 0.5 | Begin Git history purge of dumps and credential scripts (`git filter-repo`), force-push, invalidate forks | SEC-001, SEC-002 | 0.5 d | Repo owner |
| 0.6 | **Pause desktop distribution** or publish an explicit "unsigned, verify checksum" warning | DESK-003 | 0.1 d | Release owner |
| 0.7 | Notify affected employees per applicable privacy law | SEC-001 | process | Legal |

**Exit criteria**

- Repository is private.
- All rotated credentials are live; old ones rejected.
- Refresh tokens invalidated.
- `admin@acme.com` cannot authenticate.
- No dump or credential file remains in the working tree.

**Do not wait for Phase 1 to start 0.1–0.4.**

---

## 3. Phase 1 — Tenant isolation and authorization (week 1–2)

**Goal:** make cross-tenant access impossible by construction, not by memory.

| # | Action | Findings | Effort | Depends on |
|---|---|---|---|---|
| 1.1 | Fix `GET /companies/:id/employees` — require permission + ownership check | SEC-004 | 0.3 d | — |
| 1.2 | Fix `GET /group/employees` — explicit group-admin capability + filter | SEC-005 | 0.3 d | 1.5 |
| 1.3 | Fix `GET /documents/all` — permission + tenant scope + signed URLs | SEC-006 | 0.5 d | — |
| 1.4 | Remove unscoped leave fallbacks; add `CompanyScopeGuard` to leave | SEC-007 | 0.5 d | — |
| 1.5 | Replace `isGroupWideUser` heuristics with `User.isGroupAdmin` or `organization:manage_all` | SEC-003, SEC-016 | 2 d | — |
| 1.6 | Make `PermissionsGuard` **default-deny**; add `@Public`/`@SelfService` markers | SEC-011 | 2–3 d | 1.5 |
| 1.7 | Add `CompanyScopeGuard` to projects and announcements; scope their queries | SEC-008, SEC-009 | 0.5 d | 1.6 |
| 1.8 | Harden `assign-employees` with per-record ownership + history + audit | SEC-010 | 0.5 d | 1.5 |
| 1.9 | Add negative cross-tenant integration tests for every fixed route | all above | 1 d | 1.1–1.8 |
| 1.10 | Add an architecture test: every non-public route has guards | API-001 | 1 d | 1.6 |

**Exit criteria**

- A tenant-A admin receives 403/404 for every tenant-B resource.
- No route is reachable with only `JwtAuthGuard`.
- CI fails if a new controller lacks guards.
- `isGroupWideUser` no longer keys off role names or email addresses.

**Risk if deferred:** every multi-tenant customer can read every other customer's payroll data.

---

## 4. Phase 2 — Payroll and attendance correctness (week 2–4)

**Goal:** pay people correctly before the next cycle.

| # | Action | Findings | Effort | Depends on |
|---|---|---|---|---|
| 2.1 | Filter salary structures to `effectiveFrom <= periodEnd` | BL-003 | 0.2 d | — |
| 2.2 | Load `TaxDeclaration` and map rent/city/80C/80D/home-loan into `TaxInput` | BL-004 | 1 d | — |
| 2.3 | Implement 87A marginal relief (both regimes) | BL-005 | 0.3 d | — |
| 2.4 | Branch surcharge by regime; restore 37% above ₹5 Cr for old regime | BL-006 | 0.2 d | — |
| 2.5 | Clip payroll window to joining/last-working dates | BL-007 | 1 d | — |
| 2.6 | Fix overnight shift end-day rollover | BL-001 | 0.3 d | — |
| 2.7 | Derive attendance date keys from company timezone | BL-002 | 1 d | DB-002 |
| 2.8 | Add golden payroll tests: joiner, leaver, old regime, 87A boundary, surcharge | 2.1–2.7 | 1 d | — |
| 2.9 | Add YTD ledger and monthly TDS true-up | BL-011 | 2 d | 2.2 |
| 2.10 | State-wise professional tax slabs | BL-012 | 2 d | — |
| 2.11 | Resolve PF/ESI manual-flag semantics | BL-013 | 0.5 d | — |

**Exit criteria**

- Golden tests pass against hand-computed statutory values.
- A joiner on the 20th is paid 10/22, not 45%.
- Night-shift required minutes are positive and correct.
- 87A boundary shows marginal relief, not a cliff.

**Risk if deferred:** employees are under/over-paid and TDS is wrong; corrections require amended filings.

---

## 5. Phase 3 — Session, secrets and desktop integrity (week 3–5)

| # | Action | Findings | Effort | Depends on |
|---|---|---|---|---|
| 3.1 | Add `POST /auth/logout` and `/auth/logout-all` with token revocation | SEC-014 | 0.5 d | — |
| 3.2 | Move refresh tokens to OS secure storage (desktop) / httpOnly cookie (web); access token in memory | SEC-013 | 2 d | 3.1 |
| 3.3 | Remove the login-page `logout()` effect | FE-001 | 0.1 d | — |
| 3.4 | Wire company context: login/`me` → store → selector; call `switchCompany` | FE-002, FE-017 | 1 d | — |
| 3.5 | Fix leave fetches and monthly-allocation method | FE-003, FE-004, API-007 | 0.5 d | — |
| 3.6 | Add secret scanning (gitleaks) to CI and pre-commit | SEC-023 | 0.5 d | 0.5 |
| 3.7 | Require `CORS_ORIGINS` in production; remove suffix wildcard | SEC-017 | 0.2 d | — |
| 3.8 | Add meta CSP / custom `app://` protocol; verify packaged runtime | DESK-011 | 1–2 d | — |
| 3.9 | Fix release workflow: require both platforms, derive tag, concurrency lock | DESK-006 | 0.5 d | — |
| 3.10 | Add desktop CI (`tsc --noEmit`, `electron-vite build`); stop tracking `out/` | DESK-015 | 0.5 d | — |
| 3.11 | Complete MFA verify/disable/recovery | SEC-018, MF-003 | 2 d | — |
| 3.12 | Add desktop crash/load handling; splash before probes | DESK-009, DESK-014 | 1 d | — |

**Exit criteria**

- Logout invalidates the refresh token server-side.
- No token in `localStorage`.
- Company switching works and is tested.
- Packaged app passes a CORS/CSP smoke test (`DESK-012`, `DESK-011`).
- A partial release cannot publish.

---

## 6. Phase 4 — Data integrity and database hardening (week 4–6)

| # | Action | Findings | Effort | Depends on |
|---|---|---|---|---|
| 4.1 | Deduplicate and add `@@unique` for AttendanceLog, Payslip, PermissionRequest, Holiday, SalaryStructure | DB-002…DB-006 | 1.5 d | — |
| 4.2 | Add `prisma migrate deploy` to Render pre-deploy; add drift check | DB-014, DB-017 | 0.3 d | — |
| 4.3 | Soft-delete employees; restrict hard delete; `Restrict` payroll/attendance relations | DB-001, DB-010, DB-016 | 3 d | 4.1 |
| 4.4 | Add idempotency keys for payroll and allocation | API-011 | 1 d | 4.1 |
| 4.5 | Fix local dev: Compose with MySQL; align README | DB-013 | 0.3 d | — |
| 4.6 | Batch payroll writes (`createMany`/`upsert`), move email outside transaction | PERF-001 | 2 d | 4.1 |
| 4.7 | Migrate money/balances to `Decimal` with dual-read period | DB-007 | 5 d | 4.1 |
| 4.8 | Enums/check constraints for statuses; validate JSON columns | DB-011, DB-015 | 3 d | — |
| 4.9 | Add indexes after `EXPLAIN` validation | PERF-005 | 0.5 d | 4.6 |

**Exit criteria**

- Duplicate payroll slips and attendance rows are impossible at the DB level.
- Deleting an employee cannot erase payslips.
- A fresh deployment migrates itself.
- Payroll for 500 employees completes inside the transaction budget.

---

## 7. Phase 5 — Quality gates and missing capabilities (week 5–9)

| # | Action | Findings | Effort |
|---|---|---|---|
| 5.1 | Add Vitest + Testing Library; 10 smoke tests for P1 frontend flows | FE-008, MF-002 | 2 d |
| 5.2 | Add Playwright E2E (login, refresh, leave, payroll fixture) | MF-002 | 3 d |
| 5.3 | Add packaged desktop smoke test (login + list + manifest) | MF-002, DESK-012 | 1 d |
| 5.4 | Add `/health` and `/ready`; shutdown hooks | API-002, API-014 | 0.5 d |
| 5.5 | Add OpenAPI and generate the frontend client | API-003, FE-009 | 3 d |
| 5.6 | Add DTOs to remaining mutations | API-004, API-005, API-009 | 3 d |
| 5.7 | Password reset flow | MF-001 | 1.5 d |
| 5.8 | Per-account lockout + CAPTCHA | API-006, MF-009 | 1.5 d |
| 5.9 | Audit-log viewer + bulk-read logging | MF-004, SEC-021 | 2 d |
| 5.10 | Mail queue with retry/DLQ | MF-007 | 1.5 d |
| 5.11 | Bank/NEFT export | MF-006 | 2 d |
| 5.12 | Vercel security headers | FE-013 | 0.2 d |

---

## 8. Phase 6 — Longer-term hardening (post-stabilisation)

| # | Action | Findings | Effort |
|---|---|---|---|
| 6.1 | Code signing + notarization + publisher verification | DESK-003/004/005 | 3 d + procurement |
| 6.2 | macOS update metadata or remove auto-update claim | DESK-010 | 1 d |
| 6.3 | Electron upgrade to a supported major | DESK-017 | 3 d |
| 6.4 | Leave rule engine (overlap, max-consecutive, eligibility, gender, attachment) | BL-008/009/015/024 | 5 d |
| 6.5 | Split monolithic components; lazy-load exports/charts | FE-010, PERF-002/008/009 | 5 d |
| 6.6 | Statutory returns (PF ECR, ESIC, 24Q, PT) | MF-005 | 8–12 d |
| 6.7 | Backup/DR runbook and restore drill | MF-008 | 2 d |
| 6.8 | Malware scanning for uploads | MF-010, SEC-019 | 3 d |
| 6.9 | i18n and WCAG 2.2 AA | MF-011, MF-012, FE-016 | 8 d |
| 6.10 | Device attestation (if enforcement is truly required) | SEC-012, DESK-002 | 5 d |

---

## 9. Dependency graph (critical path)

```
Phase 0 (containment)
   └─→ Phase 1 (tenant isolation)
          ├─→ Phase 2 (payroll correctness)
          │      └─→ Phase 4.6/4.7 (batch + Decimal)
          └─→ Phase 3 (sessions + desktop)
                 └─→ Phase 5 (quality gates)
                        └─→ Phase 6 (hardening)
```

Do not start Phase 5 feature work before Phase 1 is complete: adding features to a fail-open authorization model increases the attack surface.

---

## 10. Verification per phase

| Phase | Verification |
|---|---|
| 0 | Old credentials rejected; refresh tokens invalid; repo private; no dumps tracked |
| 1 | Cross-tenant negative tests green; architecture test green; manual two-tenant walkthrough |
| 2 | Golden payroll tests green; hand-computed values match; night-shift and joiner fixtures pass |
| 3 | Logout invalidates session; no token in storage; packaged smoke test green; partial release blocked |
| 4 | DB rejects duplicates; delete cannot remove payslips; fresh deploy migrates; 500-employee benchmark |
| 5 | E2E green in CI; OpenAPI diff clean; health endpoint returns DB status |
| 6 | Signed installer passes SmartScreen/Gatekeeper; accessibility audit report; statutory export reconciled |

Each phase closes only when the verification is **automated** and runs in CI.

---

## 11. Effort summary

| Phase | Focus | Engineer-days |
|---|---|---:|
| 0 | Containment | ~1.5 + legal/process |
| 1 | Tenant isolation | ~8–9 |
| 2 | Payroll/attendance correctness | ~9 |
| 3 | Sessions + desktop integrity | ~11 |
| 4 | Database hardening | ~17 |
| 5 | Quality gates + missing capabilities | ~21 |
| 6 | Long-term hardening | ~40+ |
| **Total** | | **~108–120** |

Phase 0–2 (~19 days) is the minimum to make the system safe for real payroll data. Phase 3–4 (~28 days) is the minimum for a responsible desktop and multi-tenant release.

---

## 12. What "done" looks like

- No public secret material, and CI prevents recurrence.
- Cross-tenant access is impossible and proven by tests.
- Payroll matches hand-computed statutory values for representative cases.
- Logout actually revokes; tokens are not in web storage.
- The desktop installer is signed, publisher-verified, and reproducibly built.
- A fresh deployment migrates itself and reports health.
- Every P1 flow has at least one automated test.

Until then, this build should not process real employee data or be distributed to end users.

---

## 13. Notes on estimates

- Estimates assume one engineer familiar with NestJS, Prisma and React.
- They exclude review time, QA cycles, procurement of code-signing certificates, and legal review of statutory formulas.
- They are planning aids, not commitments. Validate the largest items (DB-007 Decimal migration, Phase 6 statutory returns) with a spike before committing.
- No fix has been applied during this audit; this roadmap is a proposal awaiting approval.
