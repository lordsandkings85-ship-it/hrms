import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { TravelModule } from './modules/travel/travel.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { TrainingModule } from './modules/training/training.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BillingModule } from './modules/billing/billing.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { FnfModule } from './modules/fnf/fnf.module';
import { ExitModule } from './modules/exit/exit.module';

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
    BillingModule,
    IntegrationsModule,
    SuperAdminModule,
    FnfModule,
    ExitModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
