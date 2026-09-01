# Workora HRMS — Technical Requirements Document (TRD)

**Version**: 2.0.0 · **Status**: In active development
**Stack**: React 18 SPA + NestJS 10 REST API + Prisma 5 + MySQL (dev) / MariaDB 11.8 (prod)

---

## 1. Architecture Overview

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (Vite SPA)    │  HTTP  │  Backend (NestJS, :5000)     │
│  React 18 + TS          │  JSON  │  /api/v1 · global prefix     │
│  react-router-dom 6     │ ─────► │  JWT guards · permissions    │
│  TanStack Query/Zustand │        │  company-scope guard         │
│  Tailwind + recharts    │        │  DecimalToNumber interceptor │
└─────────────────────────┘        │  ValidationPipe (whitelist)  │
                                   └───────────────┬──────────────┘
                                                   │ Prisma ORM
                                   ┌───────────────▼──────────────┐
                                   │  MySQL 8.0 (Docker, local)   │
                                   │  MariaDB 11.8 (Hostinger,    │
                                   │  final handoff) 87 tables    │
                                   └──────────────────────────────┘
```

- **One system, three portals**: same SPA; `SharedRouter` + role guards route users to Admin/HR/Employee page sets.
- **Stateless API**: JWT bearer auth; session state in DB (refresh tokens, 446-token table).
- **Background work**: Bull queue (Redis optional, `REDIS_HOST/PORT`) + node-cron (`@nestjs/schedule`) for scheduled jobs.
- **Email**: nodemailer via `MailService`; gated on `SMTP_HOST` — unconfigured = email disabled with explicit errors.

## 2. Tech Stack (exact versions)

### Backend (`backend/package.json`)
- NestJS `^10.4.0` (common/core/platform-express/testing, config, jwt, passport, mapped-types, schedule, throttler `^5.2.0`, bull `^10.2.0`)
- Prisma `^5.19.0` / `@prisma/client ^5.19.0` (provider: **mysql**)
- Passport `^0.7.0` + passport-jwt `^4.0.1`; bcrypt/bcryptjs; class-validator `^0.14.1`; class-transformer `^0.5.1`
- nodemailer `^9.0.5`; otplib `^12.0.1` (2FA primitives); helmet `^8.3.0`; node-cron `^4.6.0`
- Jest `^29.7.0` + ts-jest (52 specs); ESLint 8 + prettier config

### Frontend (`frontend/package.json`)
- React `^18.3.1` + react-dom; Vite `^5.4.1`; TypeScript `^5.5.4`
- react-router-dom `^6.26.1`; @tanstack/react-query `^5.51.23` + react-table `^8.20.1`
- react-hook-form `^7.52.2` + @hookform/resolvers + zod `^3.23.8`
- zustand `^4.5.5` (auth store); recharts `^2.15.4`; @fullcalendar/* `^6.1.21`; jspdf `^2.5.1`; lucide-react icons
- TailwindCSS `^3.4.10` + postcss/autoprefixer; ts-morph (codegen tooling)

### Infrastructure
- Docker `hrms-mysql` container: mysql:8.0 (8.0.46), port `127.0.0.1:3306`, volume `hrms_mysql_data`
- Render web service: `render.yaml` (node, `npm run start:prod` = `node dist/main`)

## 3. Source Layout

```
backend/src
├── main.ts                 # bootstrap: helmet, CORS, trust proxy, /api/v1, interceptors, pipes
├── app.module.ts
├── common/                 # decorators (current-user, permissions), guards (jwt-auth,
│                           #   permissions, company-scope, super-admin), interceptors
│                           #   (decimal-to-number), mail/ (MailService + module)
├── modules/
│   ├── auth/               # login/refresh, JWT, dto
│   ├── admin/              # attendance-policy, billing, companies, compliance-setup,
│   │                       #   integrations, org-masters, super-admin, tax-setup
│   ├── hr/                 # attendance, employees, leave, payroll, performance,
│   │                       #   performance-setup, recruitment, reports
│   └── employee/           # announcements, assets, dashboard, documents, employee-services,
│                           #   exit, expenses, fnf, helpdesk, projects, shifts,
│                           #   timesheets, training, travel
├── prisma/                 # PrismaService, seeder
└── utils/                  # crypto.util (AES-256-GCM + legacy CBC)

