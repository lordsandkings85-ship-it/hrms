import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { OrgMastersService } from './org-masters.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('org-masters')
export class OrgMastersController {
  constructor(private service: OrgMastersService) {}

  @Get('masters')
  listMasters(@CurrentUser() user: AuthUser) {
    return this.service.getHRMasters(user.companyId);
  }

  @Post('masters')
  createMaster(@CurrentUser() user: AuthUser, @Body() body: { master: string; value: string }) {
    return this.service.createHRMaster(user.companyId, body);
  }

  @Put('masters/:id')
  updateMaster(@Param('id') id: string, @Body() body: { master?: string; value?: string }) {
    return this.service.updateHRMaster(id, body);
  }

  @Delete('masters/:id')
  deleteMaster(@Param('id') id: string) {
    return this.service.deleteHRMaster(id);
  }

  @Get('import')
  listImports(@CurrentUser() user: AuthUser) {
    return this.service.getImportMappings(user.companyId);
  }

  @Post('import')
  createImport(@CurrentUser() user: AuthUser, @Body() body: { employee: string; manager: string; email: string }) {
    return this.service.createImportMapping(user.companyId, body);
  }

  @Put('import/:id')
  updateImport(@Param('id') id: string, @Body() body: { employee?: string; manager?: string; email?: string }) {
    return this.service.updateImportMapping(id, body);
  }

  @Delete('import/:id')
  deleteImport(@Param('id') id: string) {
    return this.service.deleteImportMapping(id);
  }

  @Get('forms')
  listForms(@CurrentUser() user: AuthUser) {
    return this.service.getHRForms(user.companyId);
  }

  @Post('forms')
  createForm(@CurrentUser() user: AuthUser, @Body() body: { formName: string; category: string }) {
    return this.service.createHRForm(user.companyId, body);
  }

  @Put('forms/:id')
  updateForm(@Param('id') id: string, @Body() body: { formName?: string; category?: string }) {
    return this.service.updateHRForm(id, body);
  }

  @Delete('forms/:id')
  deleteForm(@Param('id') id: string) {
    return this.service.deleteHRForm(id);
  }
}