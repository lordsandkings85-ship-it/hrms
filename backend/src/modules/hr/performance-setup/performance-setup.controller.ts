import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { PerformanceSetupService } from './performance-setup.service';

@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('performance-setup')
export class PerformanceSetupController {
  constructor(private service: PerformanceSetupService) {}

  @Get('kpas')
  listKpas(@CurrentUser() user: AuthUser) {
    return this.service.getKpas(user.companyId);
  }

  @Post('kpas')
  createKpa(@CurrentUser() user: AuthUser, @Body() body: { name: string; weight: string; description?: string }) {
    return this.service.createKpa(user.companyId, body);
  }

  @Put('kpas/:id')
  updateKpa(@Param('id') id: string, @Body() body: { name?: string; weight?: string; description?: string }) {
    return this.service.updateKpa(id, body);
  }

  @Delete('kpas/:id')
  deleteKpa(@Param('id') id: string) {
    return this.service.deleteKpa(id);
  }

  @Get('kras')
  listKras(@CurrentUser() user: AuthUser, @Query('kpaId') kpaId?: string) {
    return this.service.getKras(user.companyId, kpaId);
  }

  @Post('kras')
  createKra(@CurrentUser() user: AuthUser, @Body() body: { kpaId: string; name: string; description?: string; weight: string }) {
    return this.service.createKra(user.companyId, body);
  }

  @Put('kras/:id')
  updateKra(@Param('id') id: string, @Body() body: { name?: string; description?: string; weight?: string }) {
    return this.service.updateKra(id, body);
  }

  @Delete('kras/:id')
  deleteKra(@Param('id') id: string) {
    return this.service.deleteKra(id);
  }

  @Get('kpis')
  listKpis(@CurrentUser() user: AuthUser, @Query('kraId') kraId?: string) {
    return this.service.getKpis(user.companyId, kraId);
  }

  @Post('kpis')
  createKpi(@CurrentUser() user: AuthUser, @Body() body: { kraId: string; name: string; category: string; unit: string; weight: string }) {
    return this.service.createKpi(user.companyId, body);
  }

  @Put('kpis/:id')
  updateKpi(@Param('id') id: string, @Body() body: { name?: string; category?: string; unit?: string; weight?: string }) {
    return this.service.updateKpi(id, body);
  }

  @Delete('kpis/:id')
  deleteKpi(@Param('id') id: string) {
    return this.service.deleteKpi(id);
  }

  @Get('kpi-assignments')
  listAssignments(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getKpiAssignments(user.companyId, employeeId);
  }

  @Post('kpi-assignments')
  createAssignment(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; kpiId: string; weight: string }) {
    return this.service.createKpiAssignment(user.companyId, body);
  }

  @Put('kpi-assignments/:id')
  updateAssignment(@Param('id') id: string, @Body() body: { weight: string }) {
    return this.service.updateKpiAssignment(id, body);
  }

  @Delete('kpi-assignments/:id')
  deleteAssignment(@Param('id') id: string) {
    return this.service.deleteKpiAssignment(id);
  }

  @Get('kpi-targets')
  listTargets(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getKpiTargets(user.companyId, employeeId);
  }

  @Post('kpi-targets')
  createTarget(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; kpiId: string; period: string; target: string; type: 'annual' | 'periodic' }) {
    return this.service.createKpiTarget(user.companyId, body);
  }

  @Put('kpi-targets/:id')
  updateTarget(@Param('id') id: string, @Body() body: { target: string }) {
    return this.service.updateKpiTarget(id, body);
  }

  @Delete('kpi-targets/:id')
  deleteTarget(@Param('id') id: string) {
    return this.service.deleteKpiTarget(id);
  }

  @Get('evaluation-setups')
  listSetups(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getEvaluationSetups(user.companyId, employeeId);
  }

  @Post('evaluation-setups')
  upsertSetup(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; type: 'peer' | 'external'; reviewers: any[] }) {
    return this.service.upsertEvaluationSetup(user.companyId, body.employeeId, body.type, body.reviewers);
  }

  @Delete('evaluation-setups/:id')
  deleteSetup(@Param('id') id: string) {
    return this.service.deleteEvaluationSetup(id);
  }

  @Get('evaluation-360')
  list360(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.service.getEvaluation360(user.companyId, employeeId);
  }

  @Post('evaluation-360')
  create360(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; cycle: string; avgScore: number; rating: string }) {
    return this.service.createEvaluation360(user.companyId, body);
  }
}