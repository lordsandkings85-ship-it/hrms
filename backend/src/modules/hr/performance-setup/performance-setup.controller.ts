import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { PerformanceSetupService } from './performance-setup.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('performance-setup')
export class PerformanceSetupController {
  constructor(private service: PerformanceSetupService) {}

  @Get('kpas')
  @Permissions({ module: 'performance-setup', action: 'view' })
  listKpas(@CurrentUser() user: AuthUser) {
    return this.service.getKpas(user.companyId);
  }

  @Post('kpas')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  createKpa(@CurrentUser() user: AuthUser, @Body() body: { name: string; weight: string; description?: string }) {
    return this.service.createKpa(user.companyId, body);
  }

  @Put('kpas/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  updateKpa(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { name?: string; weight?: string; description?: string }) {
    return this.service.updateKpa(id, body);
  }

  @Delete('kpas/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  deleteKpa(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteKpa(id);
  }

  @Get('kras')
  @Permissions({ module: 'performance-setup', action: 'view' })
  listKras(@CurrentUser() user: AuthUser, @Query('kpaId') kpaId?: string) {
    return this.service.getKras(user.companyId, kpaId);
  }

  @Post('kras')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  createKra(@CurrentUser() user: AuthUser, @Body() body: { kpaId: string; name: string; description?: string; weight: string }) {
    return this.service.createKra(user.companyId, body);
  }

  @Put('kras/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  updateKra(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { name?: string; description?: string; weight?: string }) {
    return this.service.updateKra(id, body);
  }

  @Delete('kras/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  deleteKra(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteKra(id);
  }

  @Get('kpis')
  @Permissions({ module: 'performance-setup', action: 'view' })
  listKpis(@CurrentUser() user: AuthUser, @Query('kraId') kraId?: string) {
    return this.service.getKpis(user.companyId, kraId);
  }

  @Post('kpis')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  createKpi(@CurrentUser() user: AuthUser, @Body() body: { kraId: string; name: string; category: string; unit: string; weight: string }) {
    return this.service.createKpi(user.companyId, body);
  }

  @Put('kpis/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  updateKpi(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { name?: string; category?: string; unit?: string; weight?: string }) {
    return this.service.updateKpi(id, body);
  }

  @Delete('kpis/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  deleteKpi(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteKpi(id);
  }

  @Get('kpi-assignments')
  @Permissions({ module: 'performance-setup', action: 'view' })
  listAssignments(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getKpiAssignments(user.companyId, employeeId);
  }

  @Post('kpi-assignments')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  createAssignment(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; kpiId: string; weight: string }) {
    return this.service.createKpiAssignment(user.companyId, body);
  }

  @Put('kpi-assignments/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  updateAssignment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { weight: string }) {
    return this.service.updateKpiAssignment(id, body);
  }

  @Delete('kpi-assignments/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  deleteAssignment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteKpiAssignment(id);
  }

  @Get('kpi-targets')
  @Permissions({ module: 'performance-setup', action: 'view' })
  listTargets(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getKpiTargets(user.companyId, employeeId);
  }

  @Post('kpi-targets')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  createTarget(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; kpiId: string; period: string; target: string; type: 'annual' | 'periodic' }) {
    return this.service.createKpiTarget(user.companyId, body);
  }

  @Put('kpi-targets/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  updateTarget(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { target: string }) {
    return this.service.updateKpiTarget(id, body);
  }

  @Delete('kpi-targets/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  deleteTarget(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteKpiTarget(id);
  }

  @Get('evaluation-setups')
  @Permissions({ module: 'performance-setup', action: 'view' })
  listSetups(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getEvaluationSetups(user.companyId, employeeId);
  }

  @Post('evaluation-setups')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  upsertSetup(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; type: 'peer' | 'external'; reviewers: any[] }) {
    return this.service.upsertEvaluationSetup(user.companyId, body.employeeId, body.type, body.reviewers);
  }

  @Delete('evaluation-setups/:id')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  deleteSetup(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deleteEvaluationSetup(id);
  }

  @Get('evaluation-360')
  @Permissions({ module: 'performance-setup', action: 'view' })
  list360(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getEvaluation360(user.companyId, employeeId);
  }

  @Post('evaluation-360')
  @Permissions({ module: 'performance-setup', action: 'edit' })
  create360(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; cycle: string; avgScore: number; rating: string }) {
    return this.service.createEvaluation360(user.companyId, body);
  }
}