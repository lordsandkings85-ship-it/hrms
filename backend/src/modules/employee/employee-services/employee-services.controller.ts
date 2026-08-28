import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { EmployeeServicesService } from './employee-services.service';
import {
  ApproveTaxDeclarationDto,
  CompOffDto,
  FlexibleHolidayDto,
  LoanDto,
  OptionalHolidayDto,
  OvertimeDto,
  SalaryRevisionDto,
  TaxDeclarationDto,
} from './dto/employee-services.dto';

@UseGuards(JwtAuthGuard, CompanyScopeGuard, PermissionsGuard)
@Controller('employee-services')
export class EmployeeServicesController {
  constructor(private service: EmployeeServicesService) {}

  // ---------- Comp Off ----------
  @Post('comp-off')
  @Permissions({ module: 'employee-services', action: 'create' })
  createCompOff(@CurrentUser() user: AuthUser, @Body() body: CompOffDto) {
    return this.service.createCompOff(user.companyId, body.employeeId, body.date, body.reason);
  }
  @Get('comp-off/mine')
  @Permissions({ module: 'employee-services', action: 'view' })
  listCompOffMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listCompOffMine(user.companyId, employeeId);
  }
  @Get('comp-off/balance')
  @Permissions({ module: 'employee-services', action: 'view' })
  listCompOffBalance(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    if (employeeId) {
      return this.service.compOffRemaining(user.companyId, employeeId);
    }
    return this.service.listCompOffBalances(user.companyId);
  }
  @Get('comp-off')
  @Permissions({ module: 'employee-services', action: 'view' })
  listCompOff(@CurrentUser() user: AuthUser) {
    return this.service.listCompOff(user.companyId);
  }
  @Post('comp-off/:id/approve')
  @Permissions({ module: 'employee-services', action: 'approve' })
  approveCompOff(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setCompOffStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('comp-off/:id/reject')
  @Permissions({ module: 'employee-services', action: 'approve' })
  rejectCompOff(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setCompOffStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Flexible Holiday ----------
  @Post('flexible-holiday')
  @Permissions({ module: 'employee-services', action: 'create' })
  createFlexibleHoliday(@CurrentUser() user: AuthUser, @Body() body: FlexibleHolidayDto) {
    return this.service.createFlexibleHoliday(user.companyId, body.employeeId, body.date, body.reason);
  }
  @Get('flexible-holiday/mine')
  @Permissions({ module: 'employee-services', action: 'view' })
  listFlexibleHolidaysMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listFlexibleHolidays(user.companyId, employeeId);
  }
  @Get('flexible-holiday')
  @Permissions({ module: 'employee-services', action: 'view' })
  listFlexibleHolidays(@CurrentUser() user: AuthUser) {
    return this.service.listFlexibleHolidays(user.companyId);
  }
  @Post('flexible-holiday/:id/approve')
  @Permissions({ module: 'employee-services', action: 'approve' })
  approveFlexibleHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setFlexibleHolidayStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('flexible-holiday/:id/reject')
  @Permissions({ module: 'employee-services', action: 'approve' })
  rejectFlexibleHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setFlexibleHolidayStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Overtime ----------
  @Post('overtime')
  @Permissions({ module: 'employee-services', action: 'create' })
  createOvertime(@CurrentUser() user: AuthUser, @Body() body: OvertimeDto) {
    return this.service.createOvertime(user.companyId, body.employeeId, body.date, body.hours, body.reason);
  }
  @Get('overtime/mine')
  @Permissions({ module: 'employee-services', action: 'view' })
  listOvertimeMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listOvertime(user.companyId, employeeId);
  }
  @Get('overtime')
  @Permissions({ module: 'employee-services', action: 'view' })
  listOvertime(@CurrentUser() user: AuthUser) {
    return this.service.listOvertime(user.companyId);
  }
  @Post('overtime/:id/approve')
  @Permissions({ module: 'employee-services', action: 'approve' })
  approveOvertime(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOvertimeStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('overtime/:id/reject')
  @Permissions({ module: 'employee-services', action: 'approve' })
  rejectOvertime(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOvertimeStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Optional Holiday ----------
  @Post('optional-holiday')
  @Permissions({ module: 'employee-services', action: 'create' })
  createOptionalHoliday(@CurrentUser() user: AuthUser, @Body() body: OptionalHolidayDto) {
    return this.service.createOptionalHoliday(user.companyId, body.employeeId, body.date, body.holidayName, body.reason);
  }
  @Get('optional-holiday/mine')
  @Permissions({ module: 'employee-services', action: 'view' })
  listOptionalHolidaysMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listOptionalHolidays(user.companyId, employeeId);
  }
  @Get('optional-holiday')
  @Permissions({ module: 'employee-services', action: 'view' })
  listOptionalHolidays(@CurrentUser() user: AuthUser) {
    return this.service.listOptionalHolidays(user.companyId);
  }
  @Post('optional-holiday/:id/approve')
  @Permissions({ module: 'employee-services', action: 'approve' })
  approveOptionalHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOptionalHolidayStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('optional-holiday/:id/reject')
  @Permissions({ module: 'employee-services', action: 'approve' })
  rejectOptionalHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOptionalHolidayStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Loans / Advances ----------
  @Post('loans')
  @Permissions({ module: 'employee-services', action: 'create' })
  applyLoan(@CurrentUser() user: AuthUser, @Body() body: LoanDto) {
    return this.service.applyLoan(user.companyId, body.employeeId, body);
  }
  @Get('loans/mine')
  @Permissions({ module: 'employee-services', action: 'view' })
  listLoansMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listLoans(user.companyId, employeeId);
  }
  @Get('loans')
  @Permissions({ module: 'employee-services', action: 'view' })
  listLoans(@CurrentUser() user: AuthUser) {
    return this.service.listLoans(user.companyId);
  }
  @Post('loans/:id/approve')
  @Permissions({ module: 'employee-services', action: 'approve' })
  approveLoan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setLoanStatus(id, user.companyId, 'active', user.userId);
  }
  @Post('loans/:id/reject')
  @Permissions({ module: 'employee-services', action: 'approve' })
  rejectLoan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setLoanStatus(id, user.companyId, 'rejected', user.userId);
  }
  @Post('loans/:id/close')
  @Permissions({ module: 'employee-services', action: 'approve' })
  closeLoan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setLoanStatus(id, user.companyId, 'closed', user.userId);
  }

  // ---------- Salary Revisions ----------
  @Post('salary-revisions')
  @Permissions({ module: 'payroll', action: 'edit' })
  addSalaryRevision(@CurrentUser() user: AuthUser, @Body() body: SalaryRevisionDto) {
    return this.service.addSalaryRevision(user.companyId, body.employeeId, body);
  }
  @Get('salary-revisions/employee/:employeeId')
  @Permissions({ module: 'payroll', action: 'view' })
  listSalaryRevisionsForEmployee(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.service.listSalaryRevisions(user.companyId, employeeId);
  }
  @Get('salary-revisions')
  @Permissions({ module: 'payroll', action: 'view' })
  listSalaryRevisions(@CurrentUser() user: AuthUser) {
    return this.service.listSalaryRevisions(user.companyId);
  }

  // ---------- Tax Declarations ----------
  @Post('tax-declarations')
  @Permissions({ module: 'employee-services', action: 'create' })
  createTaxDeclaration(@CurrentUser() user: AuthUser, @Body() body: TaxDeclarationDto) {
    return this.service.createTaxDeclaration(user.companyId, body.employeeId, body);
  }
  @Get('tax-declarations/mine')
  @Permissions({ module: 'employee-services', action: 'view' })
  listTaxDeclarationsMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listTaxDeclarations(user.companyId, employeeId);
  }
  @Get('tax-declarations')
  @Permissions({ module: 'employee-services', action: 'view' })
  listTaxDeclarations(@CurrentUser() user: AuthUser) {
    return this.service.listTaxDeclarations(user.companyId);
  }
  @Post('tax-declarations/:id/approve')
  @Permissions({ module: 'employee-services', action: 'approve' })
  approveTaxDeclaration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: ApproveTaxDeclarationDto) {
    return this.service.setTaxDeclarationStatus(id, user.companyId, 'approved', user.userId, body.approvedAmount);
  }
  @Post('tax-declarations/:id/reject')
  @Permissions({ module: 'employee-services', action: 'approve' })
  rejectTaxDeclaration(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setTaxDeclarationStatus(id, user.companyId, 'rejected', user.userId);
  }
}
