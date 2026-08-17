import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AttendancePolicyService } from './attendance-policy.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('attendance-policy')
export class AttendancePolicyController {
  constructor(private service: AttendancePolicyService) {}

  @Get()
  @Permissions({ module: 'attendance-policy', action: 'view' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.getPolicies(user.companyId);
  }

  @Post()
  @Permissions({ module: 'attendance-policy', action: 'edit' })
  upsert(@CurrentUser() user: AuthUser, @Body() body: { key: string; value: string }) {
    return this.service.upsertPolicy(user.companyId, body.key, body.value);
  }

  @Put(':key')
  @Permissions({ module: 'attendance-policy', action: 'edit' })
  update(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body() body: { value: string }) {
    return this.service.upsertPolicy(user.companyId, key, body.value);
  }

  @Delete(':key')
  @Permissions({ module: 'attendance-policy', action: 'edit' })
  delete(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.service.deletePolicy(user.companyId, key);
  }
}