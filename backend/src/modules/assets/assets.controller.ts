import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private service: AssetsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Post() create(@CurrentUser() user: AuthUser, @Body() body: { type: string; identifier?: string }) {
    return this.service.create(user.companyId, body.type, body.identifier);
  }
  @Post(':id/assign') assign(@Param('id') id: string, @Body('employeeId') employeeId: string) { return this.service.assign(id, employeeId); }
  @Post(':id/return') returnAsset(@Param('id') id: string, @Body('assignmentId') assignmentId: string) { return this.service.returnAsset(assignmentId, id); }
}
