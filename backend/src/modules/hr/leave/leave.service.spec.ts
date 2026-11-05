import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaveService } from './leave.service';

jest.mock('../../../utils/group-access.util', () => ({
  isGroupWideUser: jest.fn(async () => false),
}));

function buildService() {
  const prisma: any = {
    employee: {
      findFirst: jest.fn(async () => ({ id: 'e-1', companyId: 'c-1' })),
    },
    leaveType: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) },
  };
  const notifications: any = {
    notifyApprover: jest.fn(async () => {}),
    notifyEmployee: jest.fn(async () => {}),
  };
  return new LeaveService(prisma, notifications);
}

describe('LeaveService.apply — date validation', () => {
  it('rejects a half-day request that spans more than one date', async () => {
    const service = buildService();
    await expect(
      service.apply('c-1', 'e-1', 'lt-1', '2026-09-01', '2026-09-03', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an end date before the start date', async () => {
    const service = buildService();
    await expect(
      service.apply('c-1', 'e-1', 'lt-1', '2026-09-05', '2026-09-01', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid date string', async () => {
    const service = buildService();
    await expect(
      service.apply('c-1', 'e-1', 'lt-1', 'not-a-date', '2026-09-01', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still rejects an unknown employee', async () => {
    const service = buildService();
    (service as any).prisma.employee.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.apply('c-1', 'missing', 'lt-1', '2026-09-01', '2026-09-01', false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
