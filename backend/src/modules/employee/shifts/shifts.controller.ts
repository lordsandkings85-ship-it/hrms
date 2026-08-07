import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private service: ShiftsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Post() create(@CurrentUser() user: AuthUser, @Body() body: { name: string; startTime: string; endTime: string; type: string }) {
    return this.service.create(user.companyId, body.name, body.startTime, body.endTime, body.type);
  }
  @Delete(':id')
  deleteShift(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.deleteShift(user.companyId, id); }
  @Post('assign') assign(@Body() body: { shiftId: string; employeeId: string; effectiveFrom: string }) {
    return this.service.assign(body.shiftId, body.employeeId, body.effectiveFrom);
  }
  @Get('assignments')
  listAssignments(@CurrentUser() user: AuthUser) { return this.service.listAssignments(user.companyId); }
  @Delete('assignments/:id')
  deleteAssignment(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.deleteAssignment(user.companyId, id); }
  @Get('holidays') listHolidays(@CurrentUser() user: AuthUser) { return this.service.listHolidays(user.companyId); }
  @Post('holidays') addHoliday(@CurrentUser() user: AuthUser, @Body() body: { name: string; date: string }) {
    return this.service.addHoliday(user.companyId, body.name, body.date);
  }

  @Post('roster/generate')
  generateRoster(
    @CurrentUser() user: AuthUser,
    @Body() body: { departmentId: string; shiftIds: string[]; startDate: string; weeks: number }
  ) {
    return this.service.generateDepartmentRoster(
      user.companyId,
      body.departmentId,
      body.shiftIds,
      body.startDate,
      body.weeks
    );
  }

  @Post('request-change')
  requestChange(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.requestChange(user.companyId, body);
  }
  @Get('change-requests')
  listChangeRequests(@CurrentUser() user: AuthUser) {
    return this.service.listChangeRequests(user.companyId);
  }
  @Post('change-requests/:id/approve')
  approveChangeRequest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.approveChangeRequest(id, user.companyId, user.userId);
  }
  @Post('change-requests/:id/reject')
  rejectChangeRequest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.rejectChangeRequest(id, user.companyId, user.userId);
  }
}

