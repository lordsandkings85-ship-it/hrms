# 07 — Electron / Desktop Audit

**Commit:** `8473ca0` · **Date:** 2026-11-04 · **Scope:** `desktop/`, packaging, GitHub release workflow, deployment config  
**Canonical IDs:** `DESK-001` … `DESK-018`  
**Important:** no installer was built or executed during this audit. Runtime-only conclusions are marked SUSPECTED.

---

## 1. Runtime and packaging facts

| Item | Value |
|---|---|
| Electron | **33.4.11** (pinned in `package-lock.json:4334-4337`) |
| electron-builder | 25.1.8 |
| electron-updater | 6.8.9 |
| Entry | `desktop/package.json:7` → `out/main/main.js` |
| Packaged files | `out/**/*`, `dist/renderer/**/*`, `package.json` (`:46-50`) |
| Extra resources | `resources/**/*` (`:51-58`) |
| Windows target | NSIS x64 (`:60-70`) |
| Artifact name | `Workora-HRMS-Setup-${version}.${ext}` (`:78`) |
| Publish target | GitHub `lordsandkings85-ship-it/hrms` (`:125-130`) |
| Local asar | `desktop/release/win-unpacked/resources/app.asar` — 22,388,628 B |
| App-update config | `release/win-unpacked/resources/app-update.yml:1-5` — provider github |
| Version consistency | backend / frontend / desktop / locks / `APP_VERSION` all `3.1.1` |

Published v3.1.1 assets observed: CI installer 86,869,681 B, a second human-uploaded installer 86,475,586 B, macOS DMGs and ZIPs, and `latest.yml`. **No `latest-mac.yml`.**

Local `release/latest.yml` points at a 87,002,805 B local installer — not the CI one.

---

## 2. Security baseline (sound)

`desktop/electron/main.ts:71-80` sets:

```ts
contextIsolation: true,
nodeIntegration: false,
sandbox: true,
webSecurity: true,
allowRunningInsecureContent: false,
experimentalFeatures: false,
webviewTag: false,
```

`security.ts:70-97` restricts navigation to the bundled renderer, opens external HTTP(S) in the system browser, and rejects webviews. `security.ts:28, 60-67` allow only `geolocation` and `notifications`, for trusted origins. `ipc.ts` validates payload types and lengths. The updater disables downgrade, prerelease, web installer and auto-download.

This is a good baseline. The findings below are about what it does **not** cover.

---

## 3. Findings

### DESK-001 — Platform guard accepts macOS (P1, CONFIRMED)

**Where:** `desktop/electron/platform-guard.ts:100-114`, copy at `:7-8`.

`evaluatePlatform` returns `supported: true` for `darwin`, while the dialog says Windows 10/11 only. Unsupported platforms are admitted and then fail unpredictably (including update, see DESK-010).

**Fix:** one supported-platform constant; reject anything outside it; align copy.

---

### DESK-002 — Unparseable Windows version fails open (P1, CONFIRMED)

**Where:** `platform-guard.ts:23-45, 100-114`.

When `osVersion` cannot be parsed, the guard returns `supported: true`. A malformed or spoofed string bypasses the Windows 10/11 check. Combined with `SEC-012` (server trusts client context), there is no reliable version gate anywhere.

**Fix:** fail closed on parse failure with a clear diagnostic.

---

### DESK-003 — Unsigned Windows and macOS builds (P1, CONFIRMED)

**Where:** `desktop/package.json:60-111`; `.github/workflows/desktop-release.yml:38, 78-82`.

- `mac.identity: null`, `mac.sign: false`, `hardenedRuntime: false`, `gatekeeperAssess: false`.
- No Windows Authenticode certificate; `CSC_IDENTITY_AUTO_DISCOVERY: false`.
- No notarization.

**Impact:** SmartScreen and Gatekeeper warnings; users cannot verify the publisher; enterprise deployment is blocked by policy.

**Fix:** Authenticode for Windows, Developer ID + notarization for macOS.

---

### DESK-004 — Updater verifies SHA-512 but not publisher (P1, CONFIRMED)

**Where:** `desktop/electron/updater.ts:22-34`.

`electron-updater` checks the SHA-512 in `latest.yml`, but `latest.yml` is itself an unsigned GitHub asset and `win.publisherName` is unset. A compromised release can deliver an unsigned binary that passes the checksum check.

**Fix:** code signing + publisher verification; sign the manifest assets.

---

### DESK-005 — No `win.publisherName` (P2, CONFIRMED)

`desktop/package.json:60-70` contains only `target` and `icon`. The updater therefore cannot check the Authenticode publisher. Set it once signing is enabled.

---

### DESK-006 — Release workflow can publish partial or wrong-tag releases (P1, CONFIRMED)

**Where:** `.github/workflows/desktop-release.yml:98, 119`.

```yaml
if: always() && !cancelled() && (needs.build-windows.result == 'success' || needs.build-macos.result == 'success')
...
tag_name: ${{ startsWith(github.ref, 'refs/tags/v') && github.ref_name || 'v3.1.1' }}
```

