import { ForbiddenException } from '@nestjs/common';
import { CompanyScopeGuard } from './company-scope.guard';

const COMPANY = 'company-A';

/**
 * Builds a PrismaService double.
 * `employeeOwners` maps record-id -> employeeId (for employee-owned records).
 * `employeeCompany` maps employeeId -> companyId (defaults to COMPANY).
 * `assets` lists direct-company asset ids.
 * `companyScopedRecords` lists record ids that belong to the company via a company-scoped table.
 */
function mockPrisma(opts: {
  employeeOwners?: Record<string, string>;
  employeeCompany?: Record<string, string>;
  assets?: string[];
  companyScopedRecords?: string[];
} = {}) {
  const {
    employeeOwners = {},
    employeeCompany = {},
    assets = [],
    companyScopedRecords = [],
  } = opts;
  const companyOf = (employeeId: string) => employeeCompany[employeeId] ?? COMPANY;

  return {
    employee: {
      findMany: jest.fn(async ({ where }) => {
        return (where.id.in as string[]).map((id) => ({ id, companyId: companyOf(id) }));
      }),
      findUnique: jest.fn(async ({ where }) => ({ id: where.id, companyId: companyOf(where.id) })),
    },
    asset: { findFirst: jest.fn(async ({ where }) => (assets.includes(where.id) ? { id: where.id } : null)) },
    $queryRawUnsafe: jest.fn(async (sql: string, ...args: any[]) => {
      const id = args[0];
      // Employee-owned record check (UNION of Expense, TravelRequest, etc.)
      if (sql.includes('Expense')) {
        if (employeeOwners[id]) {
          return [{ employeeId: employeeOwners[id] }];
        }
        return [];
      }
      // Company-scoped table check (UNION of HRMaster, ImportMapping, etc.)
      if (companyScopedRecords.includes(id)) {
        return [{ found: 1 }];
      }
      return [];
    }),
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
    const guard = new CompanyScopeGuard(
      mockPrisma({ employeeOwners: { 'expense-1': 'emp-1' }, employeeCompany: { 'emp-1': 'company-B' } }) as any,
    );
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
