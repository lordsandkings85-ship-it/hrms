import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}
  @Get()
  @Permissions({ module: 'integrations', action: 'view' })
  list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Post()
  @Permissions({ module: 'integrations', action: 'edit' })
  connect(@CurrentUser() user: AuthUser, @Body() body: { provider: string; config?: any }) {
    return this.service.connect(user.companyId, body.provider, body.config);
  }
  @Post(':id/disconnect')
  @Permissions({ module: 'integrations', action: 'edit' })
  disconnect(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.disconnect(id, user.companyId); }

  @Get('google')
  @Permissions({ module: 'integrations', action: 'view' })
  getGoogle(@CurrentUser() user: AuthUser) { return this.service.getGoogleConfig(user.companyId); }
  @Post('google')
  @Permissions({ module: 'integrations', action: 'edit' })
  updateGoogle(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.updateGoogleConfig(user.companyId, body);
  }

  @Get('config/:provider')
  @Permissions({ module: 'integrations', action: 'view' })
  getConfig(@CurrentUser() user: AuthUser, @Param('provider') provider: string) {
    return this.service.getConfig(user.companyId, provider);
  }
  @Post('config/:provider')
  @Permissions({ module: 'integrations', action: 'edit' })
  updateConfig(@CurrentUser() user: AuthUser, @Param('provider') provider: string, @Body() body: any) {
    return this.service.updateConfig(user.companyId, provider, body);
  }
}

