# Workora HRMS Desktop — Multi-Platform Release Process

Workora HRMS Desktop produces production-ready installers for both **Windows** (NSIS `.exe`) and **macOS** (Apple Silicon + Intel `.dmg`).

---

## 1. Build Commands

Run commands from the `desktop` directory:

| Platform | Command | Output Artifact |
| :--- | :--- | :--- |
| **Windows x64** | `npm run build:win` | `release/Workora-HRMS-Setup-<version>.exe` |
| **macOS Apple Silicon (M1/M2/M3/M4)** | `npm run build:mac:arm64` | `release/Workora-HRMS-arm64-<version>.dmg` |
| **macOS Intel (x64)** | `npm run build:mac:x64` | `release/Workora-HRMS-x64-<version>.dmg` |
| **macOS (Both Architectures)** | `npm run build:mac` | Both ARM64 and x64 DMGs + ZIP bundles |

---

## 2. Build Pipeline Details

Each build script runs `build:all` prior to packaging:
1. `build:frontend`: Runs `cd ../frontend && npm run build` (compiled Vite React bundle).
2. `build:desktop`: Runs `electron-vite build` (compiles Electron main & preload TypeScript).
3. `copy:renderer`: Copies `../frontend/dist` into `desktop/dist/renderer` using cross-platform Node.js `fs.cpSync`.
4. `electron-builder`: Packages the application for the requested platform.

---

## 3. macOS Signing & Notarization Policy

* **No Apple Developer ID Required**: The macOS build configuration has `identity: null` and `dmg.sign: false`.
* **Zero Cost**: Builds succeed without Apple Developer account credentials or certificates.
* **Gatekeeper First-Run**: macOS Gatekeeper will show a notice on first launch for unsigned applications. Users can open it via **Right-click → Open** or **System Settings → Privacy & Security → Open Anyway** (see [`MACOS_INSTALL.md`](./MACOS_INSTALL.md)).

---

## 4. Cross-Platform DevOps / CI Strategy

Because macOS DMGs should be compiled on macOS runners and Windows EXEs on Windows runners:
* **Windows Build Machine**: Run `npm run build:win`.
* **macOS Build Machine / CI Runner**: Run `npm run build:mac`.
* The GitHub Actions workflow (`.github/workflows/desktop-release.yml`) builds both environments simultaneously on `windows-latest` and `macos-latest` runners when a release tag is pushed.

---

## 5. Artifacts Overview in `desktop/release/`

* **Windows**:
  - `Workora-HRMS-Setup-<version>.exe` (Installer)
  - `Workora-HRMS-Setup-<version>.exe.blockmap` (Differential update map)
  - `latest.yml` (Windows auto-update manifest)
* **macOS**:
  - `Workora-HRMS-arm64-<version>.dmg` (Apple Silicon installer)
  - `Workora-HRMS-x64-<version>.dmg` (Intel installer)
  - `Workora-HRMS-arm64-<version>-mac.zip`
  - `Workora-HRMS-x64-<version>-mac.zip`
