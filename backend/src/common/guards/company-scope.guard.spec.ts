import { ForbiddenException } from '@nestjs/common';
import { CompanyScopeGuard } from './company-scope.guard';

const COMPANY = 'company-A';

/**
 * Builds a PrismaService double.
 * `employeeOwners` maps record-id -> employeeId (for employee-owned records).
 * `employeeCompany` maps employeeId -> companyId (defaults to COMPANY).
 * `assets` lists direct-company asset ids.
 */
function mockPrisma(opts: {
  employeeOwners?: Record<string, string>;
  employeeCompany?: Record<string, string>;
  assets?: string[];
} = {}) {
  const {
    employeeOwners = {},
    employeeCompany = {},
    assets = [],
  } = opts;
  const companyOf = (employeeId: string) => employeeCompany[employeeId] ?? COMPANY;

  const ownerFor = (recordId: string) => (employeeOwners[recordId] ? { employeeId: employeeOwners[recordId] } : null);

  return {
    employee: {
      findMany: jest.fn(async ({ where }) => {
        return (where.id.in as string[]).map((id) => ({ id, companyId: companyOf(id) }));
      }),
      findUnique: jest.fn(async ({ where }) => ({ id: where.id, companyId: companyOf(where.id) })),
    },
    asset: { findFirst: jest.fn(async ({ where }) => (assets.includes(where.id) ? { id: where.id } : null)) },
    expense: { findUnique: jest.fn(async ({ where }) => ownerFor(where.id)) },
    travelRequest: { findUnique: jest.fn(async () => null) },
    timesheet: { findUnique: jest.fn(async () => null) },
    exitRequest: { findUnique: jest.fn(async () => null) },
    fnfSettlement: { findUnique: jest.fn(async () => null) },
    goal: { findUnique: jest.fn(async () => null) },
    employeeDocument: { findUnique: jest.fn(async () => null) },
    performanceReview: { findUnique: jest.fn(async () => null) },
    assetAssignment: { findUnique: jest.fn(async () => null) },
    shiftAssignment: { findUnique: jest.fn(async () => null) },
    exitChecklist: { findUnique: jest.fn(async () => null) },
    shiftChangeRequest: { findUnique: jest.fn(async () => null) },
    leaveRequest: { findUnique: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: any) =>
      fn({
        hRMaster: { findFirst: jest.fn(async () => null) },
        importMapping: { findFirst: jest.fn(async () => null) },
        hRForm: { findFirst: jest.fn(async () => null) },
        attendancePolicy: { findFirst: jest.fn(async () => null) },
        tDSSlab: { findFirst: jest.fn(async () => null) },
        tDSSection: { findFirst: jest.fn(async () => null) },
        pFConfig: { findFirst: jest.fn(async () => null) },
        eSICConfig: { findFirst: jest.fn(async () => null) },
        lWFConfig: { findFirst: jest.fn(async () => null) },
        professionalTaxSlab: { findFirst: jest.fn(async () => null) },
        kPA: { findFirst: jest.fn(async () => null) },
        kRA: { findFirst: jest.fn(async () => null) },
        kPI: { findFirst: jest.fn(async () => null) },
        kPIAssignment: { findFirst: jest.fn(async () => null) },
        kPITarget: { findFirst: jest.fn(async () => null) },
        evaluationSetup: { findFirst: jest.fn(async () => null) },
        project: { findFirst: jest.fn(async () => null) },
        job: { findFirst: jest.fn(async () => null) },
        holiday: { findFirst: jest.fn(async () => null) },
        shift: { findFirst: jest.fn(async () => null) },
        compOffRequest: { findFirst: jest.fn(async () => null) },
        flexibleHolidayRequest: { findFirst: jest.fn(async () => null) },
        overtimeRequest: { findFirst: jest.fn(async () => null) },
        optionalHolidayRequest: { findFirst: jest.fn(async () => null) },
        loanRequest: { findFirst: jest.fn(async () => null) },
        taxDeclaration: { findFirst: jest.fn(async () => null) },
        leaveCancellationRequest: { findFirst: jest.fn(async () => null) },
      }),
    ),
  };
}

function ctx(req: any) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('CompanyScopeGuard', () => {
  it('throws when no company context exists', async () => {
    const guard = new CompanyScopeGuard(mockPrisma() as any);
    await expect(guard.canActivate(ctx({ user: {} }))).rejects.toThrow(ForbiddenException);
  });

  it('allows when no employee or record ids are present', async () => {
    const guard = new CompanyScopeGuard(mockPrisma() as any);
    await expect(guard.canActivate(ctx({ user: { companyId: COMPANY } }))).resolves.toBe(true);
  });

  it('allows an employeeId owned by the caller company', async () => {
    const guard = new CompanyScopeGuard(mockPrisma() as any);
    await expect(
      guard.canActivate(ctx({ user: { companyId: COMPANY }, params: { employeeId: 'emp-1' } })),
    ).resolves.toBe(true);
  });

  it('rejects an employeeId owned by another company', async () => {
    const guard = new CompanyScopeGuard(
      mockPrisma({ employeeCompany: { 'emp-1': 'company-B' } }) as any,
    );
    await expect(
      guard.canActivate(ctx({ user: { companyId: COMPANY }, params: { employeeId: 'emp-1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('collects employeeId from body and query as well', async () => {
    const guard = new CompanyScopeGuard(mockPrisma() as any);
    await expect(
      guard.canActivate(
        ctx({ user: { companyId: COMPANY }, body: { employeeId: 'emp-1' }, query: { employeeId: 'emp-1' } }),
      ),
    ).resolves.toBe(true);
  });

  it('allows a record id that resolves to an employee in the caller company', async () => {
    const guard = new CompanyScopeGuard(
      mockPrisma({ employeeOwners: { 'expense-1': 'emp-1' } }) as any,
    );
    await expect(
      guard.canActivate(ctx({ user: { companyId: COMPANY }, params: { id: 'expense-1' } })),
    ).resolves.toBe(true);
  });

  it('rejects a record id whose employee belongs to another company', async () => {
    const guard = new CompanyScopeGuard({
      ...mockPrisma(),
    } as any);
    const prisma = (guard as any).prisma;
    prisma.expense.findUnique.mockResolvedValue({ employeeId: 'emp-1' });
    prisma.employee.findUnique.mockResolvedValue({ id: 'emp-1', companyId: 'company-B' });
    await expect(
      guard.canActivate(ctx({ user: { companyId: COMPANY }, params: { id: 'expense-1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows a direct-company asset record', async () => {
    const guard = new CompanyScopeGuard(mockPrisma({ assets: ['asset-1'] }) as any);
    await expect(
      guard.canActivate(ctx({ user: { companyId: COMPANY }, params: { id: 'asset-1' } })),
    ).resolves.toBe(true);
  });

  it('rejects an unresolvable record id', async () => {
    const guard = new CompanyScopeGuard(mockPrisma() as any);
    await expect(
      guard.canActivate(ctx({ user: { companyId: COMPANY }, params: { id: 'ghost-1' } })),
    ).rejects.toThrow(ForbiddenException);
  });
});
