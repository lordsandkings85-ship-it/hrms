# Workora HRMS — Product Requirements Document (PRD)

**Product**: Workora Enterprise Human Resource Management System (HRMS)
**Version**: 2.0.0 · **Status**: In active development (multi-phase buildout)
**Repository**: `D:\work\HRMS` (backend + frontend monorepo)

---

## 1. Product Overview

Workora HRMS is a multi-tenant, enterprise-grade HR & Payroll platform delivered as **one system with three portals**:

| Portal | Audience | Purpose |
|---|---|---|
| **Admin Portal** | Super Admin / System Admin / Company Admin | Full organizational control: setup, masters, payroll, compliance, recruitment, reports |
| **HR Portal** | HR Managers | Operational HR work: approvals, attendance overrides, evaluations, recruitment management |
| **Employee Portal** | All employees | Self-service: profile, payslips, leave, claims, attendance, performance, exit |

### 1.1 Product principles (non-negotiable)

1. **Never remove, rename, or re-hierarchize menus** — every menu/nested menu in the original brief must exist and work.
2. **No mock data, placeholder pages, dead buttons, or fake success messages.** Every visible action must perform a real operation against the database.
3. **Do not replace the existing architecture** — extend and fix the existing React + NestJS stack.
4. **No hardcoded business or payroll data.** All rules (tax slabs, PF/ESI, LOP) computed from config tables.
5. **Reuse/fix existing APIs** rather than duplicating endpoints.
6. **No destructive DB changes** without a migration and data-safety review.
7. **One system** — Admin, HR, and Employee portals share the same backend, database, and role model.
8. Every phase ends with verification (UAT-style) before moving on.

### 1.2 Target environment

- **Dev**: Windows + Docker (MySQL 8.0.46 on `127.0.0.1:3306`), backend `:5000`, frontend Vite.
- **Prod**: Hostinger **MariaDB 11.8** database (final handoff), backend deployed on Render (`render.yaml`), frontend static hosting.
- Production data is the live Hostinger dump imported into local MySQL (87 tables, 1 company, 3 users, 2 employees).

---

## 2. Users & Roles

| Role | Description | Portals | Representative account (demo) |
|---|---|---|---|
| **Super Admin** | Platform owner; multi-tenant control, billing, integrations | Admin | `2018@lordsandkings.co` |
| **System Admin / Company Admin** | Full company configuration & payroll authority | Admin | — |
| **HR Manager** | Approvals, attendance, performance, recruitment ops | HR | `hr@lordsandkings.co` |
| **Manager** | Evaluations, target approval, leave approval | HR + Employee | — |
| **Employee** | Self-service | Employee | `sathish@lordsandkings.co` |

RBAC is role-driven via `navigation/permissions.ts` (frontend) + `permissions.guard` (backend); every route carries an explicit permission set.

---

## 3. Information Architecture (complete menu inventory)

### 3.1 Admin Portal — `Layout.tsx` (NAV_GROUPS)

