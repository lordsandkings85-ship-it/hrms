import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ComplianceSetupService } from './compliance-setup.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('compliance-setup')
export class ComplianceSetupController {
  constructor(private service: ComplianceSetupService) {}

  @Get('pt')
  @Permissions({ module: 'compliance-setup', action: 'view' })
  listPT(@CurrentUser() user: AuthUser) {
    return this.service.getProfessionalTaxSlabs(user.companyId);
  }

  @Post('pt')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  createPT(@CurrentUser() user: AuthUser, @Body() body: { state: string; fromAmount: number; toAmount: number; amount: number }) {
    return this.service.createProfessionalTaxSlab(user.companyId, body);
  }

  @Put('pt/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  updatePT(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { state?: string; fromAmount?: number; toAmount?: number; amount?: number }) {
    return this.service.updateProfessionalTaxSlab(id, body);
  }

  @Delete('pt/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  deletePT(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteProfessionalTaxSlab(id);
  }

  @Get('pf')
  @Permissions({ module: 'compliance-setup', action: 'view' })
  listPF(@CurrentUser() user: AuthUser) {
    return this.service.getPFConfigs(user.companyId);
  }

  @Post('pf')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  createPF(@CurrentUser() user: AuthUser, @Body() body: { component: string; rate: string; cap: string }) {
    return this.service.createPFConfig(user.companyId, body);
  }

  @Put('pf/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  updatePF(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { component?: string; rate?: string; cap?: string }) {
    return this.service.updatePFConfig(id, body);
  }

  @Delete('pf/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  deletePF(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deletePFConfig(id);
  }

  @Get('esic')
  @Permissions({ module: 'compliance-setup', action: 'view' })
  listESIC(@CurrentUser() user: AuthUser) {
    return this.service.getESICConfigs(user.companyId);
  }

  @Post('esic')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  createESIC(@CurrentUser() user: AuthUser, @Body() body: { component: string; rate: string; wageLimit: string }) {
    return this.service.createESICConfig(user.companyId, body);
  }

  @Put('esic/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  updateESIC(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { component?: string; rate?: string; wageLimit?: string }) {
    return this.service.updateESICConfig(id, body);
  }

  @Delete('esic/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  deleteESIC(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteESICConfig(id);
  }

  @Get('lwf')
  @Permissions({ module: 'compliance-setup', action: 'view' })
  listLWF(@CurrentUser() user: AuthUser) {
    return this.service.getLWFConfigs(user.companyId);
  }

  @Post('lwf')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  createLWF(@CurrentUser() user: AuthUser, @Body() body: { state: string; employeeShare: number; employerShare: number }) {
    return this.service.createLWFConfig(user.companyId, body);
  }

  @Put('lwf/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  updateLWF(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { state?: string; employeeShare?: number; employerShare?: number }) {
    return this.service.updateLWFConfig(id, body);
  }

  @Delete('lwf/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  deleteLWF(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteLWFConfig(id);
  }

  @Get('forms')
  @Permissions({ module: 'compliance-setup', action: 'view' })
  listForms(@CurrentUser() user: AuthUser) {
    return this.service.getComplianceForms(user.companyId);
  }

  @Post('forms')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  createForm(@CurrentUser() user: AuthUser, @Body() body: { formName: string; category: string }) {
    return this.service.createComplianceForm(user.companyId, body);
  }

  @Put('forms/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  updateForm(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { formName?: string; category?: string }) {
    return this.service.updateComplianceForm(id, body);
  }

  @Delete('forms/:id')
  @Permissions({ module: 'compliance-setup', action: 'edit' })
  deleteForm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteComplianceForm(id);
  }
}