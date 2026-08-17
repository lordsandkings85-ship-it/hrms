import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('check-in')
  @Permissions({ module: 'attendance', action: 'create' })
  checkIn(
    @CurrentUser() user: AuthUser,
    @Body() body: { employeeId: string; method: string; lat?: number; lng?: number },
  ) {
    return this.attendanceService.checkIn(user.companyId, body.employeeId, body.method, body.lat, body.lng);
  }

  @Post('check-out/:logId')
  checkOut(@CurrentUser() user: AuthUser, @Param('logId') logId: string) {
    return this.attendanceService.checkOut(user.companyId, logId, user.userId);
  }

  @Post('manual')
  @Permissions({ module: 'attendance', action: 'edit' })
  manualPunch(
    @CurrentUser() user: AuthUser,
    @Body() body: { employeeId: string; date: string; time: string; type: 'IN' | 'OUT'; reason?: string },
  ) {
    return this.attendanceService.manualPunch(user.companyId, body.employeeId, body.date, body.time, body.type, body.reason);
  }

  @Get('employee/:employeeId')
  @Permissions({ module: 'attendance', action: 'view' })
  listForEmployee(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.listForEmployee(user.companyId, employeeId, from, to);
  }

  @Get('today')
  @Permissions({ module: 'attendance', action: 'view' })
  listToday(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.attendanceService.listForCompany(user.companyId, date);
  }

  @Get('summary/:employeeId')
  @Permissions({ module: 'attendance', action: 'view' })
  monthlySummary(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.attendanceService.getMonthlySummary(
      user.companyId,
      employeeId,
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }

  @Get('regularize/pending')
  @Permissions({ module: 'attendance', action: 'view' })
  listPendingRegularizations(@CurrentUser() user: AuthUser) {
    return this.attendanceService.listPendingRegularizations(user.companyId);
  }

  @Post('regularize/:logId')
  @Permissions({ module: 'attendance', action: 'create' })
  requestRegularization(
    @CurrentUser() user: AuthUser,
    @Param('logId') logId: string, 
    @Body() body: { employeeId: string; requestedCheckIn?: string; requestedCheckOut?: string; reason?: string; note?: string }
  ) {
    return this.attendanceService.requestRegularization(
      user.companyId,
      logId, 
      body.employeeId, 
      body.requestedCheckIn ? new Date(body.requestedCheckIn) : undefined,
      body.requestedCheckOut ? new Date(body.requestedCheckOut) : undefined,
      body.reason || body.note || ''
    );
  }

  @Post('regularize/:requestId/approve')
  @Permissions({ module: 'attendance', action: 'approve' })
  approveRegularization(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() body: { status?: string },
  ) {
    if (body.status === 'rejected') {
      return this.attendanceService.rejectRegularization(requestId, user.companyId, user.userId);
    }
    return this.attendanceService.approveRegularization(requestId, user.companyId, user.userId);
  }

  @Post('regularize/:requestId/reject')
  @Permissions({ module: 'attendance', action: 'approve' })
  rejectRegularization(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() body: { status?: string },
  ) {
    if (body.status === 'approved') {
      return this.attendanceService.approveRegularization(requestId, user.companyId, user.userId);
    }
    return this.attendanceService.rejectRegularization(requestId, user.companyId, user.userId);
  }

  @Post('geofence')
  @Permissions({ module: 'attendance', action: 'edit' })
  setGeofence(@CurrentUser() user: AuthUser, @Body() body: { lat: number; lng: number; radius: number }) {
    return this.attendanceService.setGeofence(user.companyId, body.lat, body.lng, body.radius);
  }

  @Get('geofence')
  getGeofence(@CurrentUser() user: AuthUser) {
    return this.attendanceService.getGeofence(user.companyId);
  }
}

