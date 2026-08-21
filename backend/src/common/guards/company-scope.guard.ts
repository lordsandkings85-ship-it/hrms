import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Verifies that any `employeeId` supplied via path params, query string, or
 * request body belongs to the caller's company. Also verifies record-level
 * `:id` params (expense, travel, timesheet, exit, fnf, goal, asset, etc.)
 * belong to an employee or company of the caller. Prevents cross-tenant data
 * access (IDOR) on employee-scoped endpoints.
 *
 * Must run after JwtAuthGuard so `request.user.companyId` is populated.
 */
@Injectable()
export class CompanyScopeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.companyId) throw new ForbiddenException('Missing company context');

    const employeeIds = this.collectEmployeeIds(request);
    if (employeeIds.length > 0) {
      await this.assertEmployeesInCompany(employeeIds, user.companyId);
    }

    const recordIds = this.collectRecordIds(request);
    for (const id of recordIds) {
      await this.assertRecordInCompany(id, user.companyId);
    }

    return true;
  }

  private collectEmployeeIds(request: any): string[] {
    const ids: string[] = [];
    const add = (v: unknown) => {
      if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && ids.push(x));
      else if (typeof v === 'string') ids.push(v);
    };
    add(request.params?.employeeId);
    add(request.query?.employeeId);
    add(request.body?.employeeId);
    return [...new Set(ids)];
  }

  private collectRecordIds(request: any): string[] {
    const ids: string[] = [];
    const add = (v: unknown) => {
      if (typeof v === 'string') ids.push(v);
    };
    add(request.params?.id);
    add(request.params?.goalId);
    add(request.params?.assignmentId);
    add(request.params?.checklistId);
    add(request.params?.requestId);
    return [...new Set(ids)];
  }

  private async assertEmployeesInCompany(employeeIds: string[], companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, companyId: true },
    });
    const owned = new Set(employees.filter((e) => e.companyId === companyId).map((e) => e.id));
    for (const id of employeeIds) {
      if (!owned.has(id)) throw new ForbiddenException('Employee not found in your company');
    }
  }

  private async assertRecordInCompany(id: string, companyId: string) {
    // Fast-path: asset table has direct companyId
    const directCompany = await this.prisma.asset.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (directCompany) return;

    // Single raw SQL to check all 28 company-scoped tables at once
    const companyScopedTables = [
      'HRMaster', 'ImportMapping', 'HRForm', 'AttendancePolicy',
      'TDSSlab', 'TDSSection', 'PFConfig', 'ESICConfig', 'LWFConfig',
      'ProfessionalTaxSlab', 'KPA', 'KRA', 'KPI', 'KPIAssignment',
      'KPITarget', 'EvaluationSetup', 'Project', 'Job', 'Holiday',
      'Shift', 'ShiftType', 'CompOffRequest', 'FlexibleHolidayRequest', 'OvertimeRequest',
      'OptionalHolidayRequest', 'LoanRequest', 'TaxDeclaration', 'LeaveCancellationRequest',
    ];

    const values: any[] = [];
    for (const table of companyScopedTables) {
      values.push(id, companyId);
    }

    const result: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT 1 AS found FROM (
        ${companyScopedTables.map((t) => `SELECT id, companyId FROM \`${t}\` WHERE id = ? AND companyId = ?`).join('\n        UNION ALL\n        ')}
      ) AS combined LIMIT 1`,
      ...values,
    );

    if (result.length > 0) return;

    // Check employee-owned records
    const ownedByEmployee = await this.findEmployeeRecordOwner(id, companyId);
    if (ownedByEmployee) return;

    throw new ForbiddenException('Resource not found in your company');
  }

  private async findEmployeeRecordOwner(id: string, companyId: string): Promise<boolean> {
    const employeeOwnedTables = [
      { table: 'Expense', col: 'employeeId' },
      { table: 'TravelRequest', col: 'employeeId' },
      { table: 'Timesheet', col: 'employeeId' },
      { table: 'ExitRequest', col: 'employeeId' },
      { table: 'FnfSettlement', col: 'employeeId' },
      { table: 'Goal', col: 'employeeId' },
      { table: 'EmployeeDocument', col: 'employeeId' },
      { table: 'PerformanceReview', col: 'employeeId' },
      { table: 'AssetAssignment', col: 'employeeId' },
      { table: 'ShiftAssignment', col: 'employeeId' },
      { table: 'ShiftChangeRequest', col: 'employeeId' },
      { table: 'LeaveRequest', col: 'employeeId' },
    ];

    const values: any[] = [];
    for (const t of employeeOwnedTables) {
      values.push(id);
    }

    const result: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT employeeId FROM (
        ${employeeOwnedTables.map((t) => `SELECT employeeId FROM \`${t.table}\` WHERE id = ?`).join('\n        UNION ALL\n        ')}
      ) AS combined
      WHERE employeeId IS NOT NULL
      LIMIT 1`,
      ...values,
    );

    if (result.length === 0) return false;

    const employeeId = result[0].employeeId;
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    return employee?.companyId === companyId;
  }
}
