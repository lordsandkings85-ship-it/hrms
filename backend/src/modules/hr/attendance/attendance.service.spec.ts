import { AttendanceService } from './attendance.service';

describe('AttendanceService.listRegularizations', () => {
  const companyId = 'c-1';

  const buildService = () => {
    const prisma = {
      regularizationRequest: {
        findMany: jest.fn(async () => [
          {
            id: 'r-1',
            attendanceLogId: 'l-1',
            employeeId: 'e-1',
            requestedCheckIn: new Date('2026-09-04T09:00:00Z'),
            requestedCheckOut: new Date('2026-09-04T18:00:00Z'),
            reason: 'Client meeting',
            status: 'approved',
            type: 'regularization',
            resolutionNote: 'OK',
            approverId: 'u-1',
            createdAt: new Date('2026-09-03T10:00:00Z'),
            employee: { id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1', department: { name: 'Eng' } },
            attendanceLog: { id: 'l-1', date: new Date('2026-09-03'), checkIn: null, checkOut: null, status: 'absent', attendanceStatus: 'OFF_DAY_OR_INCOMPLETE', isWithinGeofence: null },
          },
        ]),
      },
      user: {
        findMany: jest.fn(async () => [
          { id: 'u-1', email: 'hr@x.com', employee: { firstName: 'Priya', lastName: 'Patel' } },
        ]),
      },
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    return { service, prisma };
  };

  it('filters by status when one is provided', async () => {
    const { service, prisma } = buildService();
    await service.listRegularizations(companyId, 'approved');
    expect(prisma.regularizationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employee: { companyId }, status: 'approved' } }),
    );
  });

  it('does NOT filter by status for all/unknown values', async () => {
    const { service, prisma } = buildService();
    await service.listRegularizations(companyId, 'all');
    expect(prisma.regularizationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employee: { companyId } } }),
    );
  });

  it('resolves approver display name from the linked employee profile', async () => {
    const { service, prisma } = buildService();
    const rows = await service.listRegularizations(companyId, 'all');
    expect(rows[0].approverName).toBe('Priya Patel');
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u-1'] } },
      select: expect.objectContaining({ id: true }),
    });
  });

  it('does not query users when no request has an approver', async () => {
    const prisma = {
      regularizationRequest: {
        findMany: jest.fn(async () => [{
          id: 'r-2', approverId: null, employee: { id: 'e-1' }, attendanceLog: {},
        }]),
      },
      user: { findMany: jest.fn() },
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.listRegularizations(companyId, 'pending');
    expect(rows[0].approverName).toBeNull();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe('AttendanceService.markMissingCheckouts', () => {
  const build = () => {
    const prisma: any = {
      attendanceLog: {
        findMany: jest.fn(async () => [
          { id: 'l-1' },
          { id: 'l-2' },
        ]),
        update: jest.fn(async ({ data }) => ({ id: 'x', ...data })),
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => fn(prisma)),
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    return { service, prisma };
  };

  it('flags open sessions (check-in but no check-out) as INCOMPLETE', async () => {
    const { service, prisma } = build();
    const result = await service.markMissingCheckouts('c-1', new Date('2026-09-06'));
    expect(prisma.attendanceLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employee: { companyId: 'c-1' },
          checkIn: { not: null },
          checkOut: null,
        }),
      }),
    );
    expect(prisma.attendanceLog.update).toHaveBeenCalledTimes(2);
    expect(prisma.attendanceLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attendanceStatus: 'INCOMPLETE' } }),
    );
    expect(result).toEqual({ date: new Date(2026, 8, 6), marked: 2 });
  });

  it('is a no-op when there are no open sessions', async () => {
    const prisma = {
      attendanceLog: {
        findMany: jest.fn(async () => []),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => fn(prisma)),
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    const result = await service.markMissingCheckouts('c-1', new Date('2026-09-06'));
    expect(prisma.attendanceLog.update).not.toHaveBeenCalled();
    expect(result.marked).toBe(0);
  });
});

describe('AttendanceService.approveRegularization', () => {
  const build = () => {
    const originalCheckIn = new Date('2026-09-04T03:45:00Z');
    const correctedCheckOut = new Date('2026-09-04T17:30:00Z');
    const prisma: any = {
      user: { findUnique: jest.fn(async () => null) },
      regularizationRequest: {
        findUnique: jest.fn(async () => ({
          id: 'r-1',
          attendanceLogId: 'l-1',
          employeeId: 'e-1',
          type: 'regularization',
          reason: 'Missed check-out',
          requestedCheckIn: null,
          requestedCheckOut: correctedCheckOut,
          employee: { id: 'e-1', companyId: 'c-1' },
          attendanceLog: {
            id: 'l-1',
            date: new Date('2026-09-04'),
            checkIn: originalCheckIn,
            checkOut: null,
            status: 'present',
            attendanceStatus: null,
          },
        })),
        update: jest.fn(async (a: any) => a),
      },
      attendanceLog: { update: jest.fn(async (a: any) => ({ id: 'l-1', ...a.data })) },
      attendanceAudit: { create: jest.fn(async (a: any) => a) },
      shiftAssignment: { findFirst: jest.fn(async () => null) },
      attendancePolicy: { findMany: jest.fn(async () => []) },
      $transaction: jest.fn(async (tx: any[]) => tx),
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    return { service, prisma, originalCheckIn, correctedCheckOut };
  };

  it('preserves the original check-in when only a check-out was requested', async () => {
    const { service, prisma, originalCheckIn, correctedCheckOut } = build();
    await service.approveRegularization('r-1', 'c-1', 'approver');
    const logUpdate = prisma.attendanceLog.update.mock.calls[0][0];
    expect(logUpdate.data.checkIn).toEqual(originalCheckIn);
    expect(logUpdate.data.checkOut).toEqual(correctedCheckOut);
  });
});