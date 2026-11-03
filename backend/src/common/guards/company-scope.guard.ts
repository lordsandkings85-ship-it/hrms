import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isGroupWideUser } from '../../utils/group-access.util';

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

    // Super admins and group-wide administrators have full cross-company authority
    if (user.isSuperAdmin || (user.userId && (await isGroupWideUser(this.prisma, user.userId)))) {
      return true;
    }

    // In multi-company mode the client can switch its viewing context by
    // sending X-Company-Id. It is only a viewing scope switch — it must be
    // within the set of companies the user is a member of. Never changes real
    // assignment. Defaults to the token's companyId.
    const requested = request.headers?.['x-company-id'];
    const companyIds: string[] = user.companyIds && user.companyIds.length > 0 ? user.companyIds : [user.companyId];
    if (requested) {
      if (!companyIds.includes(requested)) {
        throw new ForbiddenException('Company not in your access scope');
      }
      user.activeCompanyId = requested;
      user.companyId = requested;
    } else {
      user.activeCompanyId = user.activeCompanyId ?? user.companyId;
      user.companyId = user.activeCompanyId;
    }

    const employeeIds = this.collectEmployeeIds(request);
    if (employeeIds.length > 0) {
      await this.assertEmployeesInCompany(employeeIds, companyIds);
    }

    const recordIds = this.collectRecordIds(request);
    for (const id of recordIds) {
      await this.assertRecordInCompany(id, companyIds);
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

  private async assertEmployeesInCompany(employeeIds: string[], allowedCompanyIds: string[]) {
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, companyId: true },
    });
    const allowed = new Set(allowedCompanyIds);
    const owned = new Set(employees.filter((e) => allowed.has(e.companyId)).map((e) => e.id));
    for (const id of employeeIds) {
      if (!owned.has(id)) throw new ForbiddenException('Employee not found in your company');
    }
  }

  private async assertRecordInCompany(id: string, allowedCompanyIds: string[]) {
    // Fast-path: asset table has direct companyId
    const directCompany = await this.prisma.asset.findFirst({
      where: { id, companyId: { in: allowedCompanyIds } },
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

    for (const companyId of allowedCompanyIds) {
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
    }

    // Check employee-owned records
    const ownedByEmployee = await this.findEmployeeRecordOwner(id, allowedCompanyIds);
    if (ownedByEmployee) return;

    throw new ForbiddenException('Resource not found in your company');
  }

  private async findEmployeeRecordOwner(id: string, allowedCompanyIds: string[]): Promise<boolean> {
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

    const employeeId = result[0].employeeId || result[0].employeeid;
    if (!employeeId) return false;
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    return !!employee && allowedCompanyIds.includes(employee.companyId);
  }
}
