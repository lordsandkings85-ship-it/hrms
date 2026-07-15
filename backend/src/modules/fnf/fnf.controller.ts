import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { FnfService } from './fnf.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fnf')
export class FnfController {
  constructor(private service: FnfService) {}

  @Post('initiate')
  @Permissions({ module: 'payroll', action: 'create' })
  initiate(@Body() body: { employeeId: string; lastWorkingDay: string; noticePeriodDays?: number }) {
    return this.service.initiate(body.employeeId, body.lastWorkingDay, body.noticePeriodDays);
  }

  @Get('list')
  @Permissions({ module: 'payroll', action: 'view' })
  list(@Req() req: any) {
    return this.service.list(req.user.companyId);
  }

  @Get(':employeeId')
  @Permissions({ module: 'payroll', action: 'view' })
  get(@Param('employeeId') employeeId: string) {
    return this.service.get(employeeId);
  }

  @Post(':id/approve')
  @Permissions({ module: 'payroll', action: 'approve' })
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Patch(':id/overrides')
  @Permissions({ module: 'payroll', action: 'edit' })
  updateOverrides(@Param('id') id: string, @Body() body: any) {
    return this.service.updateOverrides(id, body);
  }
}
