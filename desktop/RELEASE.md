# Workora HRMS Desktop — Release Process

The desktop app ships auto-updates via **GitHub Releases** using `electron-updater`
(`publish.provider: github`, owner `lordsandkings85-ship-it`, repo `hrms` — see
`package.json`).

## Prerequisites

- GitHub repo `lordsandkings85-ship-it/hrms` exists and you can create Releases /
  upload assets (either via the web UI, or a `GH_TOKEN` for CLI publishing).
- `desktop/node_modules` installed (`npm install`).

## Steps for a new version (e.g. v0.2.0)

1. **Bump the version** in `desktop/package.json`:
   - `"version": "0.2.0"` (electron-builder + electron-updater derive everything
     from this single field).

2. **Build the full Windows installer**:

   ```powershell
   cd desktop
   npm run electron:build:win
   ```

   This runs, in order:
   - `build:frontend` → `cd ../frontend && npm run build` (uses the production
     API URL from `desktop/.env.production`, currently the Render backend)
   - `build:desktop` → `electron-vite build` (main + preload)
   - copies `../frontend/dist` into `desktop/dist/renderer`
   - `electron-builder --win` (NSIS, x64) writing to `desktop/release/`

3. **Artifacts produced** in `desktop/release/`:
   - `Workora-HRMS-0.2.0-Setup.exe` — the installer users download
   - `Workora-HRMS-0.2.0-Setup.exe.blockmap` — differential-update map
   - `latest.yml` — the pointer file the auto-updater reads first

4. **Publish to GitHub** (choose one):

   - **Web UI (recommended here — `gh` CLI is not installed):**
     - Go to `https://github.com/lordsandkings85-ship-it/hrms/releases/new`
     - Tag: `v0.2.0` (semver must start with `v`)
     - Title: `v0.2.0` + release notes (mention the Leave Balance edit + in-app
       update banner)
     - Attach all three files from step 3 (`.exe`, `.blockmap`, `latest.yml`)
     - Publish. Do **not** mark as "latest" if you also host `v0.1.0` there —
       `latest.yml` is the real source of truth and must reference 0.2.0.

   - **CLI (requires a token):**
     ```powershell
     cd desktop
     $env:GH_TOKEN="<token>"
     npx electron-builder --win --publish always
     ```

5. **Verify the update feed** is reachable at the latest-release redirect:

   ```
   https://github.com/lordsandkings85-ship-it/hrms/releases/latest/download/latest.yml
   ```
   It should list version `0.2.0`, the `sha512` of the installer, and the
   `Workora-HRMS-0.2.0-Setup.exe` filename.

## How the client updates

- Windows NSIS + `electron-updater`: on startup (10 s delay) and every 4 h the
  app checks `latest.yml` in the background (production builds only — dev mode
  never auto-checks).
- When an update is available the **in-app UpdateBanner** appears, plus the
  **About & Updates** page (`/about`, reachable from the top-bar info icon in
  the desktop app) shows status, available version, a live download progress
  bar, and errors.
- Flow: **Check for Updates** → **Download Update** (background, progress%) →
  **Restart & Update**. Installation is **never automatic**: `autoInstallOnAppQuit`
  is `false`, so a restart only happens when the user explicitly clicks
  **Restart & Update**.
- Offline / network errors surface as a friendly message instead of a silent
  native dialog.
- Note: auto-update is **Windows-only right now** (we only build the NSIS target).

## Gotchas

- A Release tag like `v0.1.0` must exist for the update feed to work; at least
  one published release is required so `latest` resolves.
- The Render backend must be redeployed to match the new UI before users see
  the new balance-edit feature — otherwise the UI calls a stale API.
- `latest.yml` cannot be served from work-in-progress branches; always upload it
  to the GitHub Release for the tagged version.
- Any installers built before this fix embedded a stale `publish` target
  (owner `Workora` — a repo that does not exist) and therefore cannot
  self-update; everybody must install `0.2.0` fresh. Only releases on
  `lordsandkings85-ship-it/hrms` will feed the auto-updater.