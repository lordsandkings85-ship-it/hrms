import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';

function createPrismaMock(overrides: Record<string, any> = {}) {
  const calls = {
    company: {
      findMany: jest.fn(async () => [] as any),
      findUnique: jest.fn(async () => null as any),
      findFirst: jest.fn(async () => null as any),
      create: jest.fn(async (a: any) => ({ id: 'co-1', status: 'active', gstNumber: null, panNumber: null, ...(a.data || {}) })),
      update: jest.fn(async (a: any) => ({ id: a.where.id, ...(a.data || {}) })),
    },
    user: {
      findUnique: jest.fn(async () => ({
        isSuperAdmin: false,
        role: { isSystem: false, permissions: [] },
      }) as any),
      findMany: jest.fn(async () => [
        { id: 'super-1' },
        { id: 'system-1' },
      ] as any),
    },
    userCompany: {
      findMany: jest.fn(async () => [] as any),
      create: jest.fn(async () => ({})),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    auditLog: {
      create: jest.fn(async () => ({})),
    },
    ...overrides,
  };

  // Flatten per-model methods like the real PrismaService proxy.
  const prisma = {
    company: calls.company,
    user: calls.user,
    userCompany: calls.userCompany,
    auditLog: calls.auditLog,
  };
  (prisma as any).__calls = calls;
  return prisma;
}

function service(prisma: any) {
  return new CompaniesService(prisma);
}

function baseData() {
  return {
    name: 'Acme Foods Pvt Ltd',
    legalName: 'Acme Foods Private Limited',
    displayName: 'Acme Foods',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    gstNumber: '27AAACA1234A1Z5',
    panNumber: 'AAACA1234A',
    email: 'hello@acme.in',
    phone: '+91 9876543210',
  };
}

describe('CompaniesService', () => {
  describe('create', () => {
    it('creates a company with the full field set, propagates membership, and audits', async () => {
      const prisma = createPrismaMock();
      const svc = service(prisma);

      const result = await svc.create('u-1', 'c-1', baseData());

      expect(result).toMatchObject({ id: 'co-1', status: 'active', name: 'Acme Foods Pvt Ltd' });
      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gstNumber: '27AAACA1234A1Z5', panNumber: 'AAACA1234A' }),
        }),
      );
      // Creator + group-wide users all get membership.
      expect(prisma.userCompany.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ userId: 'u-1' })]),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'create', entity: 'company', entityId: 'co-1' }) }),
      );
    });

    it('rejects duplicate company names (case-insensitive)', async () => {
      const prisma = createPrismaMock();
      prisma.company.findFirst.mockResolvedValueOnce({ id: 'existing' });
      const svc = service(prisma);

      await expect(svc.create('u-1', 'c-1', baseData())).rejects.toThrow(BadRequestException);
      expect(prisma.company.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate GSTIN', async () => {
      const prisma = createPrismaMock();
      prisma.company.findFirst
        .mockResolvedValueOnce(null) // name
        .mockResolvedValueOnce({ id: 'other' }); // gst
      const svc = service(prisma);

      await expect(svc.create('u-1', 'c-1', baseData())).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate PAN', async () => {
      const prisma = createPrismaMock();
      prisma.company.findFirst
        .mockResolvedValueOnce(null) // name
        .mockResolvedValueOnce(null) // gst
        .mockResolvedValueOnce({ id: 'other' }); // pan
      const svc = service(prisma);

      await expect(svc.create('u-1', 'c-1', baseData())).rejects.toThrow(BadRequestException);
    });

    it('requires a non-empty company name', async () => {
      const svc = service(createPrismaMock());
      await expect(svc.create('u-1', 'c-1', { name: '   ' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException for unknown companies', async () => {
      const prisma = createPrismaMock();
      prisma.company.findUnique.mockResolvedValueOnce(null);
      const svc = service(prisma);

      await expect(svc.update('u-1', 'c-1', 'nope', { status: 'inactive' })).rejects.toThrow(NotFoundException);
    });

    it('blocks non group-wide users from editing companies outside their scope', async () => {
      const prisma = createPrismaMock();
      prisma.user.findUnique.mockResolvedValueOnce({
        isSuperAdmin: false,
        role: { isSystem: false, permissions: [] },
      });
      prisma.company.findUnique.mockResolvedValueOnce({ id: 'co-other' });
      prisma.userCompany.findMany.mockResolvedValueOnce([{ companyId: 'c-1' }]);
      const svc = service(prisma);

      await expect(svc.update('u-1', 'c-1', 'co-other', { status: 'inactive' })).rejects.toThrow(ForbiddenException);
    });

    it('lets group-wide users toggle status and audits the change', async () => {
      const prisma = createPrismaMock();
      // group-wide: super admin
      prisma.user.findUnique.mockResolvedValueOnce({ isSuperAdmin: true, role: { isSystem: false, permissions: [] } });
      prisma.company.findUnique.mockResolvedValueOnce({ id: 'co-1', name: 'Acme', status: 'active', gstNumber: null, panNumber: null });
      prisma.company.update.mockResolvedValueOnce({ id: 'co-1', name: 'Acme', status: 'inactive', gstNumber: null, panNumber: null });
      const svc = service(prisma);

      const result = await svc.update('u-1', 'c-1', 'co-1', { status: 'inactive' });

      expect(result).toMatchObject({ id: 'co-1', status: 'inactive' });
      expect(prisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'inactive' }) }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'update', entity: 'company', entityId: 'co-1' }) }),
      );
    });

    it('rejects renaming a company to an existing name', async () => {
      const prisma = createPrismaMock();
      prisma.user.findUnique.mockResolvedValueOnce({ isSuperAdmin: true, role: { isSystem: false, permissions: [] } });
      prisma.company.findUnique.mockResolvedValueOnce({ id: 'co-1', name: 'Acme', status: 'active', gstNumber: null, panNumber: null });
      prisma.company.findFirst.mockResolvedValueOnce({ id: 'other' }); // name dup
      const svc = service(prisma);

      await expect(svc.update('u-1', 'c-1', 'co-1', { name: 'Other Co' })).rejects.toThrow(BadRequestException);
    });

    it('returns the unchanged company when nothing to update', async () => {
      const prisma = createPrismaMock();
      prisma.user.findUnique.mockResolvedValueOnce({ isSuperAdmin: true, role: { isSystem: false, permissions: [] } });
      const original = { id: 'co-1', name: 'Acme', status: 'active' };
      prisma.company.findUnique.mockResolvedValueOnce(original);
      const svc = service(prisma);

      const result = await svc.update('u-1', 'c-1', 'co-1', {});

      expect(result).toBe(original);
      expect(prisma.company.update).not.toHaveBeenCalled();
    });
  });

  describe('listAccessible', () => {
    it('returns every company for group-wide users', async () => {
      const prisma = createPrismaMock();
      const companies = [{ id: 'c-1' }, { id: 'c-2' }];
      prisma.company.findMany.mockResolvedValueOnce(companies);
      prisma.user.findUnique.mockResolvedValueOnce({ isSuperAdmin: true, role: { isSystem: false, permissions: [] } });
      const svc = service(prisma);

      const result = await svc.listAccessible('u-1', 'c-1');

      expect(result).toEqual(companies);
      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
      expect(prisma.userCompany.findMany).not.toHaveBeenCalled();
    });

    it('returns primary + memberships for employees', async () => {
      const prisma = createPrismaMock();
      prisma.user.findUnique.mockResolvedValueOnce({ isSuperAdmin: false, role: { isSystem: false, permissions: [] } });
      prisma.userCompany.findMany.mockResolvedValueOnce([{ companyId: 'c-2' }]);
      prisma.company.findMany.mockResolvedValueOnce([{ id: 'c-1' }, { id: 'c-2' }]);
      const svc = service(prisma);

      const result = await svc.listAccessible('u-1', 'c-1');

      expect(result).toEqual([{ id: 'c-1' }, { id: 'c-2' }]);
      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['c-1', 'c-2'] } } }),
      );
    });
  });
});