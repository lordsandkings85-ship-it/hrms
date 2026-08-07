import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ComplianceSetupService } from './compliance-setup.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('compliance-setup')
export class ComplianceSetupController {
  constructor(private service: ComplianceSetupService) {}

  @Get('pt')
  listPT(@CurrentUser() user: AuthUser) {
    return this.service.getProfessionalTaxSlabs(user.companyId);
  }

  @Post('pt')
  createPT(@CurrentUser() user: AuthUser, @Body() body: { state: string; fromAmount: number; toAmount: number; amount: number }) {
    return this.service.createProfessionalTaxSlab(user.companyId, body);
  }

  @Put('pt/:id')
  updatePT(@Param('id') id: string, @Body() body: { state?: string; fromAmount?: number; toAmount?: number; amount?: number }) {
    return this.service.updateProfessionalTaxSlab(id, body);
  }

  @Delete('pt/:id')
  deletePT(@Param('id') id: string) {
    return this.service.deleteProfessionalTaxSlab(id);
  }

  @Get('pf')
  listPF(@CurrentUser() user: AuthUser) {
    return this.service.getPFConfigs(user.companyId);
  }

  @Post('pf')
  createPF(@CurrentUser() user: AuthUser, @Body() body: { component: string; rate: string; cap: string }) {
    return this.service.createPFConfig(user.companyId, body);
  }

  @Put('pf/:id')
  updatePF(@Param('id') id: string, @Body() body: { component?: string; rate?: string; cap?: string }) {
    return this.service.updatePFConfig(id, body);
  }

  @Delete('pf/:id')
  deletePF(@Param('id') id: string) {
    return this.service.deletePFConfig(id);
  }

  @Get('esic')
  listESIC(@CurrentUser() user: AuthUser) {
    return this.service.getESICConfigs(user.companyId);
  }

  @Post('esic')
  createESIC(@CurrentUser() user: AuthUser, @Body() body: { component: string; rate: string; wageLimit: string }) {
    return this.service.createESICConfig(user.companyId, body);
  }

  @Put('esic/:id')
  updateESIC(@Param('id') id: string, @Body() body: { component?: string; rate?: string; wageLimit?: string }) {
    return this.service.updateESICConfig(id, body);
  }

  @Delete('esic/:id')
  deleteESIC(@Param('id') id: string) {
    return this.service.deleteESICConfig(id);
  }

  @Get('lwf')
  listLWF(@CurrentUser() user: AuthUser) {
    return this.service.getLWFConfigs(user.companyId);
  }

  @Post('lwf')
  createLWF(@CurrentUser() user: AuthUser, @Body() body: { state: string; employeeShare: number; employerShare: number }) {
    return this.service.createLWFConfig(user.companyId, body);
  }

  @Put('lwf/:id')
  updateLWF(@Param('id') id: string, @Body() body: { state?: string; employeeShare?: number; employerShare?: number }) {
    return this.service.updateLWFConfig(id, body);
  }

  @Delete('lwf/:id')
  deleteLWF(@Param('id') id: string) {
    return this.service.deleteLWFConfig(id);
  }

  @Get('forms')
  listForms(@CurrentUser() user: AuthUser) {
    return this.service.getComplianceForms(user.companyId);
  }

  @Post('forms')
  createForm(@CurrentUser() user: AuthUser, @Body() body: { formName: string; category: string }) {
    return this.service.createComplianceForm(user.companyId, body);
  }

  @Put('forms/:id')
  updateForm(@Param('id') id: string, @Body() body: { formName?: string; category?: string }) {
    return this.service.updateComplianceForm(id, body);
  }

  @Delete('forms/:id')
  deleteForm(@Param('id') id: string) {
    return this.service.deleteComplianceForm(id);
  }
}