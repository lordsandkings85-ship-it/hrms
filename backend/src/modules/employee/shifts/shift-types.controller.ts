import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ShiftTypesService } from './shift-types.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('shift-types')
export class ShiftTypesController {
  constructor(private service: ShiftTypesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.companyId);
  }

  @Post()
  @Permissions({ module: 'shifts', action: 'edit' })
  create(@CurrentUser() user: AuthUser, @Body() body: {
    name: string;
    defaultStartTime: string;
    defaultEndTime: string;
    isFlexible?: boolean;
    graceMinutes?: number;
    coreHoursStart?: string;
    coreHoursEnd?: string;
    overtimeThresholdMinutes?: number;
  }) {
    return this.service.create(user.companyId, body);
  }

  @Patch(':id')
  @Permissions({ module: 'shifts', action: 'edit' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.service.update(user.companyId, id, body);
  }

  @Delete(':id')
  @Permissions({ module: 'shifts', action: 'edit' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.companyId, id);
  }
}
