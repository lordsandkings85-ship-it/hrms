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
});
