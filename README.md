# Workora HRMS

Enterprise Human Resource Management System — one system, three portals (Admin / HR / Employee).

- **Frontend**: React 18 + Vite + TypeScript + TanStack Query + Zustand + Recharts + Tailwind
- **Backend**: NestJS + Prisma ORM + MySQL (dev Docker) / MariaDB 11.8 (prod Hostinger) + JWT Auth
- **Features**: Payroll (TDS regimes, LOP, shift allowance, email payslips), Leave, Attendance, Recruitment (ATS), Performance 360, Timesheets, Expenses, Travel, Assets, Documents, Training (LMS), FnF, Multi-Tenant SaaS, Super Admin

## Documentation

| Doc | Contents |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements, roles, complete menu inventory, functional & non-functional requirements |
| [docs/TRD.md](docs/TRD.md) | Architecture, stack, API/module inventory, data model, security, migrations, testing |
| [docs/IMP.md](docs/IMP.md) | 17-phase implementation roadmap, status ledger, verification, handoff checklist |

## Quick Start

Prerequisites: Node.js 18+, Docker (MySQL container), npm.

### 1. Database

```bash
docker compose up -d hrms-mysql   # mysql:8.0 on 127.0.0.1:3306
# restore a dump if needed, e.g.:
# docker exec -i hrms-mysql mysql -uroot -pLordsRoot2018 u593848004_hrms < backend/db-backups/hrms_prod_dump_2026-08-15.sql
```

### 2. Backend

```bash
cd backend
npm install
# configure backend/.env (see .env.example)
npx prisma migrate deploy         # applies 3 baseline migrations
npm run build
npm run start:prod                # http://localhost:5000/api/v1
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```


## Verification

```bash
cd backend
npm run build && npm test && npm run lint   # 52 specs, 0 lint errors
```

## Key API Endpoints

| Module | Endpoint |
|---|---|
| Auth | `POST /api/v1/auth/login` |
| Employees | `GET /api/v1/employees` |
| Payroll | `POST /api/v1/payroll/run` |
| Payroll | `GET /api/v1/payroll/attendance-summary?month=&year=` |
| Payroll | `POST /api/v1/payroll/cycles/:id/send-payslips` |
| Leave | `GET /api/v1/leave/requests` |
| FnF | `GET /api/v1/fnf/settlements` |
| Reports | `GET /api/v1/reports/salary` |
