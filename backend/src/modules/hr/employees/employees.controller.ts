import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateLoginDto, ResetPasswordDto, ToggleLoginDto } from './dto/manage-login.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @Permissions({ module: 'employees', action: 'create' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.companyId, user.userId, dto);
  }

  @Get()
  @Permissions({ module: 'employees', action: 'view' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.employeesService.findAll(user.companyId, user.userId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      departmentId,
      status,
    });
  }

  @Patch('me/compliance')
  updateMyCompliance(@CurrentUser() user: AuthUser, @Body() dto: { uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }) {
    return this.employeesService.updateMyCompliance(user.companyId, user.userId, dto);
  }

  @Post('bulk-compliance')
  @Permissions({ module: 'employees', action: 'edit' })
  bulkCompliance(
    @CurrentUser() user: AuthUser,
    @Body() body: { items: { employeeId: string; uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }[] },
  ) {
    return this.employeesService.bulkUpdateCompliance(user.companyId, body.items || []);
  }

  @Post('import-managers')
  @Permissions({ module: 'employees', action: 'edit' })
  importManagers(
    @CurrentUser() user: AuthUser,
    @Body() body: { items: { employeeCode: string; managerCode?: string; companyEmail?: string }[] },
  ) {
    return this.employeesService.importManagers(user.companyId, body.items || []);
  }

  @Post('send-credentials')
  @Permissions({ module: 'employees', action: 'edit' })
  sendCredentials(@CurrentUser() user: AuthUser, @Body() body: { employeeIds: string[] }) {
    return this.employeesService.sendCredentials(user.companyId, body.employeeIds || []);
  }

  @Get('login-status')
  @UseGuards(SuperAdminGuard)
  loginStatuses(@CurrentUser() user: AuthUser) {
    return this.employeesService.getLoginStatuses(user.companyId);
  }

  @Post('login-status')
  @UseGuards(SuperAdminGuard)
  loginStatusesPost(@CurrentUser() user: AuthUser) {
    return this.employeesService.getLoginStatuses(user.companyId);
  }

  @Get(':id')
  @Permissions({ module: 'employees', action: 'view' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employeesService.findOne(user.companyId, user.userId, id);
  }

  @Post(':id/create-login')
  @UseGuards(SuperAdminGuard)
  createLogin(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateLoginDto) {
    return this.employeesService.createLoginForEmployee(user.companyId, user.userId, id, dto);
  }

  @Patch(':id/toggle-login')
  @UseGuards(SuperAdminGuard)
  toggleLogin(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ToggleLoginDto) {
    return this.employeesService.toggleLoginStatus(user.companyId, user.userId, id, dto);
  }

  @Post(':id/reset-password')
  @UseGuards(SuperAdminGuard)
  resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.employeesService.resetEmployeePassword(user.companyId, user.userId, id, dto);
  }

  @Patch(':id')
  @Permissions({ module: 'employees', action: 'edit' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(user.companyId, user.userId, id, dto);
  }

  @Post(':id/archive')
  @Permissions({ module: 'employees', action: 'delete' })
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employeesService.archive(user.companyId, user.userId, id);
  }

  @Post(':id/terminate')
  @Permissions({ module: 'employees', action: 'edit' })
  terminate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employeesService.terminate(user.companyId, user.userId, id);
  }

  @Delete(':id')
  @Permissions({ module: 'employees', action: 'delete' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employeesService.remove(user.companyId, user.userId, id);
  }
}
