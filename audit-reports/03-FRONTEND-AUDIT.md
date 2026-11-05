# 03 — Frontend Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04 · **Scope:** `frontend/` (React + TypeScript + Vite)  
**Canonical IDs:** `FE-001` … `FE-017`; performance items cross-reference `PERF-*`.

---

## 1. Summary

| Metric | Value |
|---|---|
| Pages | 131 |
| Route entries | 130 (126 `path:`) |
| Components (shared) | 24 |
| TypeScript/TSX files | 172 `.tsx`, 214 `.ts` (repo-wide) |
| `any` / `as any` occurrences | 1,663 |
| Largest component | `OrganizationPage.tsx` — 1,726 lines |
| Test runner | **none** |
| Build | PASS (`npx tsc -b`, `npm run build`) |
| Largest chunks | exceljs 938.27 kB, charts 421 kB, jspdf 357 kB, PayslipPreviewModal 340 kB, index 227 kB |

The frontend builds cleanly and is visually complete, but **three core flows are broken by construction**: login session handling, company context, and two leave screens. None of these are caught because there are no frontend tests.

**Severity distribution:** 4 × P1, 9 × P2, 3 × P3, 1 × P4.

---

## 2. Findings

### FE-001 — Login page destroys valid sessions (P1, CONFIRMED)

**Where:** `frontend/src/pages/auth/LoginPage.tsx:20`

```tsx
useEffect(() => { useAuthStore.getState().logout(); }, []);
```

Every mount of `/login` clears tokens. A user redirected to login after a transient 401 loses a still-valid refresh token. "Back to login" is destructive.

**Fix:** delete the effect; clear state only on explicit logout.

---

### FE-002 — Company context is stale; switching is dead code (P1, CONFIRMED)

**Where:** `frontend/src/api/client.ts:17-19`; `frontend/src/store/useAuthStore.ts:61-87`

- Every request reads `activeCompanyId` directly from `localStorage`.
- `switchCompany` is defined but has **zero call sites**.
- `CompanySelector` (`FE-017`) is imported nowhere.

**Consequences:** multi-company users either omit the company header (undefined) or send a value left over from a previous user on a shared machine.

**Fix:** populate `activeCompanyId` from login/`me`; wire the selector to `switchCompany`; clear on logout; read from the store rather than raw storage.

---

### FE-003 — Leave employee dropdowns are broken in both deployments (P1, CONFIRMED)

**Where:** `frontend/src/pages/admin/leave/sections/LeaveSections.tsx:115-119`, `:697-701`

```tsx
const res = await fetch('/api/v1/employees?page=1&pageSize=200', {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
setEmployees(json.data.items || []);
```

Two independent defects:

1. **Relative URL bypasses `API_BASE`.** In the packaged desktop app the request resolves to `file:///C:/api/v1/...`. On Vercel the SPA rewrite serves `index.html`, so `res.json()` throws or yields HTML.
2. **Wrong response shape.** The shared client returns a payload that does not nest as `data.items`.

**Fix:** use `employeesApi`/`api()`; correct the shape; add a component test.

---

### FE-004 — Monthly allocation calls GET against a POST route (P1, CONFIRMED)

**Where:** `frontend/src/api/client.ts:572-578` ↔ `backend/src/modules/hr/leave/leave.controller.ts:248`

The client helper builds a query string and calls `api()` with no method, so it issues `GET`. The backend declares `@Post('monthly-allocation')`. The admin action always fails.

**Fix:** pass `{ method: 'POST' }`; add a contract test that asserts method + path (this is the class of bug API-003/OpenAPI would prevent).

---

### FE-005 — Super-admin actions shown to everyone (P2, CONFIRMED)

**Where:** `frontend/src/pages/admin/employees/EmployeesPage.tsx:157-160`, `:585-615`

"Create login", "Reset password" and "Toggle login" render without an `isSuperAdmin` check. The backend guards them with `SuperAdminGuard` (`employees.controller.ts:83-117`), so non-super-admins get 403s.

