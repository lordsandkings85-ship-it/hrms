import { Body, Controller, Get, Param, Post, UseGuards, Query, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import { AddPayoutDto, RunPayrollDto, SalaryStructureDto } from './dto/payroll.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Post('salary-structure/:employeeId')
  @Permissions({ module: 'payroll', action: 'edit' })
  setSalaryStructure(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string, @Body() body: SalaryStructureDto) {
    return this.payrollService.setSalaryStructure(user.companyId, employeeId, body);
  }

  @Get('salary-structure/:employeeId')
  @Permissions({ module: 'payroll', action: 'view' })
  getSalaryStructure(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.payrollService.getSalaryStructure(user.companyId, employeeId);
  }

  @Get('structure/:employeeId')
  @Permissions({ module: 'payroll', action: 'view' })
  getSalaryStructureAlias(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.payrollService.getSalaryStructure(user.companyId, employeeId);
  }

  @Post('run')
  @Permissions({ module: 'payroll', action: 'approve' })
runPayroll(@CurrentUser() user: AuthUser, @Body() body: RunPayrollDto) {
    return this.payrollService.runPayroll(user.companyId, body.month, body.year, body.regime);
  }

  @Get('cycles')
  @Permissions({ module: 'payroll', action: 'view' })
  listCycles(@CurrentUser() user: AuthUser) {
    return this.payrollService.listCycles(user.companyId);
  }

  @Post('cycles/:id/lock')
  @Permissions({ module: 'payroll', action: 'approve' })
  lockCycle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payrollService.lockCycle(user.companyId, id);
  }

  @Get('payslips/:employeeId')
  @Permissions({ module: 'payroll', action: 'view' })
  getPayslips(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.payrollService.getPayslips(user.companyId, employeeId);
  }

  @Get('payslip/:id')
  @Permissions({ module: 'payroll', action: 'view' })
  getPayslipDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payrollService.getPayslipDetail(user.companyId, id);
  }

  @Post('tax-preview')
  @Permissions({ module: 'payroll', action: 'view' })
  taxPreview(@Body() body: any) {
    return this.payrollService.computeTaxPreview(body);
  }
  @Get('attendance-summary')
  @Permissions({ module: 'payroll', action: 'view' })
  getAttendanceSummary(@CurrentUser() user: AuthUser, @Query('month') month: string, @Query('year') year: string) {
    return this.payrollService.getAttendanceSummary(user.companyId, parseInt(month), parseInt(year));
  }

  @Get('payouts')
  @Permissions({ module: 'payroll', action: 'view' })
  getPayouts(@CurrentUser() user: AuthUser, @Query('month') month: string, @Query('year') year: string) {
    return this.payrollService.getPayouts(user.companyId, parseInt(month), parseInt(year));
  }

  @Post('payouts')
  @Permissions({ module: 'payroll', action: 'edit' })
addPayout(@CurrentUser() user: AuthUser, @Body() body: AddPayoutDto) {
    return this.payrollService.addPayout(user.companyId, body);
  }

  @Delete('payouts/:id')
  @Permissions({ module: 'payroll', action: 'edit' })
  deletePayout(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payrollService.deletePayout(user.companyId, id);
  }

  @Get('cycles/:id/payslips')
  @Permissions({ module: 'payroll', action: 'view' })
  getCyclePayslips(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payrollService.getCyclePayslips(user.companyId, id);
  }

  @Post('cycles/:id/send-payslips')
  @Permissions({ module: 'payroll', action: 'edit' })
  sendPayslips(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payrollService.sendPayslips(user.companyId, id);
  }
}