- The publish job runs if **either** platform succeeds → a Windows-only release can ship missing macOS assets (and vice versa).
- On `workflow_dispatch` from a branch, the tag falls back to literal `v3.1.1`, so a manual run can overwrite or attach mismatched assets to an existing release.

**Fix:** require both jobs; derive the tag from `package.json`; fail on tag/version mismatch; add a concurrency lock.

---

### DESK-007 — Renderer overwrites the device id (P2, CONFIRMED)

**Where:** `frontend/src/utils/deviceContext.ts:104-117`.

When a desktop context exists, the renderer spreads it and replaces `deviceId` with `getDeviceId()` from `localStorage`. Device identity in security logs is client-controlled and resettable by clearing storage.

**Fix:** preserve `desktop.deviceId`; send any renderer value as a separate untrusted signal.

---

### DESK-008 — IPC guard accepts any `file://` (P2, CONFIRMED)

**Where:** `desktop/electron/ipc-guard.ts:13-15`.

```ts
if (url.startsWith('file://')) return true;
```

Any local HTML page receives the full privileged preload API (dialogs, clipboard, printing, update install, device context).

**Fix:** compare against the exact `pathToFileURL(rendererIndex).href`.

---

### DESK-009 — No load-failure or crash handling (P2, CONFIRMED)

**Where:** `desktop/electron/main.ts:83-95, 140-145`.

The splash closes only on `ready-to-show`. There is no `did-fail-load`, `render-process-gone`, `unresponsive` or `child-process-gone` handler. A renderer failure leaves a permanent splash or blank window.

**Fix:** handlers that close the splash, show an error page, and offer retry/quit.

---

### DESK-010 — macOS in-app update cannot work (P2, CONFIRMED)

**Where:** `desktop/package.json:108-111`; `desktop/electron/updater.ts:124-131`; `desktop/MACOS_INSTALL.md:53-57`.

`dmg.writeUpdateInfo: false` → no `latest-mac.yml`; the published release has none. The app is unsigned, so Squirrel.Mac cannot replace it. `installUpdate` simply opens GitHub on darwin.

**Fix:** sign/notarize and publish `latest-mac.yml`, or remove the auto-update claim and present an explicit download flow.

---

### DESK-011 — CSP may not apply to `file://`, no meta fallback (P2, SUSPECTED)

**Where:** `desktop/electron/security.ts:37-56`; `frontend/index.html:1-28`.

CSP is injected only through `ses.webRequest.onHeadersReceived`, a network-stack hook. Electron does not guarantee it intercepts `file://` loads, and there is no `<meta http-equiv="Content-Security-Policy">` fallback. Runtime interception was **not tested**.

If the hook is bypassed, the packaged renderer has **no CSP**. If it applies, the inline theme script is blocked by `script-src 'self'` and Google Fonts are blocked by `font-src 'self' data:`.

**Fix:** meta CSP or a custom `app://` protocol; align `script-src`/`font-src`.

---

### DESK-012 — Packaged app may send `Origin: null` (P1, SUSPECTED)

**Where:** `backend/src/main.ts:50-61`; `frontend/src/api/client.ts:137-146`; `desktop/electron/security.ts:33-35`.

A `file://` document has an opaque origin serialized as `null`. The backend allows a **missing** origin (`if (!origin)`) but not the literal string `"null"`.

**If confirmed:** login, refresh and every authenticated screen fail in the packaged app, making the release unusable.

**Blocker:** the actual Render `CORS_ORIGINS` value is `sync: false` and not in the repository, so deployment-specific configuration could mitigate it.

**Fix:** packaged smoke test that captures the Origin; allow `null` narrowly for the desktop client, or move to a custom `app://` protocol.

**This is the single most important desktop item to test before shipping.**

---

### DESK-013 — Cron sleeps with the Render free plan (P2, CONFIRMED)

**Where:** `render.yaml:5`; `backend/src/app.module.ts:44`; `attendance-auto-mark.service.ts:18`; `leave-accrual.service.ts:12`.

`plan: free`; `@Cron` jobs run inside the web process, which Render suspends after inactivity. Attendance auto-marking, leave accrual and scheduled announcements can be skipped entirely.

**Fix:** always-on instance or an external scheduler/worker.

---

### DESK-014 — Blocking OS probes before splash (P2, CONFIRMED)

**Where:** `desktop/electron/main.ts:172-191`; `environment-risk.ts:74-86, 94-104, 158, 219-267`.

`collectDeviceContext()` runs synchronous `reg`, `tasklist`, `wmic`/PowerShell and file probes with 5–6 s timeouts **before** `createSplashWindow()`. The startup report can add another 6 s. On slow or locked-down machines the app shows nothing for tens of seconds.

**Fix:** splash first, async probes with caching and an overall startup budget.

---

### DESK-015 — No desktop CI; tracked `out/` is stale (P2, CONFIRMED)

**Where:** `.github/workflows/ci.yml:8-43`; `desktop/out/main/main.js:29` vs `desktop/electron/security.ts:34`.

