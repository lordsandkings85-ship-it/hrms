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

  /** Resolves a record id to its owning employee/company and verifies ownership. */
  private async assertRecordInCompany(id: string, companyId: string) {
    const directCompany = await this.prisma.asset.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (directCompany) return;

    const directCompanyScoped = await this.prisma.$transaction(async (tx) => {
      const tables = [
        () => tx.hRMaster.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.importMapping.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.hRForm.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.attendancePolicy.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.tDSSlab.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.tDSSection.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.pFConfig.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.eSICConfig.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.lWFConfig.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.professionalTaxSlab.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.kPA.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.kRA.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.kPI.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.kPIAssignment.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.kPITarget.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.evaluationSetup.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.project.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.job.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.holiday.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.shift.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.compOffRequest.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.flexibleHolidayRequest.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.overtimeRequest.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.optionalHolidayRequest.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.loanRequest.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.taxDeclaration.findFirst({ where: { id, companyId }, select: { id: true } }),
        () => tx.leaveCancellationRequest.findFirst({ where: { id, companyId }, select: { id: true } }),
      ];
      for (const find of tables) {
        if (await find()) return true;
      }
      return false;
    });
    if (directCompanyScoped) return;

    const ownedByEmployee = await this.findEmployeeRecordOwner(id, companyId);
    if (ownedByEmployee) return;

    throw new ForbiddenException('Resource not found in your company');
  }

  private async findEmployeeRecordOwner(id: string, companyId: string): Promise<boolean> {
    const resolvers: Array<() => Promise<string | null>> = [
      () => this.prisma.expense.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.travelRequest.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.timesheet.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.exitRequest.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.fnfSettlement.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.goal.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.employeeDocument.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.performanceReview.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.assetAssignment.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.shiftAssignment.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.exitChecklist
        .findUnique({ where: { id }, select: { exitRequest: { select: { employeeId: true } } } })
        .then((r) => r?.exitRequest.employeeId ?? null),
      () => this.prisma.shiftChangeRequest.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
      () => this.prisma.leaveRequest.findUnique({ where: { id }, select: { employeeId: true } }).then((r) => r?.employeeId ?? null),
    ];

    for (const resolve of resolvers) {
      const employeeId = await resolve();
      if (employeeId) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: employeeId },
          select: { companyId: true },
        });
        return employee?.companyId === companyId;
      }
    }
    return false;
  }
}
