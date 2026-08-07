import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/admin/companies/companies.module';
import { EmployeesModule } from './modules/hr/employees/employees.module';
import { DashboardModule } from './modules/employee/dashboard/dashboard.module';
import { AttendanceModule } from './modules/hr/attendance/attendance.module';
import { LeaveModule } from './modules/hr/leave/leave.module';
import { PayrollModule } from './modules/hr/payroll/payroll.module';
import { RecruitmentModule } from './modules/hr/recruitment/recruitment.module';
import { PerformanceModule } from './modules/hr/performance/performance.module';
import { PerformanceSetupModule } from './modules/hr/performance-setup/performance-setup.module';
import { ProjectsModule } from './modules/employee/projects/projects.module';
import { TimesheetsModule } from './modules/employee/timesheets/timesheets.module';
import { ExpensesModule } from './modules/employee/expenses/expenses.module';
import { TravelModule } from './modules/employee/travel/travel.module';
import { AssetsModule } from './modules/employee/assets/assets.module';
import { DocumentsModule } from './modules/employee/documents/documents.module';
import { ShiftsModule } from './modules/employee/shifts/shifts.module';
import { AnnouncementsModule } from './modules/employee/announcements/announcements.module';
import { TrainingModule } from './modules/employee/training/training.module';
import { ReportsModule } from './modules/hr/reports/reports.module';
import { ComplianceSetupModule } from './modules/admin/compliance-setup/compliance-setup.module';
import { TaxSetupModule } from './modules/admin/tax-setup/tax-setup.module';
import { AttendancePolicyModule } from './modules/admin/attendance-policy/attendance-policy.module';
import { OrgMastersModule } from './modules/admin/org-masters/org-masters.module';
import { BillingModule } from './modules/admin/billing/billing.module';
import { IntegrationsModule } from './modules/admin/integrations/integrations.module';
import { SuperAdminModule } from './modules/admin/super-admin/super-admin.module';
import { FnfModule } from './modules/employee/fnf/fnf.module';
import { ExitModule } from './modules/employee/exit/exit.module';
import { HelpdeskModule } from './modules/employee/helpdesk/helpdesk.module';
import { EmployeeServicesModule } from './modules/employee/employee-services/employee-services.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    EmployeesModule,
    DashboardModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    RecruitmentModule,
    PerformanceModule,
    PerformanceSetupModule,
    ProjectsModule,
    TimesheetsModule,
    ExpensesModule,
    TravelModule,
    AssetsModule,
    DocumentsModule,
    ShiftsModule,
    AnnouncementsModule,
    TrainingModule,
    ReportsModule,
    ComplianceSetupModule,
    TaxSetupModule,
    AttendancePolicyModule,
    OrgMastersModule,
    BillingModule,
    IntegrationsModule,
    SuperAdminModule,
    FnfModule,
    ExitModule,
    HelpdeskModule,
    EmployeeServicesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