**Fix:** capability-gate the controls identically to the backend; disable with an explanatory tooltip.

---

### FE-006 — Navigation permissions use role-name substrings (P2, CONFIRMED)

**Where:** `frontend/src/navigation/permissions.ts:33-47`

Menu visibility is derived from substrings in the role name. This duplicates — and diverges from — the backend's permission grants. Users see menus they cannot use, and may miss menus they are entitled to.

**Fix:** drive navigation from the server-provided permission list.

---

### FE-007 — `role.isSystem` treated as super-admin (P2, CONFIRMED)

**Where:** `frontend/src/App.tsx:163`

The route guard treats `role.isSystem` as equivalent to super-admin. The backend uses it differently (and inconsistently — see SEC-003). The two authorization models disagree.

**Fix:** use explicit permissions from the server; make `isSystem` mean "non-editable" only.

---

### FE-008 — No frontend test infrastructure (P2, CONFIRMED)

**Where:** `frontend/package.json:8-12`

Scripts are `dev`, `build`, `preview`, `lint`. No test runner, no testing-library, no E2E.

The three P1 defects above would each be caught by a single test: mount login → assert token retained; call monthly allocation → assert POST; render leave screen → assert employee options.

**Fix:** Vitest + Testing Library for units, Playwright for E2E, both wired into CI.

---

### FE-009 — 1,663 `any` / `as any` (P2, CONFIRMED)

**Where:** repository-wide

The type system is routinely bypassed at the API boundary. `FE-003`'s `json.data.items` is a direct consequence: the response was never typed.

**Fix:** generate types from the OpenAPI schema (API-003) and tighten incrementally.

---

### FE-010 — Monolithic components (P2, CONFIRMED)

**Where:**

| File | Lines |
|---|---:|
| `pages/admin/organization/OrganizationPage.tsx` | 1,726 |
| `components/employees/AdvancedEmployeeForm.tsx` | 1,462 |
| `components/layout/Layout.tsx` | 1,216 |
| `pages/admin/leave/sections/LeaveSections.tsx` | 779 |

These files cannot be reviewed or tested effectively, and they block route-level code splitting (`PERF-009`).

---

### FE-011 — Refetch policy overloads the API (P2, CONFIRMED)

**Where:** `frontend/src/main.tsx` — `queryClient` defaults

`refetchOnMount: 'always'` plus `refetchOnWindowFocus: true` with no meaningful `staleTime`. Every tab switch reloads lists. This amplifies `PERF-006` (per-request group lookup) and adds visible flicker.

---

### FE-012 — Errors are swallowed (P2, SUSPECTED)

**Where:** multiple pages

Several `catch` blocks set an empty list or do nothing. Users see blank screens with no cause; support has no signal. Marked SUSPECTED because the full set of handlers was not enumerated line-by-line in this audit.

---

### FE-013 — No web security headers (P2, CONFIRMED)

**Where:** `frontend/vercel.json:1-8`

Only SPA rewrites are configured. There is no `Content-Security-Policy`, `Strict-Transport-Security`, `frame-ancestors`, `Referrer-Policy` or `Permissions-Policy`.

**Fix:** add a `headers` block; set `frame-ancestors 'none'`, HSTS, and a CSP compatible with the built assets and fonts.

---

### FE-014 — One global error boundary (P3, CONFIRMED)

**Where:** `frontend/src/App.tsx:395-399`; `components/ui/ErrorBoundary.tsx`

A single boundary wraps the app, so one component crash blanks the entire product. **Fix:** wrap route subtrees and offer retry.

---

### FE-015 — Production `console.*` calls (P3, CONFIRMED)

13 statements ship to production. **Fix:** route through a logger and strip in production builds.

---

### FE-016 — Accessibility gaps (P3, SUSPECTED)

Static review finds icon-only buttons without `aria-label` and modals without focus traps. No axe run was performed, so this is SUSPECTED rather than measured. **Fix:** labels, focus management, Escape handling, axe in CI.

---

### FE-017 — Dead `CompanySelector` (P4, CONFIRMED)

