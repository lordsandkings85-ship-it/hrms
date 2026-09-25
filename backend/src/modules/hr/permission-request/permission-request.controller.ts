import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { PermissionRequestService } from './permission-request.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permission-requests')
export class PermissionRequestController {
  constructor(private service: PermissionRequestService) {}

  /** Employee self-service create, or HR filing on behalf of an employee (attendance:approve). */
  @Post()
  @Permissions({ module: 'attendance', action: 'approve' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { employeeId?: string; date: string; fromTime: string; toTime: string; reason: string },
  ) {
    return this.service.create({
      userId: user.userId,
      companyId: user.companyId,
      employeeId: body.employeeId || '',
      date: body.date,
      fromTime: body.fromTime,
      toTime: body.toTime,
      reason: body.reason || '',
    });
  }

  /** Employee's own request history. */
  @Get('my')
  @Permissions({ module: 'attendance', action: 'view' })
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.userId);
  }

  /** HR/approver pending queue. */
  @Get('pending')
  @Permissions({ module: 'attendance', action: 'approve' })
  listPending(@CurrentUser() user: AuthUser) {
    return this.service.list({ companyId: user.companyId, userId: user.userId, status: 'pending' });
  }

  /** HR/approver list with filters. */
  @Get()
  @Permissions({ module: 'attendance', action: 'approve' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company') company?: string,
  ) {
    return this.service.list({
      companyId: user.companyId,
      userId: user.userId,
      status,
      employeeId,
      from,
      to,
      company,
    });
  }

  /** Super-admin cross-company usage report. */
  @Get('usage')
  @Permissions({ module: 'attendance', action: 'approve' })
  usage(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.service.usageReport(user.userId, month);
  }

  @Post(':id/cancel')
  @Permissions({ module: 'attendance', action: 'view' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(id, user.companyId, user.userId);
  }

  @Post(':id/approve')
  @Permissions({ module: 'attendance', action: 'approve' })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.service.approve(id, user.companyId, user.userId, body?.note);
  }

  @Post(':id/reject')
  @Permissions({ module: 'attendance', action: 'approve' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.reject(id, user.companyId, user.userId, body?.reason || '');
  }
}