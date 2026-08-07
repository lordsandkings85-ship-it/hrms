import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('assets')
export class AssetsController {
  constructor(private service: AssetsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.service.list(user.companyId); }
  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.deleteAsset(user.companyId, id); }
  @Post() create(@CurrentUser() user: AuthUser, @Body() body: { type: string; identifier?: string }) {
    return this.service.create(user.companyId, body.type, body.identifier);
  }
  @Post(':id/assign') assign(@Param('id') id: string, @Body('employeeId') employeeId: string) { return this.service.assign(id, employeeId); }
  @Post(':id/return') returnAsset(@Param('id') id: string, @Body('assignmentId') assignmentId: string) { return this.service.returnAsset(assignmentId, id); }
}