The component exists but is imported nowhere. It makes company switching look implemented when it is not (`FE-002`). **Fix:** delete or wire it up.

---

## 3. Routing and access control

- 130 route entries, 126 with `path:`.
- Route rendering is gated in `App.tsx`; the guard consults role name and `isSystem` (FE-006/FE-007).
- There is no route-level lazy loading for the heaviest pages (`PERF-009`).
- Unknown paths fall through to the dashboard or a not-found page; deep links are handled by the Vercel rewrite.

**Risk:** because the client guard is the only thing hiding admin screens, a user can navigate directly to a route and see the shell. Data still fails server-side where guards exist — but where the backend is fail-open (SEC-011), the client is the only barrier.

---

## 4. State and API client

| Concern | Observation |
|---|---|
| Token storage | `localStorage` for access + refresh (`SEC-013`) |
| Token refresh | Implemented in `client.ts`; retries the original request |
| Company header | Read from raw `localStorage` on every call (`FE-002`) |
| Error handling | Mixed; some paths throw, some swallow (`FE-012`) |
| Base URL | Hardcoded production default (`P3-1` in desktop report) |
| Response shape | Inconsistent; a source of `FE-003` |
| Direct `fetch` usage | Two leave screens bypass the client (`FE-003`) |

The API client is the right idea, but it is bypassed exactly where it matters (bulk employee lists) and its response contract is not typed.

---

## 5. Bundle analysis

Production build output (gzipped size not reported by the tool; raw chunk sizes):

| Chunk | Size |
|---|---:|
| `exceljs` | 938.27 kB |
| charts (Recharts) | 421 kB |
| `jspdf` | 357 kB |
| `PayslipPreviewModal` | 340 kB |
| `index` (main) | 227 kB |

`exceljs`, `jspdf` and charts are only needed for export/analytics screens but are statically imported. This is the single largest frontend performance win available (`PERF-002`, `PERF-008`).

---

## 6. UX observations

- Empty states are inconsistent: several lists show nothing on error rather than an error message (FE-012).
- The login page advertises features (geofencing, payroll, RBAC, exit management) that the audit found partially implemented or broken.
- Version strings are consistent (`APP_VERSION = '3.1.1'`, `frontend/src/constants/index.ts:63`).
- The theme bootstrap is an inline script in `index.html`, which conflicts with the desktop CSP (`DESK-011`).
- Google Fonts are loaded from `fonts.googleapis.com`, which the desktop CSP blocks when it applies (`DESK-011`).

---

## 7. Positive checks

- No `dangerouslySetInnerHTML` anywhere in the frontend.
- A global `ErrorBoundary` exists and wraps `App`.
- No hardcoded third-party API keys or private keys in source.
- `tsc -b` and `vite build` both pass.
- The client implements refresh-token rotation and retry of the failed request.
- Package version, lockfile and `APP_VERSION` all agree at `3.1.1`.

---

## 8. Recommended frontend work, in order

1. **Remove the login logout effect** (FE-001) — one line, high impact.
2. **Fix the two leave fetches and the monthly-allocation method** (FE-003, FE-004) — small, unblocks admin workflows.
3. **Wire company context** (FE-002, FE-017) — login/`me` → store → selector.
4. **Add a test runner and 10 smoke tests** (FE-008) covering login, company switch, leave apply, monthly allocation, employee list.
5. **Split the four monoliths and lazy-load export/chart libraries** (FE-010, PERF-002).
6. **Align UI capabilities with backend guards** (FE-005, FE-006, FE-007).
7. **Add Vercel security headers** (FE-013).

---

## 9. NOT TESTED

| Item | Reason |
|---|---|
| Browser rendering and interaction | No dev server was started; audit is static |
| Accessibility (axe/WCAG) | No browser automation run |
| Responsive layout at device breakpoints | Not exercised |
| Runtime behaviour of the packaged renderer | Installer not executed (see `07`) |
| Real API response shapes | No authenticated environment available |

Findings are based on source at `8473ca0`; build output reflects a local production build.
