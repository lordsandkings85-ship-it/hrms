import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ExitService } from './exit.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('exit')
export class ExitController {
  constructor(private service: ExitService) {}

  @Post('initiate')
  @Permissions({ module: 'employees', action: 'edit' })
  initiate(@Req() req: any, @Body() body: any) {
    return this.service.initiate(req.user.companyId, body);
  }

  @Get('list')
  @Permissions({ module: 'employees', action: 'view' })
  list(@Req() req: any) {
    return this.service.list(req.user.companyId);
  }

  @Get(':employeeId')
  @Permissions({ module: 'employees', action: 'view' })
  get(@Param('employeeId') employeeId: string) {
    return this.service.get(employeeId);
  }

  @Post('checklist/:id/complete')
  @Permissions({ module: 'employees', action: 'edit' })
  complete(@Param('id') id: string, @Req() req: any) {
    return this.service.completeChecklist(id, req.user.email);
  }

  @Post('checklist/:id/uncomplete')
  @Permissions({ module: 'employees', action: 'edit' })
  uncomplete(@Param('id') id: string) {
    return this.service.uncompleteChecklist(id);
  }

  @Post(':id/interview')
  @Permissions({ module: 'employees', action: 'edit' })
  interview(@Param('id') id: string, @Body() body: { note: string }) {
    return this.service.saveExitInterview(id, body.note);
  }

  @Post(':id/advance')
  @Permissions({ module: 'employees', action: 'edit' })
  advance(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.advanceStatus(id, body.status);
  }
}
