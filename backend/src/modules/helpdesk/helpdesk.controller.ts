import { Body, Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { HelpdeskService } from './helpdesk.service';

@UseGuards(JwtAuthGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private service: HelpdeskService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.companyId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser, 
    @Body() body: { subject: string; description: string; priority: string; category: string }
  ) {
    return this.service.create(user.companyId, (user as any).employeeId, body);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser, 
    @Param('id') id: string, 
    @Body('status') status: string
  ) {
    return this.service.updateStatus(id, user.companyId, status);
  }
}
