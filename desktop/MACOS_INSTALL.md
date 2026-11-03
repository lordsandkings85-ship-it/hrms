# Workora HRMS Desktop — macOS Installation Guide

Workora HRMS Desktop is available for Apple Silicon (`arm64`) and Intel (`x64`) Macs as an unsigned DMG installer. Because it is distributed directly without Apple Developer notarization, macOS Gatekeeper may display a security notice on first launch.

---

## 1. Choose the Correct Installer

| Your Mac Processor | DMG File |
| :--- | :--- |
| **Apple Silicon (M1, M2, M3, M4)** | `Workora-HRMS-arm64-<version>.dmg` |
| **Intel Processor** | `Workora-HRMS-x64-<version>.dmg` |

*(To check your Mac's processor, click the Apple menu  at the top left → **About This Mac**).*

---

## 2. Installation Steps

1. **Open the DMG**: Double-click the downloaded `.dmg` file to mount it.
2. **Install the Application**: Drag the **Workora HRMS** icon into the **Applications** folder shortcut in the DMG window.
3. **Eject the DMG**: In Finder, click the Eject icon next to `Workora HRMS` in the sidebar.
4. **Open Applications**: Navigate to Finder → **Applications** and locate **Workora HRMS**.

---

## 3. Opening on macOS (Gatekeeper First-Launch Approval)

Because the application is built without Apple Developer ID signing or notarization, macOS Gatekeeper may show a warning:
> *"Workora HRMS" cannot be opened because Apple cannot check it for malicious software.*  
> or  
> *"Workora HRMS" is an app downloaded from the internet.*

To open the application:

### **Method A (Recommended: Right-Click Open)**
1. Open your **Applications** folder in Finder.
2. **Right-click** (or **Control-click**) on `Workora HRMS.app`.
3. Select **Open** from the context menu.
4. When the confirmation prompt appears, click **Open**. (You only need to do this once; future launches open normally).

### **Method B (System Settings)**
1. Try opening `Workora HRMS` once from Applications (to trigger the notice).
2. Open **System Settings** (or **System Preferences**).
3. Go to **Privacy & Security**.
4. Scroll down to the **Security** section.
5. You will see: *"Workora HRMS was blocked from use because it is not from an identified developer."*
6. Click **Open Anyway**.
7. Enter your Mac password/Touch ID when prompted, and confirm by clicking **Open**.

---

## 4. Updates on macOS
Because the macOS build is distributed as an unsigned DMG, automatic background in-place replacement via Squirrel.Mac is disabled to comply with Apple's bundle integrity rules. When an update is released:
1. The in-app update banner will alert you that a new version is available.
2. Click **Download Update** to open the latest release on GitHub.
3. Download the new `.dmg` and drag to replace the existing application in `/Applications`.

