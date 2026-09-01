import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

jest.mock('bcrypt', () => ({
  compare: jest.fn(async () => true),
  hash: jest.fn(async () => 'hashed'),
}));

jest.mock('otplib', () => ({
  authenticator: { check: jest.fn(() => true), generateSecret: jest.fn(() => 'secret') },
}));

jest.mock('../../utils/crypto.util', () => ({
  decrypt: jest.fn((v?: string) => v ?? ''),
  encrypt: jest.fn((v: string) => v),
  decryptPiiFields: jest.fn((v: unknown) => v),
  decryptEmployeeNested: jest.fn((v: unknown) => v),
}));

function mockPrisma(opts: {
  user?: any;
  employeeStatus?: string | null;
  employeeIsSystem?: boolean;
  employeeFound?: boolean;
} = {}) {
  const {
    user = { id: 'u-1', companyId: 'c-1', email: 'a@b.c', passwordHash: 'h', roleId: 'r-1', employeeId: 'emp-1', isSuperAdmin: false, mfaEnabled: false },
    employeeStatus = 'active',
    employeeIsSystem = false,
    employeeFound = true,
  } = opts;
  return {
    user: {
      findUnique: jest.fn(async () => user),
      update: jest.fn(async (a: any) => a.data),
    },
    employee: {
      findUnique: jest.fn(async () => (employeeFound ? { status: employeeStatus, isSystem: employeeIsSystem } : null)),
    },
    refreshToken: {
      create: jest.fn(async () => ({})),
    },
  };
}

const jwt = {
  sign: jest.fn(() => 'signed-token'),
};

function service(prisma: any) {
  return new AuthService(prisma as any, { sign: jwt.sign } as any, {} as any);
}

function dto(overrides: Partial<LoginDto> = {}): LoginDto {
  return { email: 'a@b.c', password: 'secret-pass', ...overrides } as LoginDto;
}

describe('AuthService.login employee-status gate', () => {
  it('allows login when the linked employee is active', async () => {
    const svc = service(mockPrisma());
    await expect(svc.login(dto())).resolves.toMatchObject({ accessToken: 'signed-token' });
  });

  it('blocks login when the employee has exited (terminated)', async () => {
    const svc = service(mockPrisma({ employeeStatus: 'terminated' }));
    await expect(svc.login(dto())).rejects.toThrow(UnauthorizedException);
  });

  it('blocks login when the employee is archived', async () => {
    const svc = service(mockPrisma({ employeeStatus: 'archived' }));
    await expect(svc.login(dto())).rejects.toThrow(UnauthorizedException);
  });

  it('blocks login when the employee is resigned or inactive', async () => {
    await expect(service(mockPrisma({ employeeStatus: 'resigned' })).login(dto())).rejects.toThrow(UnauthorizedException);
    await expect(service(mockPrisma({ employeeStatus: 'inactive' })).login(dto())).rejects.toThrow(UnauthorizedException);
  });

  it('still allows system (internal) employee records regardless of status', async () => {
    const svc = service(mockPrisma({ employeeStatus: 'archived', employeeIsSystem: true }));
    await expect(svc.login(dto())).resolves.toMatchObject({ accessToken: 'signed-token' });
  });

  it('allows platform super admins even without an active employee record', async () => {
    const prisma = mockPrisma({
      employeeStatus: 'terminated',
      user: { id: 'u-1', companyId: 'c-1', email: 'a@b.c', passwordHash: 'h', roleId: undefined, employeeId: 'emp-1', isSuperAdmin: true, mfaEnabled: false },
    });
    await expect(service(prisma).login(dto())).resolves.toMatchObject({ accessToken: 'signed-token' });
  });

  it('allows users without a linked employee record', async () => {
    const prisma = mockPrisma({
      employeeFound: false,
      user: { id: 'u-1', companyId: 'c-1', email: 'a@b.c', passwordHash: 'h', roleId: undefined, employeeId: null, isSuperAdmin: false, mfaEnabled: false },
    });
    await expect(service(prisma).login(dto())).resolves.toMatchObject({ accessToken: 'signed-token' });
  });
});

describe('AuthService.refresh employee-status gate', () => {
  function refreshPrisma(opts: { status?: string; isSystem?: boolean; found?: boolean } = {}) {
    const { status = 'active', isSystem = false, found = true } = opts;
    return {
      refreshToken: { findMany: jest.fn(async () => [{ id: 't-1', tokenHash: 'x' }]), update: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
      user: {
        findUniqueOrThrow: jest.fn(async () => ({ id: 'u-1', companyId: 'c-1', email: 'a@b.c', roleId: 'r-1', employeeId: 'emp-1', isSuperAdmin: false })),
      },
      employee: {
        findUnique: jest.fn(async () => (found ? { status, isSystem } : null)),
      },
    };
  }

  it('issues fresh tokens for active employees', async () => {
    const prisma = refreshPrisma();
    await expect(service(prisma).refresh('u-1', 'tok')).resolves.toMatchObject({ accessToken: 'signed-token' });
  });

  it('blocks refresh tokens for terminated employees', async () => {
    const prisma = refreshPrisma({ status: 'terminated' });
    await expect(service(prisma).refresh('u-1', 'tok')).rejects.toThrow(UnauthorizedException);
  });

  it('still allows system employees on refresh', async () => {
    const prisma = refreshPrisma({ status: 'archived', isSystem: true });
    await expect(service(prisma).refresh('u-1', 'tok')).resolves.toMatchObject({ accessToken: 'signed-token' });
  });
});