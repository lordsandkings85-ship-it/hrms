import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TravelService } from './travel.service';

@UseGuards(JwtAuthGuard)
@Controller('travel')
export class TravelController {
  constructor(private service: TravelService) {}
  @Post() request(@Body() body: { employeeId: string; fromDate: string; toDate: string; purpose?: string; advance?: number }) {
    return this.service.request(body.employeeId, body.fromDate, body.toDate, body.purpose, body.advance);
  }
  @Post(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: string) { return this.service.updateStatus(id, status); }
  @Get('employee/:employeeId') listForEmployee(@Param('employeeId') employeeId: string) { return this.service.listForEmployee(employeeId); }
  @Get('company') listForCompany(@CurrentUser() user: AuthUser) { return this.service.listForCompany(user.companyId); }
}
