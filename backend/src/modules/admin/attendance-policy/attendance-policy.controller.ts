import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AttendancePolicyService } from './attendance-policy.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('attendance-policy')
export class AttendancePolicyController {
  constructor(private service: AttendancePolicyService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.getPolicies(user.companyId);
  }

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() body: { key: string; value: string }) {
    return this.service.upsertPolicy(user.companyId, body.key, body.value);
  }

  @Put(':key')
  update(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body() body: { value: string }) {
    return this.service.upsertPolicy(user.companyId, key, body.value);
  }

  @Delete(':key')
  delete(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.service.deletePolicy(user.companyId, key);
  }
}