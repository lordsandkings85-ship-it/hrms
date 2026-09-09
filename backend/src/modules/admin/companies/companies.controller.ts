import { Body, Controller, Get, Patch, Post, Delete, Put, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { CompaniesService, CreateCompanyInput } from './companies.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get('settings/company')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.companiesService.getProfile(user.companyId);
  }

  /** Multi-company: companies the caller can access (primary + memberships). */
  @Get('companies')
  listCompanies(@CurrentUser() user: AuthUser) {
    return this.companiesService.listAccessible(user.userId, user.companyId);
  }

  /** Multi-company: ensure default Lords and Kings group companies exist. */
  @Post('companies/ensure-defaults')
  @Permissions({ module: 'organization', action: 'create' })
  ensureDefaults(@CurrentUser() user: AuthUser) {
    return this.companiesService.ensureGroupDefaults(user.userId);
  }

  /** Multi-company: list employees belonging to a specific company. */
  @Get('companies/:id/employees')
  listCompanyEmployees(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companiesService.listCompanyEmployees(user.userId, id);
  }

  /** Multi-company: list all employees across all group companies. */
  @Get('group/employees')
  listAllGroupEmployees(@CurrentUser() user: AuthUser) {
    return this.companiesService.listAllGroupEmployees(user.userId);
  }

  /** Multi-company: batch assign/transfer employees to a target company. */
  @Post('companies/:id/assign-employees')
  @Permissions({ module: 'organization', action: 'edit' })
  assignEmployees(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { employeeIds: string[]; reason?: string; effectiveFrom?: string },
  ) {
    return this.companiesService.assignEmployees(id, user.userId, body);
  }

  /** Multi-company: create a sub-company under the caller's group. */
  @Post('companies')
  @Permissions({ module: 'organization', action: 'create' })
  createCompany(@CurrentUser() user: AuthUser, @Body() body: CreateCompanyInput) {
    return this.companiesService.create(user.userId, user.companyId, body);
  }

  /** Multi-company: update a company (Admin/Super Admin only). */
  @Patch('companies/:id')
  @Permissions({ module: 'organization', action: 'edit' })
  updateCompany(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.companiesService.update(user.userId, user.companyId, id, body);
  }

  /** Multi-company: delete a sub-company (Admin/Super Admin only). */
  @Delete('companies/:id')
  @Permissions({ module: 'organization', action: 'delete' })
  deleteCompany(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companiesService.deleteCompany(user.userId, user.companyId, id);
  }


  @Patch('settings/company')
  @Permissions({ module: 'settings', action: 'edit' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.companiesService.updateProfile(user.companyId, body);
  }

  @Get('organization/departments')
  listDepartments(@CurrentUser() user: AuthUser) {
    return this.companiesService.listDepartments(user.companyId, user.userId);
  }

  @Post('organization/departments')
  @Permissions({ module: 'organization', action: 'create' })
  createDepartment(@CurrentUser() user: AuthUser, @Body('name') name: string) {
    return this.companiesService.createDepartment(user.companyId, name);
  }

  @Delete('organization/departments/:id')
  @Permissions({ module: 'organization', action: 'delete' })
  deleteDepartment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companiesService.deleteDepartment(user.companyId, id);
  }

  @Get('organization/branches')
  listBranches(@CurrentUser() user: AuthUser) {
    return this.companiesService.listBranches(user.companyId, user.userId);
  }

  @Post('organization/branches')
  @Permissions({ module: 'organization', action: 'create' })
  createBranch(@CurrentUser() user: AuthUser, @Body() body: {
    name: string; address?: string; code?: string; city?: string;
    state?: string; country?: string; phone?: string; pincode?: string;
  }) {
    return this.companiesService.createBranch(user.companyId, body);
  }

  @Patch('organization/branches/:id')
  @Permissions({ module: 'organization', action: 'create' })
  updateBranch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: {
    name?: string; address?: string; code?: string; city?: string;
    state?: string; country?: string; phone?: string; pincode?: string; isActive?: boolean;
  }) {
    return this.companiesService.updateBranch(id, user.companyId, body);
  }

  @Delete('organization/branches/:id')
  @Permissions({ module: 'organization', action: 'delete' })
  deleteBranch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companiesService.deleteBranch(id, user.companyId);
  }

  @Get('organization/designations')
  listDesignations(@CurrentUser() user: AuthUser) {
    return this.companiesService.listDesignations(user.companyId, user.userId);
  }

  @Post('organization/designations')
  @Permissions({ module: 'organization', action: 'create' })
  createDesignation(@CurrentUser() user: AuthUser, @Body() body: { title: string; grade?: string }) {
    return this.companiesService.createDesignation(user.companyId, body.title, body.grade);
  }

  @Get('settings/roles')
  listRoles(@CurrentUser() user: AuthUser) {
    return this.companiesService.listRoles(user.companyId, user.userId);
  }

  @Get('settings/config')
  listConfig(@CurrentUser() user: AuthUser) {
    return this.companiesService.listConfig(user.companyId);
  }

  @Put('settings/config/:key')
  @Permissions({ module: 'settings', action: 'edit' })
  upsertConfig(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body('value') value: unknown) {
    return this.companiesService.upsertConfig(user.companyId, key, value);
  }

  @Delete('settings/config/:key')
  @Permissions({ module: 'settings', action: 'edit' })
  deleteConfig(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.companiesService.deleteConfig(user.companyId, key);
  }

  @Post('settings/roles')
  @Permissions({ module: 'settings', action: 'create' })
  createRole(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; permissions: { module: string; action: string }[] },
  ) {
    return this.companiesService.createRole(user.companyId, body.name, body.permissions);
  }
}