| Group | Menu | Sub-menus |
|---|---|---|
| **Navigation** | Dashboard | — |
| | Employees | All Employees · Salary · Shift Assign · Resigned/Separation · Final Settlement · Payslip · Assets · Loans/Salary Advances · Bulk Compliance Update · Send Employee Login Credentials · Import Reporting Managers & EmailId · Transfer |
| | TDS Details | Tax Liability · Pending Employee TDS Declarations · Employee TDS Declaration Master · Employee TDS Declaration List |
| | Attendance | Apply Attendance · Update Attendance · Emp Custom Daily Attendance · Attendance Regularisation · Overtime · Geo Attendance · Daily Attendance Report · Monthly Attendance Report |
| | Leave Details | Leave Requests List · Leave Balance · Comp Off |
| | Salary | Attendance Process · Additional Salary Payout · Run Payroll · View Processed Salary · Send Payslips |
| | Salary Revision | Employeewise · Arrears · Salary History · Bonus · Promotion |
| | Claims/Advances | Travel Claims · Advance Claim |
| | Performance Appraisal | KPA · KRA/KPI List · Assign KPI · KRA · KPI · Appraisal Year Target Setup · Periodic Target Setup · Approve Targets · Peer Evaluation Setup · External Evaluation Setup · Employee Evaluation · View Scorecard · View Periodic Scorecard · 360-Evaluation Summary · More Forms |
| | Recruitment | Setup (Panel Members · Job Description · Job Advertisement List · Consultant Registration List) · Requisitions (Pending for Approval · Requisitions · Assigned · Assign) · Resume Bank (Resume List · Pending for Approval · Comment On Resume · Candidate's Reference) · Manage (Assign Resume for screening · Interview Schedule · Interview Schedule List · Interview FeedBack List · Change Status-Interview · Selected Candidates · Hiring Approved/Rejected · Offered candidates · Offer Declined · Revised offers · Meeting with Candidates · Convert to an Employee) · More Forms |
| | System Settings (system admin) | Company Setup Forms · HR Forms · Payroll Forms · Statutory Compliance · Task Management · Role Permissions · User Assignment |
| | Company Setup | Company Profile · Org Structure (Branch/Location · Employee Category · Department · Designations · Grade (Pay Cadre)) · Rule Setup (Configure Employee ID · Salary Calendar · Payroll Masters · HR Masters) · Leave (Leave Code) · Holidays (General · Flexible · Weekly Off · Special) · Shift Setup (Define Shift · Attendance Policy · Compoff/Overtime Policy) · Salary Setup (Salary Head · Salary Structure) · Compliance Setup (Professional Tax · Provident Fund · ESIC · Labour Welfare Fund · TDS Sec. Category · TDS Investment Declaration · TDS Income Slab Category · TDS Income Slabs · More Compliance Forms) · More Forms |
| | Report Builders | Employee Information · Monthly Attendance · Monthly Salary · Monthly Salary Summary · Employee Salary Structure |
| | HR Forms / Payroll Forms | — |
| | Payroll Statutory Compliance | — |
| | More | Equipment & Assets · Projects & Tasks · Travel Requests · Training & Courses · Announcements · Exit Management · Billing & Plan · Integrations |
| | Get Support (Helpdesk) | — |

### 3.2 HR Portal — `HR_NAV_GROUPS`

| Menu | Sub-menus |
|---|---|
| Dashboard | — |
| Approvals | Leave · Cancel Leave Application · COL/COFF Application · Travel Claim · Advance Claim · Loan/Advance · Shift Change · Optional Holidays · Overtime (O.T) |
| Attendance Override | Correction Request Approval · Mark Attendance Approval · Regularization Approval · Geo Attendance Approval · Team Daily Attendance Report |
| Performance Appraisal | Manager Evaluation · Approve Targets · View Scorecard · View Periodic Scorecard |
| Recruitment | Requisitions · Resumes for screening · Interview Schedule List · Interview FeedBack List |
| More | Company Setup Forms · HR Forms · Payroll Forms · Statutory Compliance · Recruitment · Performance Appraisal · Task Management |

### 3.3 Employee Portal — `EMPLOYEE_NAV_GROUPS`

| Menu | Sub-menus |
|---|---|
| Dashboard | — |
| Personal Detail | My Profile · Assets Allocated |
| Salary Details | Pay slips · Form 16 · Loan/Salary Advance · Investment Declaration · IT Statement · Salary Revision History |
| Leave | Apply Leave · Cancel Leave · Apply COL/COFF Application · COL/COFF History · Flexible Holiday Request |
| Claims/Reimbursement | Claims · Advance Claim |
| Attendance | Apply Attendance · Correction Request · Training/Tour Request · Shift Change Request · View Attendance · Custom View Attendance |
| Helpdesk | Ticket Request · Ticket History |
| Responsibilities | KPIs · KRAs · Evaluation/Self Appraisal · View Scorecard |
| More | Employee Directory · Suggestions/Feedback/Complains · Separation (Request · Department Clearance · Exit Interview) · Company Announcements · Newsletter/Policies · Other HR links · Other Salary links · Job Opening links · Performance links |

---

## 4. Functional Requirements

Each requirement is tagged `FR-<module>-<n>`. Modules map 1:1 to backend controllers (see TRD §5).

### 4.1 Auth & Security (`FR-AUTH`)
- **FR-AUTH-1** Login with email/password; timing-safe comparison; wrong credentials → 401.
- **FR-AUTH-2** JWT access (15 min) + refresh (7 day) token pair; refresh rotation with revocation.
- **FR-AUTH-3** Company scoping on every tenant query (company-scope guard); cross-tenant access forbidden.
- **FR-AUTH-4** Permission-based route protection (role → permissions → route).
- **FR-AUTH-5** PII fields (e.g., employee documents/passwords) encrypted with AES-256-GCM at rest; legacy CBC ciphertext readable.
- **FR-AUTH-6** Login rate limiting; security headers (Helmet); CORS allow-list; 2FA primitives via otplib (configurable).

### 4.2 Employees (`FR-EMP`)
- **FR-EMP-1** Full employee CRUD: personal, employment, compensation data; statuses `active / inactive / on_notice / resigned / separated`.
- **FR-EMP-2** Bulk compliance update; import reporting managers & email; transfer between branches/entities.
- **FR-EMP-3** Send login credentials to employees (email via SMTP).
- **FR-EMP-4** Salary structures per employee with `effectiveFrom` versioning (latest wins in payroll).
- **FR-EMP-5** Resignation/separation workflow feeding Final Settlement (FnF).
- **FR-EMP-6** Employee directory (employee portal view).

### 4.3 Payroll (`FR-PAY`)
- **FR-PAY-1** Monthly payroll cycles (draft → processed → paid); locked cycles cannot be re-run.
- **FR-PAY-2** Run payroll per cycle computes per employee: gross (structure components + shift allowance), PF (12% basic, capped), ESI (0.75% ≤ ₹21,000), PT (slab), TDS (new/old regime), LOP, net.
- **FR-PAY-3** LOP rule: working days − distinct logged working days − company holidays; capped at gross; net floored at ₹0.
- **FR-PAY-4** Shift allowance prorated for assignments active mid-month (`effectiveFrom < month end`).
- **FR-PAY-5** Tax regimes FY 25-26: new regime 87A rebate ₹12L, surcharge 25% >₹5Cr; slab tables from DB config.
- **FR-PAY-6** Payslips with full breakdown JSON (components, statutory deductions, LOP, TDS, regime, working days); amounts serialized as numbers.
- **FR-PAY-7** Send payslips by email (nodemailer); explicit failure when SMTP not configured; failure reporting per employee.
- **FR-PAY-8** Attendance process step; additional salary payout (bonus/arrears/one-time); attendance summary per month.
- **FR-PAY-9** Salary revision history + arrears computation; Form 16 (tax-calculator/form16).
- **FR-PAY-10** Money precision: all monetary columns `DECIMAL(10,2)`; no float drift.

### 4.4 Leave (`FR-LEV`)
- **FR-LEV-1** Leave codes & policies; leave balance per employee per type.
- **FR-LEV-2** Apply / cancel leave; comp-off (COL/COFF) applications and history.
- **FR-LEV-3** Approval chain (HR/manager) with per-request audit.
- **FR-LEV-4** Holidays: general, flexible, weekly off, special; holiday calendar drives payroll LOP.

### 4.5 Attendance (`FR-ATT`)
- **FR-ATT-1** Daily apply/update attendance; methods WEB/MOBILE/BIOMETRIC/MANUAL; statuses `present / late / half_day / on_leave`.
- **FR-ATT-2** Regularization requests + approval; correction requests; mark attendance approval.
- **FR-ATT-3** Overtime tracking and Compoff/Overtime policy.
- **FR-ATT-4** Geo-fenced attendance (isWithinGeofence, lat/long, geo approvals).
- **FR-ATT-5** Daily & monthly attendance reports; monthly summary consistent with payroll LOP counts (distinct working days, weekends excluded).

### 4.6 Performance (`FR-PERF`)
- **FR-PERF-1** KRA/KPI master lists; KPA; assign KPI to employees.
- **FR-PERF-2** Appraisal year + periodic target setup; target approval workflow.
- **FR-PERF-3** Peer & external evaluation setup; employee self-appraisal; manager evaluation.
- **FR-PERF-4** Scorecards (periodic + annual) and 360° summary.

### 4.7 Recruitment / ATS (`FR-REC`)
- **FR-REC-1** Panel members; job descriptions; job ads; consultant registration.
- **FR-REC-2** Requisitions lifecycle: pending → approved → assigned.
- **FR-REC-3** Resume bank: list, approval, comments, references; assign for screening.
- **FR-REC-4** Interview scheduling + feedback; status changes; selected candidates.
- **FR-REC-5** Offer management: offered, declined, revised offers; convert to employee on joining.

### 4.8 Employee Services (`FR-ES`)
- **FR-ES-1** Tax declarations + approval (investment, IT statement); declaration master & list; TDS liability preview (`computeTaxPreview`).
- **FR-ES-2** Expense claims + advance claims; travel requests/claims (training/tour).
- **FR-ES-3** Loans/salary advances with EMI and repayment tracking.
- **FR-ES-4** Assets allocation; documents; helpdesk tickets; announcements; training/courses; timesheets; projects/tasks; exit management with clearance & exit interview.

### 4.9 FnF (`FR-FNF`)
- **FR-FNF-1** Final settlement computation: notice recovery, unpaid salary, gratuity, leave encashment, other deductions, net settlement.

### 4.10 Admin / Setup (`FR-ADM`)
- **FR-ADM-1** Company profile, branches, departments, designations, grades, employee categories.
- **FR-ADM-2** Masters: HR masters, payroll masters, salary heads, salary calendar, employee ID configuration.
- **FR-ADM-3** Compliance setup: PT slabs, PF, ESIC, LWF config, TDS section categories, income slab categories/slabs.
- **FR-ADM-4** Attendance policy; shift definition & assignment; overtime/compoff policy.
- **FR-ADM-5** Role permissions & user assignment; system settings.
- **FR-ADM-6** Billing & plan; integrations; super-admin tenant administration.
- **FR-ADM-7** Reports: employee information, monthly attendance, monthly salary, salary summary, salary structure.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Multi-tenancy** | Company-scoped data isolation enforced server-side on every query; tenants share schema with `companyId` partition |
| **Security** | JWT auth, role/permission guards, AES-256-GCM PII encryption, Helmet, CORS allow-list, throttling, timing-safe login, no secrets in code (`.env` only) |
| **Data integrity** | Money as `DECIMAL(10,2)`; FK constraints + indexes maintained by migrations; no destructive schema changes without review |
| **Performance** | Indexed hot paths (attendance, payslips, leave); pagination defaults (20/page); sub-second API responses on local dev DB |
| **Reliability** | Idempotent payroll runs (upsert per cycle+employee); re-runnable without duplicate payslips |
| **Auditability** | Payroll breakdown JSON retained per payslip; approval trails for leave/attendance/recruitment |
| **Availability** | Stateless API (Render web service); state in MySQL; queues via Bull (optional Redis) + node-cron jobs |
| **Usability** | One system, three portals; role-filtered menus; keyboard command palette; light/dark/system theme |
| **Compatibility** | Works on Chromium/Edge/Firefox; responsive layouts; `DD/MM/YYYY` locale dates |

---

## 6. Acceptance Criteria (global)

1. Every menu in §3 opens a real page performing real DB operations — no placeholders.
2. Every button/action returns a truthful result (success, validation error, or 4xx/5xx) — no fake messages.
3. Payroll output for August 2026 matches hand-computed values (see TRD §10 verification fixture).
4. All three portals sign in with seeded accounts; role filtering hides unauthorized menus/routes.
5. `npm run build` clean; `npm test` green (52 specs); `npm run lint` zero errors.
6. DB migrations replay cleanly on a fresh MariaDB import (Hostinger-compatible).

## 7. Out of Scope (current milestone)

- Mobile native apps (web-responsive only)
- Biometric hardware integrations (statuses/methods supported at data level)
- Multi-currency payroll (single INR implementation)