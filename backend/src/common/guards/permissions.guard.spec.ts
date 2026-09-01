import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

function mockPrisma(opts: {
  employeeId?: string | null;
  role?: { name?: string; isSystem?: boolean } | null;
  grants?: Array<{ module: string; action: string }>;
} = {}) {
  const { employeeId = 'emp-1', role = { isSystem: false }, grants = [] } = opts;
  return {
    user: {
      findUnique: jest.fn(async () => ({ employeeId })),
    },
    role: {
      findUnique: jest.fn(async () => role),
    },
    permission: {
      findMany: jest.fn(async () => grants),
    },
  };
}

function ctx(req: any) {
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  };
  return context as any;
}

describe('PermissionsGuard', () => {
  it('allows when no permission is required', async () => {
    const guard = new PermissionsGuard({ getAllAndOverride: () => undefined } as any, mockPrisma() as any);
    await expect(guard.canActivate(ctx({ user: { userId: 'u-1' } }))).resolves.toBe(true);
  });

  it('allows super admins without a role', async () => {
    const guard = new PermissionsGuard({ getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any, mockPrisma() as any);
    await expect(guard.canActivate(ctx({ user: { userId: 'u-1', isSuperAdmin: true } }))).resolves.toBe(true);
  });

  it('allows a user accessing their own employee record via params', async () => {
    const guard = new PermissionsGuard({ getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any, mockPrisma() as any);
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1' }, params: { employeeId: 'emp-1' } })),
    ).resolves.toBe(true);
  });

  it('allows a user accessing their own employee record via body', async () => {
    const guard = new PermissionsGuard({ getAllAndOverride: () => [{ module: 'employees', action: 'edit' }] } as any, mockPrisma() as any);
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1' }, body: { employeeId: 'emp-1' } })),
    ).resolves.toBe(true);
  });

  it('throws when the user has no role', async () => {
    const guard = new PermissionsGuard({ getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any, mockPrisma({ employeeId: null }) as any);
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1' }, params: { employeeId: 'other' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows system roles without explicit grants', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any,
      mockPrisma({ role: { isSystem: true }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1', roleId: 'r-1' }, params: { employeeId: 'other' } })),
    ).resolves.toBe(true);
  });

  it('allows a role with matching grants', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any,
      mockPrisma({ role: { isSystem: false }, grants: [{ module: 'payroll', action: 'view' }] }) as any,
    );
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1', roleId: 'r-1' }, params: { employeeId: 'other' } })),
    ).resolves.toBe(true);
  });

  it('throws for a non-system role without matching grants', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any,
      mockPrisma({ role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1', roleId: 'r-1' }, params: { employeeId: 'other' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does NOT grant access based on a role name containing admin/hr/manager keywords', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any,
      mockPrisma({
        role: { name: 'HR Admin', isSystem: false },
        grants: [],
      }) as any,
    );
    await expect(
      guard.canActivate(ctx({ user: { userId: 'u-1', roleId: 'r-1' }, params: { employeeId: 'other' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks self-bypass on salary-structure PATCH (isSalaryMutation)', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'edit' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        params: { employeeId: 'emp-1' },
        route: { path: '/payroll/salary-structure/:employeeId' },
        method: 'PATCH',
      })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows salary-structure GET via self-bypass (read-only)', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'view' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        params: { employeeId: 'emp-1' },
        route: { path: '/payroll/salary-structure/:employeeId' },
        method: 'GET',
      })),
    ).resolves.toBe(true);
  });

  it('blocks self-bypass on salary-revision POST (isSalaryMutation)', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'edit' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        params: { employeeId: 'emp-1' },
        route: { path: '/employee-services/salary-revisions' },
        method: 'POST',
      })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks self-bypass on PATCH /employees/:id (isEmployeeRecordMutation)', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'employees', action: 'edit' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        params: { id: 'emp-1' },
        route: { path: '/employees/:id' },
        method: 'PATCH',
      })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks self-bypass on DELETE /employees/:id (isEmployeeRecordMutation)', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'employees', action: 'edit' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        params: { id: 'emp-1' },
        route: { path: '/employees/:id' },
        method: 'DELETE',
      })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows GET /employees/:id via self-bypass (read-only)', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'employees', action: 'view' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        params: { id: 'emp-1' },
        route: { path: '/employees/:id' },
        method: 'GET',
      })),
    ).resolves.toBe(true);
  });

  it('allows body.employeeId self-bypass on non-salary, non-employee-record mutations', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'leave', action: 'create' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        body: { employeeId: 'emp-1' },
        route: { path: '/leave/apply' },
        method: 'POST',
      })),
    ).resolves.toBe(true);
  });

  it('blocks self-bypass on POST /payroll/payouts even with body.employeeId match', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'payroll', action: 'edit' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        body: { employeeId: 'emp-1', amount: 999999 },
        route: { path: '/payroll/payouts' },
        method: 'POST',
      })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks self-bypass on POST /leave/balances/adjust even with body.employeeId match', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => [{ module: 'leave', action: 'edit' }] } as any,
      mockPrisma({ employeeId: 'emp-1', role: { isSystem: false }, grants: [] }) as any,
    );
    await expect(
      guard.canActivate(ctx({
        user: { userId: 'u-1', roleId: 'r-1' },
        body: { employeeId: 'emp-1', amount: 999 },
        route: { path: '/leave/balances/adjust' },
        method: 'POST',
      })),
    ).rejects.toThrow(ForbiddenException);
  });
});
