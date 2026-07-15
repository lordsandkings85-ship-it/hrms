import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('headcount') headcount(@CurrentUser() user: AuthUser) { return this.service.headcount(user.companyId); }
  @Get('attrition') attrition(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.attrition(user.companyId, Number(year) || new Date().getFullYear());
  }
  @Get('payroll-cost') payrollCost(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.payrollCost(user.companyId, Number(year) || new Date().getFullYear());
  }
  @Get('leave-summary') leaveSummary(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.service.leaveSummary(user.companyId, Number(year) || new Date().getFullYear());
  }
}
