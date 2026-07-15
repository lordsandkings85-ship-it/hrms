import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private service: ShiftsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Post() create(@CurrentUser() user: AuthUser, @Body() body: { name: string; startTime: string; endTime: string; type: string }) {
    return this.service.create(user.companyId, body.name, body.startTime, body.endTime, body.type);
  }
  @Post('assign') assign(@Body() body: { shiftId: string; employeeId: string; effectiveFrom: string }) {
    return this.service.assign(body.shiftId, body.employeeId, body.effectiveFrom);
  }
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
}
