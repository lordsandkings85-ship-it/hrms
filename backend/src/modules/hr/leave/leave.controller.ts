import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { LeaveService } from './leave.service';
import { MonthlyLeaveAllocationService } from './monthly-leave-allocation.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leave')
export class LeaveController {
  constructor(
    private leaveService: LeaveService,
    private monthlyAllocationService: MonthlyLeaveAllocationService,
  ) {}

  @Get('analytics')
  @Permissions({ module: 'leave', action: 'view' })
  analytics(@CurrentUser() user: AuthUser) {
    return this.leaveService.analytics(user.companyId);
  }

  @Get('policies')
  @Permissions({ module: 'leave', action: 'view' })
  getPolicies(@CurrentUser() user: AuthUser) {
    return this.leaveService.getPolicies(user.companyId);
  }

  @Post('policies')
  @Permissions({ module: 'leave', action: 'edit' })
  setPolicies(@CurrentUser() user: AuthUser, @Body() policies: any) {
    return this.leaveService.setPolicies(user.companyId, policies);
  }

  @Post('bulk-approve')
  @Permissions({ module: 'leave', action: 'approve' })
  bulkApprove(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    return this.leaveService.bulkApprove(body.ids, user.companyId, user.userId);
  }

  @Post('bulk-reject')
  @Permissions({ module: 'leave', action: 'approve' })
  bulkReject(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    return this.leaveService.bulkReject(body.ids, user.companyId, user.userId);
  }

  @Get('types')
  listTypes(@CurrentUser() user: AuthUser) {
    return this.leaveService.listTypes(user.companyId);
  }

  @Post('types')
  @Permissions({ module: 'leave', action: 'edit' })
  createType(@CurrentUser() user: AuthUser, @Body() body: { name: string; paid: boolean; code?: string; accrualRate?: number; annualAllocation?: number; maxConsecutiveDays?: number; halfDayAllowed?: boolean; carryForward?: boolean; carryForwardLimit?: number; encashment?: boolean; negativeBalanceAllowed?: boolean; attachmentRequired?: boolean; applicableAfterDays?: number; approvalRequired?: boolean; gender?: string }) {
    return this.leaveService.createType(user.companyId, body);
  }

  @Post('types/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  updateType(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.leaveService.updateType(user.companyId, id, body);
  }

  @Delete('types/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  deleteType(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.deleteType(user.companyId, id);
  }

