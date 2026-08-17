import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { TimesheetsService } from './timesheets.service';
import { SubmitTimesheetDto } from './dto/timesheets.dto';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('timesheets')
export class TimesheetsController {
  constructor(private service: TimesheetsService) {}
  @Post()
  @Permissions({ module: 'timesheets', action: 'create' })
  submit(@CurrentUser() user: AuthUser, @Body() body: SubmitTimesheetDto) {
    return this.service.submit(body.employeeId, body.date, body.hours, body.projectId);
  }
  @Get('employee/:employeeId')
  @Permissions({ module: 'timesheets', action: 'view' })
  list(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) { return this.service.listForEmployee(employeeId); }
  @Post(':id/approve')
  @Permissions({ module: 'timesheets', action: 'approve' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.approve(user.companyId, id); }
  @Post(':id/reject')
  @Permissions({ module: 'timesheets', action: 'approve' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.reject(user.companyId, id); }
}

