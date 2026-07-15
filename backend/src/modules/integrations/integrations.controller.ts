import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Post() connect(@CurrentUser() user: AuthUser, @Body() body: { provider: string; config?: any }) {
    return this.service.connect(user.companyId, body.provider, body.config);
  }
  @Post(':id/disconnect') disconnect(@Param('id') id: string) { return this.service.disconnect(id); }
}
