import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('headcount') @Permissions({ module: 'reports', action: 'view' })
  headcount(@CurrentUser() user: AuthUser) { return this.service.headcount(user.companyId); }
  @Get('attrition') @Permissions({ module: 'reports', action: 'view' })
  attrition(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.attrition(user.companyId, Number(year) || new Date().getFullYear());
  }
  @Get('payroll-cost') @Permissions({ module: 'reports', action: 'view' })
  payrollCost(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.payrollCost(user.companyId, Number(year) || new Date().getFullYear());
  }
  @Get('payroll-cost-monthly') @Permissions({ module: 'reports', action: 'view' })
  payrollCostMonthly(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.payrollCostMonthly(user.companyId, Number(year) || new Date().getFullYear());
  }
  @Get('leave-summary') @Permissions({ module: 'reports', action: 'view' })
  leaveSummary(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.leaveSummary(user.companyId, Number(year) || new Date().getFullYear());
  }
}

