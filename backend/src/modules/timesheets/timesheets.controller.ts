import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TimesheetsService } from './timesheets.service';

@UseGuards(JwtAuthGuard)
@Controller('timesheets')
export class TimesheetsController {
  constructor(private service: TimesheetsService) {}
  @Post() submit(@Body() body: { employeeId: string; date: string; hours: number; projectId?: string }) {
    return this.service.submit(body.employeeId, body.date, body.hours, body.projectId);
  }
  @Get('employee/:employeeId') list(@Param('employeeId') employeeId: string) { return this.service.listForEmployee(employeeId); }
  @Post(':id/approve') approve(@Param('id') id: string) { return this.service.approve(id); }
  @Post(':id/reject') reject(@Param('id') id: string) { return this.service.reject(id); }
}
