import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import { AttendanceService } from '../../hr/attendance/attendance.service';
import { LeaveService } from '../../hr/leave/leave.service';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private service: SuperAdminService,
    private attendance: AttendanceService,
    private leave: LeaveService,
  ) {}

  @Get('tenants')
  listTenants() { return this.service.listTenants(); }

  @Get('attendance/daily')
  attendanceDaily(@Query('companyId') companyId: string, @Query('date') date?: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.attendance.listForCompany(companyId, date);
  }

  @Get('attendance/monthly')
  attendanceMonthly(
    @Query('companyId') companyId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    if (!companyId) throw new BadRequestException('companyId is required');
    const y = year ? Number(year) : undefined;
    const m = month ? Number(month) : undefined;
    return this.attendance.listForCompanyMonth(companyId, y, m);
  }

  @Get('leave')
  leaveRequests(@Query('companyId') companyId: string, @Query('status') status?: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.leave.listAllForCompany(companyId, { status: status || undefined });
  }

  @Get('health')
  health() { return this.service.systemHealth(); }

  @Get('audit-logs')
  auditLogs(@Query('companyId') companyId?: string) { return this.service.auditLogs(companyId); }

  @Get('seed-existing')
  seedExisting() { return this.service.seedExisting(); }

  @Post('tenants/provision')
  provisionTenant(@Body() body: any) {
    return this.service.provisionTenant(body);
  }
}

