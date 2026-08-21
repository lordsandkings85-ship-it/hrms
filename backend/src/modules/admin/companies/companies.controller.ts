import { Body, Controller, Get, Patch, Post, Delete, Put, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get('settings/company')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.companiesService.getProfile(user.companyId);
  }

  @Patch('settings/company')
  @Permissions({ module: 'settings', action: 'edit' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.companiesService.updateProfile(user.companyId, body);
  }

  @Get('organization/departments')
  listDepartments(@CurrentUser() user: AuthUser) {
    return this.companiesService.listDepartments(user.companyId);
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
    return this.companiesService.listBranches(user.companyId);
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
    return this.companiesService.listDesignations(user.companyId);
  }

  @Post('organization/designations')
  @Permissions({ module: 'organization', action: 'create' })
  createDesignation(@CurrentUser() user: AuthUser, @Body() body: { title: string; grade?: string }) {
    return this.companiesService.createDesignation(user.companyId, body.title, body.grade);
  }

  @Get('settings/roles')
  listRoles(@CurrentUser() user: AuthUser) {
    return this.companiesService.listRoles(user.companyId);
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