  @Post('apply')
  @Permissions({ module: 'leave', action: 'create' })
  apply(
    @CurrentUser() user: AuthUser,
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
      user.companyId,
      body.employeeId,
      body.leaveTypeId,
      body.startDate,
      body.endDate,
      !!body.isHalfDay,
      body.reason,
    );
  }

  @Post(':id/approve')
  @Permissions({ module: 'leave', action: 'approve' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.approve(id, user.companyId, user.userId);
  }

  @Post(':id/reject')
  @Permissions({ module: 'leave', action: 'approve' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.reject(id, user.companyId, user.userId);
  }

  @Post(':id/cancel')
  @Permissions({ module: 'leave', action: 'edit' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.leaveService.cancel(id, user.userId, reason);
  }

  @Get('cancellations/pending')
  @Permissions({ module: 'leave', action: 'view' })
  listCancellations(@CurrentUser() user: AuthUser) {
    return this.leaveService.listCancellations(user.companyId);
  }

  @Post('cancellations/:id/approve')
  @Permissions({ module: 'leave', action: 'approve' })
  approveCancellation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.approveCancellation(id, user.companyId, user.userId);
  }

  @Post('cancellations/:id/reject')
  @Permissions({ module: 'leave', action: 'approve' })
  rejectCancellation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.rejectCancellation(id, user.companyId, user.userId);
  }

  @Get('employee/:employeeId')
  @Permissions({ module: 'leave', action: 'view' })
  listForEmployee(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.leaveService.listForEmployee(employeeId, user.companyId);
  }

  @Get('pending')
  @Permissions({ module: 'leave', action: 'view' })
  listPending(@CurrentUser() user: AuthUser) {
    return this.leaveService.listPendingForCompany(user.companyId);
  }

  @Get('balances/:employeeId')
  @Permissions({ module: 'leave', action: 'view' })
  balances(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.leaveService.balances(employeeId, year ? Number(year) : new Date().getFullYear(), user.companyId);
  }

  @Get('balances-overview')
  @Permissions({ module: 'leave', action: 'view' })
  balancesOverview(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('departmentId') departmentId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('search') search?: string,
  ) {
    return this.leaveService.balancesOverview(
      user.companyId,
      year ? Number(year) : new Date().getFullYear(),
      { departmentId, leaveTypeId, search },
    );
  }

  @Get('all')
  @Permissions({ module: 'leave', action: 'view' })
  listAll(
    @CurrentUser() user: AuthUser,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('year') year?: string,
  ) {
    return this.leaveService.listAllForCompany(user.companyId, {
      departmentId,
      status,
      year: year ? Number(year) : undefined,
    });
  }

  @Get('holidays')
  listHolidays(@CurrentUser() user: AuthUser) {
    return this.leaveService.listHolidays(user.companyId);
  }

  @Post('holidays')
  @Permissions({ module: 'leave', action: 'edit' })
  createHoliday(@CurrentUser() user: AuthUser, @Body() body: { name: string; date: string }) {
    return this.leaveService.createHoliday(user.companyId, body.name, body.date);
  }

  @Delete('holidays/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  deleteHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.deleteHoliday(user.companyId, id);
  }

  // --- Leave Balance Allocation ---

  @Post('balances/adjust')
  @Permissions({ module: 'leave', action: 'edit' })
  adjustBalance(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; leaveTypeId: string; year: number; amount: number; reason?: string }) {
    return this.leaveService.adjustBalance(user.companyId, body, user.userId);
  }

  @Post('balances/bulk-allocate')
  @Permissions({ module: 'leave', action: 'edit' })
  bulkAllocate(@CurrentUser() user: AuthUser, @Body() body: { employeeIds: string[]; leaveTypeId: string; year: number; amount: number; reason?: string }) {
    return this.leaveService.bulkAllocate(user.companyId, body, user.userId);
  }

  @Get('balances/:employeeId/transactions')
  @Permissions({ module: 'leave', action: 'view' })
  transactions(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.leaveService.transactions(user.companyId, employeeId, year ? Number(year) : undefined);
  }

  @Put('balances/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  updateBalance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { allotted?: number; used?: number; carriedOver?: number; encashed?: number; reason?: string },
  ) {
    return this.leaveService.updateBalance(user.companyId, id, body, user.userId);
  }

  @Delete('balances/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  deleteBalance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.deleteBalance(user.companyId, id, user.userId);
  }

  // --- Monthly Casual Leave Ledger (Rule 4) ---

  @Get('monthly-balances/:employeeId')
  @Permissions({ module: 'leave', action: 'view' })
  monthlyBalances(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.leaveService.monthlyBalances(employeeId, user.companyId, year ? Number(year) : undefined);
  }

  // Idempotent manual trigger of the monthly Casual Leave allocation (also used for backfill/testing)
  @Post('monthly-allocation')
  @Permissions({ module: 'leave', action: 'edit' })
  runMonthlyAllocation(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('companyId') companyId?: string,
  ) {
    const now = new Date();
    return this.monthlyAllocationService.runAllocation(
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
      companyId || user.companyId,
    );
  }

  // --- Leave Year ---

  @Get('years')
  @Permissions({ module: 'leave', action: 'view' })
  listLeaveYears(@CurrentUser() user: AuthUser) {
    return this.leaveService.listLeaveYears(user.companyId);
  }

  @Post('years')
  @Permissions({ module: 'leave', action: 'edit' })
  createLeaveYear(@CurrentUser() user: AuthUser, @Body() body: { name: string; startDate: string; endDate: string }) {
    return this.leaveService.createLeaveYear(user.companyId, body);
  }

  @Post('years/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  updateLeaveYear(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { isActive?: boolean; carryForwardProcessed?: boolean }) {
    return this.leaveService.updateLeaveYear(user.companyId, id, body);
  }

  @Delete('years/:id')
  @Permissions({ module: 'leave', action: 'edit' })
  deleteLeaveYear(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.deleteLeaveYear(user.companyId, id);
  }

  // --- Carry Forward ---

  @Post('carry-forward')
  @Permissions({ module: 'leave', action: 'edit' })
  processCarryForward(@CurrentUser() user: AuthUser, @Body() body: { fromYearId: string }) {
    return this.leaveService.processCarryForward(user.companyId, body.fromYearId, user.userId);
  }
}

