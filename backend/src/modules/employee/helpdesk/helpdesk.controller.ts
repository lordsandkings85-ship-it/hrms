import { Body, Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { HelpdeskService } from './helpdesk.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private service: HelpdeskService) {}

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listForEmployee(user.companyId, user.userId);
  }

  @Get()
  @Permissions({ module: 'helpdesk', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.companyId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { subject: string; description: string; priority: string; category: string; ratings?: any }
  ) {
    return this.service.create(user.companyId, user.userId, body);
  }

  @Patch(':id/status')
  @Permissions({ module: 'helpdesk', action: 'edit' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.service.updateStatus(id, user.companyId, status);
  }
}