CI has only backend and frontend jobs. `electron-vite build` transpiles without typechecking. The committed `out/main/main.js` predates the source change adding `https://*.onrender.com` to the CSP, so tracked output and source disagree.

**Fix:** desktop CI job (`tsc --noEmit`, `electron-vite build`); stop tracking `desktop/out/`.

---

### DESK-016 — `copy:renderer` merges stale bundles (P3, CONFIRMED)

**Where:** `desktop/package.json:13-14`.

`fs.cpSync('../frontend/dist', 'dist/renderer', { recursive: true })` without a prior delete merges into the existing directory. Local renderer contained **678 files across five build dates**; a clean `frontend/dist` has **158 files**. Local and CI installers differ in size (87,002,805 vs 86,869,681 B).

**Fix:** delete `dist/renderer` before copying; build releases only in CI.

---

### DESK-017 — Electron 33 is end-of-life (P3, CONFIRMED)

Electron supports the latest three stable majors. Electron 33 is outside that window and receives no Chromium security backports. The packaged app embeds Chromium 130-era code while handling payroll and statutory PII.

**Fix:** upgrade to a supported major; add a quarterly check.

---

### DESK-018 — Wrong issue-tracker URL (P4, CONFIRMED)

**Where:** `desktop/electron/menu.ts:109-112`.

"Report Issue" opens `https://github.com/Workora/hrms/issues`; the repository is `lordsandkings85-ship-it/hrms`.

---

## 4. Deployment configuration

### Render (`render.yaml`)

| Line | Value | Issue |
|---|---|---|
| 5 | `plan: free` | Sleeps → cron skipped (DESK-013) |
| 7 | `npm install --include=dev && npx prisma generate && npm run build` | No `prisma migrate deploy` (DB-014) |
| 8 | `npm run start:prod` | No health/readiness (API-002) |
| 22-23 | refresh 7d | No logout (SEC-014) |
| 26-27 | `CORS_ORIGINS` `sync: false` | Unknown; relevant to DESK-012 |

### Vercel (`frontend/vercel.json`)

Only SPA rewrites. No CSP, HSTS, frame-ancestors, Referrer-Policy or Permissions-Policy (`FE-013`).

### Docker Compose (`docker-compose.yml`)

Starts `postgres:16-alpine` and `redis:7-alpine`, while Prisma uses MySQL and the README refers to a non-existent `hrms-mysql` service (`DB-013`). Local development setup is broken.

### GitHub Releases

- v3.1.1 publishes both a CI installer and a second, orphaned Windows installer.
- macOS DMGs/ZIPs are published despite the release body claiming "strictly packaged for Windows x64 … no Linux/macOS/mobile bundles".
- `latest.yml` points at the CI installer; the local `latest.yml` points at a different file.

---

## 5. Release integrity assessment

| Control | Status |
|---|---|
| Windows Authenticode | **Missing** |
| macOS Developer ID + notarization | **Missing** |
| `win.publisherName` | **Missing** |
| Update manifest signing | **Missing** |
| SHA-512 update check | Present |
| Partial-release prevention | **Missing** |
| Tag/version consistency check | **Missing** |
| Reproducible build | **Missing** (stale asset merge) |
| Desktop CI | **Missing** |

**Assessment:** the release channel is not trustworthy enough for payroll software. Users cannot verify the publisher, and two different binaries exist for the same version.

---

## 6. Positive controls

- Renderer hardening flags all correctly set.
- Navigation and window-open restrictions; external links opened in the system browser.
- Webviews blocked; `webviewTag: false`.
- Permissions allow-list (geolocation, notifications) restricted to trusted origins.
- IPC payload validation and length limits.
- Updater disables downgrade, prerelease, web installer and auto-download.
- Backend fails fast on missing secrets.
- Version numbers consistent at `3.1.1`.

---

## 7. Recommended desktop work, in order

1. **Run a packaged smoke test for DESK-012** (CORS `Origin: null`). If it fails, the release is unusable — fix before anything else.
2. **Add a meta CSP and verify it under the packaged runtime** (DESK-011).
3. **Fix the release workflow** (DESK-006) — require both platforms and derive the tag.
4. **Sign and notarize** (DESK-003/004/005).
5. **Add desktop CI and stop tracking `out/`** (DESK-015).
6. **Add crash/load handling** (DESK-009) and fix startup probing (DESK-014).
7. **Upgrade Electron** (DESK-017).
8. **Clean the renderer copy step** (DESK-016).

---

## 8. NOT TESTED

| Item | Reason |
|---|---|
| Installer build and execution | Not run; would create binaries and modify state |
| Install/update flow | Requires a signed release and a test machine |
| Windows 10/11 compatibility matrix | No trusted test matrix |
| macOS behaviour | No macOS hardware/VM |
| `Origin: null` CORS | Requires running the packaged app against the backend (DESK-012, SUSPECTED) |
| CSP interception of `file://` | Requires runtime instrumentation (DESK-011, SUSPECTED) |
| Auto-update end to end | Requires a published newer version |

No claim in this report asserts that the installer runs, installs, or updates successfully.
