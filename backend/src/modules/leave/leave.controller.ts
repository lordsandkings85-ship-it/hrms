import { Body, Controller, Get, Param, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { LeaveService } from './leave.service';

@UseGuards(JwtAuthGuard)
@Controller('leave')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Get('analytics')
  analytics(@CurrentUser() user: AuthUser) {
    return this.leaveService.analytics(user.companyId);
  }

  @Get('policies')
  getPolicies(@CurrentUser() user: AuthUser) {
    return this.leaveService.getPolicies(user.companyId);
  }

  @Post('policies')
  setPolicies(@CurrentUser() user: AuthUser, @Body() policies: any) {
    return this.leaveService.setPolicies(user.companyId, policies);
  }

  @Post('bulk-approve')
  bulkApprove(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    return this.leaveService.bulkApprove(body.ids, user.userId);
  }

  @Post('bulk-reject')
  bulkReject(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    return this.leaveService.bulkReject(body.ids, user.userId);
  }

  @Get('types')
  listTypes(@CurrentUser() user: AuthUser) {
    return this.leaveService.listTypes(user.companyId);
  }

  @Post('types')
  createType(@CurrentUser() user: AuthUser, @Body() body: { name: string; paid: boolean }) {
    return this.leaveService.createType(user.companyId, body.name, body.paid);
  }

  @Post('apply')
  apply(
    @Body()
    body: {
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      isHalfDay?: boolean;
      reason?: string;
    },
  ) {
    return this.leaveService.apply(
      body.employeeId,
      body.leaveTypeId,
      body.startDate,
      body.endDate,
      !!body.isHalfDay,
      body.reason,
    );
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.approve(id, user.userId);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.reject(id, user.userId);
  }

  @Get('employee/:employeeId')
  listForEmployee(@Param('employeeId') employeeId: string) {
    return this.leaveService.listForEmployee(employeeId);
  }

  @Get('pending')
  listPending(@CurrentUser() user: AuthUser) {
    return this.leaveService.listPendingForCompany(user.companyId);
  }

  @Get('balances/:employeeId')
  balances(@Param('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.leaveService.balances(employeeId, year ? Number(year) : new Date().getFullYear());
  }

  @Get('holidays')
  listHolidays(@CurrentUser() user: AuthUser) {
    return this.leaveService.listHolidays(user.companyId);
  }

  @Post('holidays')
  createHoliday(@CurrentUser() user: AuthUser, @Body() body: { name: string; date: string }) {
    return this.leaveService.createHoliday(user.companyId, body.name, body.date);
  }

  @Delete('holidays/:id')
  deleteHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.deleteHoliday(user.companyId, id);
  }
}
