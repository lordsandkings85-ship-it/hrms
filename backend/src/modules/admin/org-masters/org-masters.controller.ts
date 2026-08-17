import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { OrgMastersService } from './org-masters.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('org-masters')
export class OrgMastersController {
  constructor(private service: OrgMastersService) {}

  @Get('masters')
  @Permissions({ module: 'org-masters', action: 'view' })
  listMasters(@CurrentUser() user: AuthUser) {
    return this.service.getHRMasters(user.companyId);
  }

  @Post('masters')
  @Permissions({ module: 'org-masters', action: 'edit' })
  createMaster(@CurrentUser() user: AuthUser, @Body() body: { master: string; value: string }) {
    return this.service.createHRMaster(user.companyId, body);
  }

  @Put('masters/:id')
  @Permissions({ module: 'org-masters', action: 'edit' })
  updateMaster(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { master?: string; value?: string }) {
    return this.service.updateHRMaster(id, body);
  }

  @Delete('masters/:id')
  @Permissions({ module: 'org-masters', action: 'edit' })
  deleteMaster(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteHRMaster(id);
  }

  @Get('import')
  @Permissions({ module: 'org-masters', action: 'view' })
  listImports(@CurrentUser() user: AuthUser) {
    return this.service.getImportMappings(user.companyId);
  }

  @Post('import')
  @Permissions({ module: 'org-masters', action: 'edit' })
  createImport(@CurrentUser() user: AuthUser, @Body() body: { employee: string; manager: string; email: string }) {
    return this.service.createImportMapping(user.companyId, body);
  }

  @Put('import/:id')
  @Permissions({ module: 'org-masters', action: 'edit' })
  updateImport(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { employee?: string; manager?: string; email?: string }) {
    return this.service.updateImportMapping(id, body);
  }

  @Delete('import/:id')
  @Permissions({ module: 'org-masters', action: 'edit' })
  deleteImport(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteImportMapping(id);
  }

  @Get('forms')
  @Permissions({ module: 'org-masters', action: 'view' })
  listForms(@CurrentUser() user: AuthUser) {
    return this.service.getHRForms(user.companyId);
  }

  @Post('forms')
  @Permissions({ module: 'org-masters', action: 'edit' })
  createForm(@CurrentUser() user: AuthUser, @Body() body: { formName: string; category: string }) {
    return this.service.createHRForm(user.companyId, body);
  }

  @Put('forms/:id')
  @Permissions({ module: 'org-masters', action: 'edit' })
  updateForm(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { formName?: string; category?: string }) {
    return this.service.updateHRForm(id, body);
  }

  @Delete('forms/:id')
  @Permissions({ module: 'org-masters', action: 'edit' })
  deleteForm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteHRForm(id);
  }
}