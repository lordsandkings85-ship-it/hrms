import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { EmployeeServicesService } from './employee-services.service';

@UseGuards(JwtAuthGuard)
@Controller('employee-services')
export class EmployeeServicesController {
  constructor(private service: EmployeeServicesService) {}

  // ---------- Comp Off ----------
  @Post('comp-off')
  createCompOff(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; date: string; reason?: string }) {
    return this.service.createCompOff(user.companyId, body.employeeId, body.date, body.reason);
  }
  @Get('comp-off/mine')
  listCompOffMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listCompOffMine(user.companyId, employeeId);
  }
  @Get('comp-off')
  listCompOff(@CurrentUser() user: AuthUser) {
    return this.service.listCompOff(user.companyId);
  }
  @Post('comp-off/:id/approve')
  approveCompOff(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setCompOffStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('comp-off/:id/reject')
  rejectCompOff(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setCompOffStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Flexible Holiday ----------
  @Post('flexible-holiday')
  createFlexibleHoliday(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; date: string; reason?: string }) {
    return this.service.createFlexibleHoliday(user.companyId, body.employeeId, body.date, body.reason);
  }
  @Get('flexible-holiday/mine')
  listFlexibleHolidaysMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listFlexibleHolidays(user.companyId, employeeId);
  }
  @Get('flexible-holiday')
  listFlexibleHolidays(@CurrentUser() user: AuthUser) {
    return this.service.listFlexibleHolidays(user.companyId);
  }
  @Post('flexible-holiday/:id/approve')
  approveFlexibleHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setFlexibleHolidayStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('flexible-holiday/:id/reject')
  rejectFlexibleHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setFlexibleHolidayStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Overtime ----------
  @Post('overtime')
  createOvertime(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; date: string; hours: number; reason?: string }) {
    return this.service.createOvertime(user.companyId, body.employeeId, body.date, body.hours, body.reason);
  }
  @Get('overtime/mine')
  listOvertimeMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listOvertime(user.companyId, employeeId);
  }
  @Get('overtime')
  listOvertime(@CurrentUser() user: AuthUser) {
    return this.service.listOvertime(user.companyId);
  }
  @Post('overtime/:id/approve')
  approveOvertime(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOvertimeStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('overtime/:id/reject')
  rejectOvertime(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOvertimeStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Optional Holiday ----------
  @Post('optional-holiday')
  createOptionalHoliday(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; date: string; holidayName?: string; reason?: string }) {
    return this.service.createOptionalHoliday(user.companyId, body.employeeId, body.date, body.holidayName, body.reason);
  }
  @Get('optional-holiday/mine')
  listOptionalHolidaysMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listOptionalHolidays(user.companyId, employeeId);
  }
  @Get('optional-holiday')
  listOptionalHolidays(@CurrentUser() user: AuthUser) {
    return this.service.listOptionalHolidays(user.companyId);
  }
  @Post('optional-holiday/:id/approve')
  approveOptionalHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOptionalHolidayStatus(id, user.companyId, 'approved', user.userId);
  }
  @Post('optional-holiday/:id/reject')
  rejectOptionalHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setOptionalHolidayStatus(id, user.companyId, 'rejected', user.userId);
  }

  // ---------- Loans / Advances ----------
  @Post('loans')
  applyLoan(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; type?: string; purpose: string; amount: number; emiMonths?: number; emi?: number; notes?: string }) {
    return this.service.applyLoan(user.companyId, body.employeeId, body);
  }
  @Get('loans/mine')
  listLoansMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listLoans(user.companyId, employeeId);
  }
  @Get('loans')
  listLoans(@CurrentUser() user: AuthUser) {
    return this.service.listLoans(user.companyId);
  }
  @Post('loans/:id/approve')
  approveLoan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setLoanStatus(id, user.companyId, 'active', user.userId);
  }
  @Post('loans/:id/reject')
  rejectLoan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setLoanStatus(id, user.companyId, 'rejected', user.userId);
  }
  @Post('loans/:id/close')
  closeLoan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setLoanStatus(id, user.companyId, 'closed', user.userId);
  }

  // ---------- Salary Revisions ----------
  @Post('salary-revisions')
  addSalaryRevision(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; effectiveFrom: string; revisedCtc: number; previousCtc?: number; reason?: string; remarks?: string }) {
    return this.service.addSalaryRevision(user.companyId, body.employeeId, body);
  }
  @Get('salary-revisions/employee/:employeeId')
  listSalaryRevisionsForEmployee(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.service.listSalaryRevisions(user.companyId, employeeId);
  }
  @Get('salary-revisions')
  listSalaryRevisions(@CurrentUser() user: AuthUser) {
    return this.service.listSalaryRevisions(user.companyId);
  }

  // ---------- Tax Declarations ----------
  @Post('tax-declarations')
  createTaxDeclaration(@CurrentUser() user: AuthUser, @Body() body: { employeeId: string; financialYear?: string; section: string; description?: string; declaredAmount: number }) {
    return this.service.createTaxDeclaration(user.companyId, body.employeeId, body);
  }
  @Get('tax-declarations/mine')
  listTaxDeclarationsMine(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.service.listTaxDeclarations(user.companyId, employeeId);
  }
  @Get('tax-declarations')
  listTaxDeclarations(@CurrentUser() user: AuthUser) {
    return this.service.listTaxDeclarations(user.companyId);
  }
  @Post('tax-declarations/:id/approve')
  approveTaxDeclaration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { approvedAmount?: number }) {
    return this.service.setTaxDeclarationStatus(id, user.companyId, 'approved', user.userId, body.approvedAmount);
  }
  @Post('tax-declarations/:id/reject')
  rejectTaxDeclaration(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.setTaxDeclarationStatus(id, user.companyId, 'rejected', user.userId);
  }
}
