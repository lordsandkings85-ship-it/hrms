import { PermissionRequestService } from './permission-request.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { isGroupWideUser } from '../../../utils/group-access.util';

jest.mock('../../../utils/group-access.util', () => ({
  isGroupWideUser: jest.fn(async () => false),
}));

const mockGroupWide = (value: boolean) => (isGroupWideUser as jest.Mock).mockResolvedValue(value);

describe('PermissionRequestService', () => {
  let service: PermissionRequestService;
  let prisma: any;
  let notifications: any;

  const baseEmployee = () => ({
    id: 'emp-1',
    companyId: 'company-1',
    firstName: 'Sathish',
    lastName: 'Kumar',
    company: { timezone: 'UTC' },
  });

  const baseRequest = (overrides: any = {}) => ({
    id: 'req-1',
    companyId: 'company-1',
    employeeId: 'emp-1',
    date: new Date('2026-09-25T00:00:00.000Z'),
    fromTime: '10:30',
    toTime: '11:00',
    minutes: 30,
    reason: 'Doctor appointment today',
    status: 'pending',
    rejectReason: null,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-09-24T10:00:00.000Z'),
    employee: baseEmployee(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      employee: {
        findFirst: jest.fn(async () => baseEmployee()),
      },
      user: {
        findUnique: jest.fn(async () => ({ employeeId: 'emp-other' })),
      },
      shiftAssignment: {
        findFirst: jest.fn(async () => null),
      },
      company: {
        findUnique: jest.fn(async () => ({ timezone: 'UTC' })),
      },
      permissionRequest: {
        create: jest.fn(async () => baseRequest()),
        findFirst: jest.fn(async () => null),
        aggregate: jest.fn(async () => ({ _sum: { minutes: 0 } })),
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => baseRequest()),
        update: jest.fn(async (args: any) => ({ ...baseRequest(), ...(args.data as any) })),
      },
      auditLog: {
        create: jest.fn(async () => ({ id: 'audit-1' })),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
        update: jest.fn(async () => ({})),
      },
      attendanceAudit: {
        create: jest.fn(async () => ({ id: 'att-audit-1' })),
      },
    };

    notifications = {
      notifyApprover: jest.fn(async () => []),
      notifyEmployee: jest.fn(async () => ({})),
    };

    service = new PermissionRequestService(prisma, notifications);
  });

  const baseInput = () => ({
    userId: 'user-1',
    companyId: 'company-1',
    employeeId: 'emp-1',
    date: '2026-09-25',
    fromTime: '10:30',
    toTime: '11:30',
    reason: 'Doctor appointment today',
  });

  describe('window validation', () => {
    it('rejects a request shorter than 30 minutes', async () => {
      await expect(service.create({ ...baseInput(), fromTime: '10:30', toTime: '10:45' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a request longer than 3 hours', async () => {
      await expect(service.create({ ...baseInput(), fromTime: '10:30', toTime: '14:00' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a window not on a 15-minute step', async () => {
      await expect(service.create({ ...baseInput(), fromTime: '10:22', toTime: '11:00' })).rejects.toThrow(BadRequestException);
    });

    it('rejects to-time before from-time', async () => {
      await expect(service.create({ ...baseInput(), fromTime: '11:30', toTime: '11:00' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a window outside the assigned shift', async () => {
      (prisma.shiftAssignment.findFirst as jest.Mock).mockResolvedValue({
        shift: { startTime: '10:30', endTime: '17:00' },
      });
      await expect(service.create({ ...baseInput(), fromTime: '17:30', toTime: '18:30' })).rejects.toThrow(BadRequestException);
    });

    it('accepts the exact minimum window (30 min)', async () => {
      const req = await service.create({ ...baseInput(), fromTime: '10:30', toTime: '11:00' });
      expect(req.minutes).toBe(30);
      expect(prisma.permissionRequest.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'PERMISSION_CREATED' }) }),
      );
      expect(notifications.notifyApprover).toHaveBeenCalled();
    });
  });

  describe('overlap & monthly quota', () => {
    it('rejects an overlapping request for the same day', async () => {
      (prisma.permissionRequest.findFirst as jest.Mock).mockResolvedValue({ id: 'other' });
      await expect(service.create(baseInput())).rejects.toThrow(BadRequestException);
    });

    it('rejects when the monthly 3h quota would be exceeded', async () => {
      (prisma.permissionRequest.aggregate as jest.Mock).mockResolvedValue({ _sum: { minutes: 150 } });
      await expect(service.create({ ...baseInput(), fromTime: '10:30', toTime: '13:00' })).rejects.toThrow(BadRequestException);
    });

    it('allows a request that lands exactly on the quota', async () => {
      (prisma.permissionRequest.aggregate as jest.Mock).mockResolvedValue({ _sum: { minutes: 150 } });
      const req = await service.create({ ...baseInput(), fromTime: '10:30', toTime: '11:00' });
      expect(req.minutes).toBe(30);
    });
  });

  describe('company scoping', () => {
    it('rejects creation when the employee is outside the caller company (non group-wide)', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(baseInput())).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approve / reject / cancel', () => {
    it('blocks an employee approving their own request', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ employeeId: 'emp-1' });
      await expect(service.approve('req-1', 'company-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('blocks approving a request that is not pending', async () => {
      (prisma.permissionRequest.findUnique as jest.Mock).mockResolvedValue(baseRequest({ status: 'approved' }));
      await expect(service.approve('req-1', 'company-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('approves a pending request, marks attendance, audits and notifies', async () => {
      (prisma.attendanceLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'log-1',
          date: new Date('2026-09-25T00:00:00.000Z'),
          checkIn: new Date('2026-09-25T10:45:00.000Z'),
          checkOut: null,
          lateStatus: 'late',
          status: 'late',
          attendanceStatus: null,
        },
      ]);
      mockGroupWide(false);
      const updated = await service.approve('req-1', 'company-1', 'user-2');
      expect(updated.status).toBe('approved');
      expect(prisma.attendanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lateStatus: 'on_time', status: 'present', lateMinutes: 0 }),
        }),
      );
      expect(prisma.attendanceAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'PERMISSION_EXCUSED' }) }),
      );
      expect(notifications.notifyEmployee).toHaveBeenCalled();
    });

    it('rejects without a reason', async () => {
      await expect(service.reject('req-1', 'company-1', 'user-2', '')).rejects.toThrow(BadRequestException);
    });

    it('rejects a pending request with a reason', async () => {
      const updated = await service.reject('req-1', 'company-1', 'user-2', 'Not approved');
      expect(updated.status).toBe('rejected');
      expect(updated.rejectReason).toBe('Not approved');
      expect(notifications.notifyEmployee).toHaveBeenCalled();
    });

    it('blocks non-owners from cancelling', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ employeeId: 'someone-else' });
      await expect(service.cancel('req-1', 'company-1', 'user-3')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('usage report', () => {
    it('restricts the global report to group-wide users', async () => {
      mockGroupWide(false);
      await expect(service.usageReport('user-1')).rejects.toThrow(ForbiddenException);
    });

    it('aggregates per company for super admins', async () => {
      mockGroupWide(true);
      (prisma.permissionRequest.findMany as jest.Mock).mockResolvedValue([
        baseRequest({ companyId: 'c1', date: new Date('2026-09-25T00:00:00.000Z') }),
        baseRequest({ companyId: 'c2', date: new Date('2026-09-26T00:00:00.000Z') }),
      ]);
      // findMany is also used by list(); make usage report the only call in this test
      const report = await service.usageReport('user-1', '2026-09');
      expect(report.companies.length).toBeGreaterThan(0);
      expect(report.requests.length).toBe(2);
    });
  });

  describe('not found', () => {
    it('throws NotFound for a missing request', async () => {
      (prisma.permissionRequest.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.approve('nope', 'company-1', 'user-2')).rejects.toThrow(NotFoundException);
    });
  });
});