frontend/src
├── app/                    # layouts/Layout.tsx (3 portal nav), guards (Admin/Hr/Employee/Auth)
├── pages/                  # admin/ (18), hr/ (9), employee/ (11), auth/, common/
├── routes/                 # SharedRouter, LeaveRouter, PayrollRouter, PerformanceRouter,
│                           #   RecruitmentRouter
├── components/             # UI kit (ThemeProvider, CommandPalette, Spinner, …)
├── store/                  # useAuthStore (zustand)
├── navigation/permissions.ts
├── services/ api/ hooks/ constants/ types/ utils/
```

## 4. API Conventions

- Global prefix: **`/api/v1`** (e.g., `POST /api/v1/auth/login`, `POST /api/v1/payroll/run`)
- Auth: `Authorization: Bearer <accessToken>`; 401 on invalid/expired; 403 on missing permission
- Validation: `ValidationPipe({ whitelist: true, transform: true })` — unknown body props stripped, DTOs transformed
- **Serialization**: `DecimalToNumberInterceptor` converts Prisma `Decimal` → JSON number globally (payslip `grossPay: 47068` not a string)
- **Errors**: NestJS standard `{ statusCode, message, error }`; business failures → `BadRequestException` with actionable message
- **Money**: all monetary columns `DECIMAL(10,2)` in DB; `Number()` conversions at service boundaries; net pay floor at 0
- **Pagination**: default page size 20; sizes 10/20/50/100

## 5. Backend Module / Endpoint Inventory (31 controllers)

| Area | Module → `@Controller` prefix | Key endpoints |
|---|---|---|
| Auth | `auth` | login, refresh |
| Admin | `companies` (`@Controller()` root) | company CRUD, profile |
| Admin | `super-admin` | tenant admin |
| Admin | `org-masters` | branches, departments, designations, grades, categories, masters |
| Admin | `tax-setup` | PT slabs, PF, ESIC, LWF, TDS sections/slabs |
| Admin | `attendance-policy` | policy, shifts config, overtime/compoff |
| Admin | `billing` | plans, invoices |
| Admin | `integrations` | external integrations |
| Admin | `compliance-setup` | statutory compliance config |
| HR | `employees` | employee CRUD, status, transfer, credentials |
| HR | `attendance` | logs, regularization, overtime, geo, reports |
| HR | `leave` | policies, balances, requests, comp-off, holidays |
| HR | `payroll` | cycles, `run` (runPayroll), payslips, attendance-summary, send-payslips, structure, revisions, bonus/arrears, tax preview |
| HR | `performance` / `performance-setup` | KRA/KPI, targets, evaluations, scorecards, 360 |
| HR | `recruitment` | requisitions, resumes, interviews, offers, joining |
| HR | `reports` | employee info, attendance, salary, salary summary, structure |
| Emp | `dashboard` | employee dashboard stats |
| Emp | `employee-services` | tax declarations (+approve/reject), loans |
| Emp | `expenses` | claims, advances |
| Emp | `travel` | travel requests/claims |
| Emp | `assets` | asset allocation |
| Emp | `shifts` | shift change requests |
| Emp | `timesheets` | timesheets |
| Emp | `projects` | projects & tasks |
| Emp | `documents` | HR/payroll forms, newsletters, links |
| Emp | `announcements` | announcements |
| Emp | `training` | courses/LMS |
| Emp | `helpdesk` | tickets, feedback |
| Emp | `exit` | separation, clearance, exit interview |
| Emp | `fnf` | final settlement computation |

## 6. Data Model (87 Prisma models)

Source of truth: `backend/prisma/schema.prisma` (mysql provider). Key entities:

- **Tenancy**: `Company` (id `e87debef-…`), `Branch/Location`, `User` (3 seeded), `RefreshToken` (446)
- **People**: `Employee` (2: HR-001, LKE1807), `SalaryStructure` (versioned by `effectiveFrom`), `EmployeeDocument`, `Department`, `Designation`, `Grade`, `EmployeeCategory`
- **Payroll**: `PayrollCycle` (unique `companyId_month_year`), `Payslip` (breakdown JSON, upserted per cycle+employee), `SalaryRevision`, `AdditionalPayout`, `Bonus`, `Arrear`, `LoanRequest`, `SalaryHead`
- **Tax/Compliance**: `TaxDeclaration`, `ProfessionalTaxSlab`, `TDSSlab`, `TDSIncomeSlabCategory`, `LWFConfig`, `PFConfig`, `ESICConfig`
- **Attendance**: `AttendanceLog` (status `present|late|half_day|on_leave`), `RegularizationRequest`, `Overtime`, `Shift`, `ShiftAssignment`, `GeoFence`
- **Leave**: `LeavePolicy`/`LeaveCode`, `LeaveBalance`, `LeaveRequest`, `CompOff`, `Holiday` (8 seeded), `WeeklyOff`
- **Performance**: `KPI`, `KRA`, `KPA`, `Target`, `Evaluation`, `Scorecard`, `PeerReview`
- **Recruitment**: `JobDescription`, `JobAd`, `Consultant`, `Requisition`, `Resume`, `Interview`, `Offer`, `Candidate`
- **Services**: `Expense`, `TravelRequest`, `Asset`, `HelpdeskTicket`, `Announcement`, `TrainingCourse`, `Timesheet`, `Project`, `ExitRequest`, `FnfSettlement`
- **Admin**: `Role`, `Permission`, `UserRoleAssignment`, `Integration`, `BillingPlan`, `Invoice`

### Money convention (Phase A)
41 monetary columns across 16 models are `Decimal(10,2)` (e.g., `Payslip.grossPay/totalDeductions/netPay`, `SalaryStructure.basic…specialAllowance`, `FnfSettlement.*`, `Offer.ctc`, `Shift.allowance`). 16 non-money `Float` fields remain (geo, progress, hours, scores).

## 7. Authentication & Authorization

| Layer | Mechanism |
|---|---|
| **Login** | bcrypt hash compare (timing-safe), 401 on failure |
| **Tokens** | JWT access (15m) + refresh (7d); rotation & revocation via `RefreshToken` table |
| **Route guard** | `JwtAuthGuard` → `PermissionsGuard` (`permissions.decorator` metadata; self-bypass for profile/own-data endpoints) |
| **Tenancy** | `CompanyScopeGuard`: injects `companyId` from token into queries; cross-company access rejected |
| **Super admin** | `SuperAdminGuard` for platform routes |
| **At-rest PII** | `utils/crypto.util.ts` AES-256-GCM (new) + legacy CBC decrypt fallback; key from `ENCRYPTION_KEY` |
| **Transport** | Helmet headers; CORS allow-list (`localhost:5173`, Vercel frontends); `trust proxy 1`; throttler on auth |
| **2FA** | otplib primitives available (configurable) |

## 8. Configuration (`.env.example`)

```dotenv
DATABASE_URL="mysql://u593848004_hrms:<db_password>@127.0.0.1:3306/u593848004_hrms"
JWT_ACCESS_SECRET / JWT_REFRESH_SECRET        # render.yaml: generateValue
JWT_ACCESS_EXPIRES_IN="15m"  JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
REDIS_HOST=localhost  REDIS_PORT=6379
ENCRYPTION_KEY=""                             # openssl rand -hex 32 (AES-256-GCM)
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
SMTP_HOST="" SMTP_PORT="587" SMTP_USER="" SMTP_PASS="" SMTP_FROM=""   # empty = email disabled
```

Render (`render.yaml`): `NODE_ENV=production`, `PORT=10000`, `buildCommand: npm install --include=dev && npx prisma generate && npm run build`, `startCommand: npm run start:prod`.

## 9. Database Migrations & Rules

Applied migrations (`prisma migrate status` = up to date):

| Migration | Purpose |
|---|---|
| `20260815000000_baseline` | 87 tables from schema (MySQL canonical) |
| `20260815000100_sync_schema` | Drop MariaDB-era FKs/auto-indexes, rebuild 97 FK indexes, widen 8 text→longtext, re-add 62 FKs `ON DELETE NO ACTION ON UPDATE CASCADE` |
| `20260815000200_money_decimal` | 41 column MODIFYs → DECIMAL(10,2) |

**Working rules** (learned in Phase A):
- Generate future migrations via **datamodel-to-datamodel** diff (`--from-schema-datamodel <old> --to-schema-datamodel <new> --script`); Prisma's live-DB diff is unreliable (phantom FK drops).
- Apply SQL via mysql client, then `prisma migrate resolve --applied <name>`.
- Target DB is **MariaDB 11.8** — migration files must stay replayable on a fresh import (no MySQL-only syntax).

## 10. Testing & Verification

- **Jest**: 52 specs / 7 suites — crypto.util (AES-GCM + legacy), permissions.guard, company-scope.guard, mail.service, seeder.service, tax.calculator (12L rebate, 25% surcharge, slab boundaries), payroll.service (structure selection by effectiveFrom, LOP with holidays, multi-punch dedupe, weekend exclusion, shift allowance proration, shiftAssignment `lt` filter, sendPayslips configured/failure paths)
- **Commands**: `npm run build` (nest build → `dist/main.js`), `npm test`, `npm run lint` (0 errors)
- **Live fixture** (Aug 2026): HR-001 gross 47068 / deductions 3140.14 / net 43927.86, LOP 0, TDS 1340 (old regime); LKE1807 gross 20000, LOP 15 (5 distinct logged working days, 1 holiday), net 4364.29 — both hand-verified

## 11. Operational Notes

- Backend restart: kill PID on port 5000 (`taskkill /F /PID`) then `Start-Process node dist/main.js` (redirect stdout/stderr to `server.out.log` / `server.err.log`); poll `POST /api/v1/auth/login` for readiness.
- No `/health` route (404 expected).
- WSL/temp dirs are ephemeral between tool calls — multi-step ops in one script.