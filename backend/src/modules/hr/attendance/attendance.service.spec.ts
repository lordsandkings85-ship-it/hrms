import { AttendanceService } from './attendance.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

jest.mock('../../../utils/group-access.util', () => ({
  isGroupWideUser: jest.fn(async () => false),
}));

const mockGroupWide = (value: boolean) => (isGroupWideUser as jest.Mock).mockResolvedValue(value);

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

describe('AttendanceService.monthlyWorkdaySummaries', () => {
  const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };

  it('applies global holidays for group-wide viewers when the company has none', async () => {
    mockGroupWide(true);
    const prisma: any = {
      employee: {
        findMany: jest.fn(async () => [{
          id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1',
          workingDaysPerWeek: 6, companyId: 'c-1', department: { name: 'Eng' },
        }]),
      },
      attendancePolicy: {
        findMany: jest.fn(async () => [{ companyId: 'c-1', value: 'true' }]),
      },
      holiday: {
        findMany: jest.fn()
          .mockImplementationOnce(async () => [])
          .mockImplementation(async () => [
            { date: new Date(2026, 8, 4) },
            { date: new Date(2026, 8, 16) },
          ]),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.monthlyWorkdaySummaries('c-1', 2026, 9, 'admin-1');
    expect(rows).toHaveLength(1);
    // 25 Mon-Sat minus 2nd Saturday - 2 holidays = 23.
    expect(rows[0]).toMatchObject({
      totalWorkingDays: 23,
      present: 0,
      absent: 23,
    });
  });

  it('counts 6-day working days minus second Saturday (policy) and holidays; derives absent', async () => {
    const prisma: any = {
      employee: {
        findMany: jest.fn(async () => [{
          id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1',
          workingDaysPerWeek: 6, companyId: 'c-1', department: { name: 'Eng' },
        }]),
      },
      attendancePolicy: {
        findMany: jest.fn(async () => [{ companyId: 'c-1', value: 'true' }]),
      },
      holiday: {
        findMany: jest.fn(async () => [{ date: new Date(2026, 8, 16) }]),
      },
      attendanceLog: {
        findMany: jest.fn(async () =>
          [1, 2, 3, 7, 8, 9, 10, 11, 17, 18].map((d) => ({
            employeeId: 'e-1', date: new Date(2026, 8, d), status: 'present',
          })),
        ),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.monthlyWorkdaySummaries('c-1', 2026, 9);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      employeeCode: 'E1',
      totalWorkingDays: 24, // 25 (Mon-Sat minus second Sat) - 1 holiday
      present: 10,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      absent: 14,
    });
  });

  it('getMonthlySummary excludes Sundays for 6-day employees (no Sunday inflation)', async () => {
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const prisma: any = {
      employee: {
        findFirst: jest.fn(async () => ({ workingDaysPerWeek: 6, companyId: 'c-1' })),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
      },
      permissionRequest: {
        findMany: jest.fn(async () => []),
      },
      holiday: {
        findMany: jest.fn(async () => [{ id: 'h-1', date: new Date(2026, 8, 16), name: 'Test Holiday' }]),
      },
      attendancePolicy: {
        findFirst: jest.fn(async () => ({ value: 'true' })),
        findMany: jest.fn(async () => [{ companyId: 'c-1', value: 'true' }]),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const summary = await service.getMonthlySummary('c-1', 'e-1', 2026, 9);
    // Sept 2026: 25 Mon-Sat working days (26 minus 2nd Saturday) - 1 holiday = 24.
    expect(summary.totalDays).toBe(24);
    expect(summary.holidays).toBe(1);
    expect(summary.absent).toBe(24);
  });

  it('getMonthlySummary counts 5-day working days correctly (Mon-Fri minus holidays)', async () => {
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const prisma: any = {
      employee: {
        findFirst: jest.fn(async () => ({ workingDaysPerWeek: 5, companyId: 'c-2' })),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
      },
      permissionRequest: {
        findMany: jest.fn(async () => []),
      },
      holiday: {
        findMany: jest.fn(async () => [{ id: 'h-1', date: new Date(2026, 8, 16), name: 'Test Holiday' }]),
      },
      attendancePolicy: {
        findFirst: jest.fn(async () => ({ value: 'true' })),
        findMany: jest.fn(async () => [{ companyId: 'c-2', value: 'true' }]),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const summary = await service.getMonthlySummary('c-2', 'e-2', 2026, 9);
    // Sept 2026: 22 Mon-Fri - 1 holiday = 21.
    expect(summary.totalDays).toBe(21);
  });

  it('getMonthlySummary applies global holidays for group-wide viewers when the company has none', async () => {
    mockGroupWide(true);
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const prisma: any = {
      employee: {
        findFirst: jest.fn(async () => ({ workingDaysPerWeek: 6, companyId: 'c-1' })),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
      },
      permissionRequest: {
        findMany: jest.fn(async () => []),
      },
      holiday: {
        findMany: jest.fn()
          .mockImplementationOnce(async () => [])
          .mockImplementation(async () => [
            { id: 'h-1', date: new Date(2026, 8, 4), name: 'Krishna Jayanti' },
            { id: 'h-2', date: new Date(2026, 8, 16), name: 'Test Holiday' },
          ]),
      },
      attendancePolicy: {
        findFirst: jest.fn(async () => ({ value: 'true' })),
        findMany: jest.fn(async () => [{ companyId: 'c-1', value: 'true' }]),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const summary = await service.getMonthlySummary('c-1', 'e-1', 2026, 9, 'admin-1');
    // 25 Mon-Sat minus 2nd Saturday - 2 holidays = 23.
    expect(summary.totalDays).toBe(23);
    expect(summary.holidays).toBe(2);
  });

  it('counts 5-day working days for employees of companies without the second-Saturday policy', async () => {
    const prisma: any = {
      employee: {
        findMany: jest.fn(async () => [{
          id: 'e-2', firstName: 'Bob', lastName: 'Jones', employeeCode: 'E2',
          workingDaysPerWeek: 5, companyId: 'c-2', department: { name: 'Ops' },
        }]),
      },
      attendancePolicy: {
        findMany: jest.fn(async () => []),
      },
      holiday: {
        findMany: jest.fn()
          .mockImplementationOnce(async () => [])
          .mockImplementation(async () => [{ date: new Date(2026, 8, 16) }]),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.monthlyWorkdaySummaries('c-2', 2026, 9);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      totalWorkingDays: 21, // 22 (Mon-Fri) - 1 holiday
      present: 0,
      absent: 21,
    });
  });
});

describe('AttendanceService.getRegularizationReport', () => {
  const companyId = 'c-1';

  const buildService = ({ groupWide = false } = {}) => {
    mockGroupWide(groupWide);
    const prisma: any = {
      company: {
        findUnique: jest.fn(async () => ({ timezone: 'Asia/Kolkata' })),
      },
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
            employee: { id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1', department: { name: 'Eng' }, designation: { title: 'Dev' }, branch: { name: 'Main' }, company: { id: 'c-1', name: 'Acme', displayName: 'Acme Ltd' } },
            attendanceLog: { id: 'l-1', date: new Date('2026-09-03'), checkIn: new Date('2026-09-03T10:00:00Z'), checkOut: new Date('2026-09-03T18:00:00Z'), status: 'present', attendanceStatus: 'FULL_DAY_PRESENT', workedMinutes: 480, requiredMinutes: 480, lateMinutes: 0, lateStatus: 'on_time', correctionOf: null, regularizationStatus: 'approved', regularizationNote: 'Client meeting', overtimeMinutes: 0 },
          },
          {
            id: 'r-2',
            attendanceLogId: 'l-2',
            employeeId: 'e-2',
            requestedCheckIn: null,
            requestedCheckOut: null,
            reason: 'Pending note fix',
            status: 'pending',
            type: 'full_day',
            approverId: null,
            createdAt: new Date('2026-09-04T08:00:00Z'),
            employee: { id: 'e-2', firstName: 'Bob', lastName: 'Jones', employeeCode: 'E2', department: { name: 'Ops' }, designation: null, branch: null, company: { id: 'c-1', name: 'Acme', displayName: 'Acme Ltd' } },
            attendanceLog: { id: 'l-2', date: new Date('2026-09-04'), checkIn: null, checkOut: null, status: 'absent', attendanceStatus: 'OFF_DAY_OR_INCOMPLETE', workedMinutes: null, requiredMinutes: 480, lateMinutes: 0, lateStatus: 'on_time', correctionOf: null, regularizationStatus: 'pending', regularizationNote: 'Pending note fix', overtimeMinutes: 0 },
          },
        ]),
      },
      attendanceAudit: {
        findMany: jest.fn(async () => [
          { attendanceLogId: 'l-1', action: 'REGULARIZATION_APPROVED', createdAt: new Date('2026-09-04T08:30:00Z') },
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

  it('locks a non-group-wide user to their own company', async () => {
    const { service, prisma } = buildService();
    await service.getRegularizationReport(companyId, 'u-1', {});
    expect(prisma.regularizationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employee: { companyId } } }),
    );
  });

  it('allows a group-wide user to scope to another company', async () => {
    const { service, prisma } = buildService({ groupWide: true });
    await service.getRegularizationReport(companyId, 'u-1', { companyId: 'c-x' });
    expect(prisma.regularizationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employee: { companyId: 'c-x', isSystem: false } } }),
    );
  });

  it('applies status/type/employee and date-range filters', async () => {
    const { service, prisma } = buildService();
    await service.getRegularizationReport(companyId, 'u-1', {
      status: 'approved',
      type: 'regularization',
      employeeId: 'e-1',
      departmentId: 'd-1',
      from: '2026-09-01',
      to: '2026-09-30',
    });
    const called = (prisma.regularizationRequest.findMany as jest.Mock).mock.calls[0][0];
    expect(called.where).toMatchObject({
      employeeId: 'e-1',
      status: 'approved',
      type: 'regularization',
      employee: { companyId, departmentId: 'd-1' },
    });
    expect(called.where.attendanceLog.date).toMatchObject({
      gte: expect.any(Date),
      lt: expect.any(Date),
    });
    expect(called.where.attendanceLog.date.lt.getTime()).toBeGreaterThan(called.where.attendanceLog.date.gte.getTime());
    // Sept 1 00:00 and Oct 1 00:00 in Asia/Kolkata (+05:30) — the range must stay in
    // September; a 1-based month leaking into Date.UTC would slide it to Oct/Nov.
    expect(called.where.attendanceLog.date.gte.toISOString()).toBe('2026-08-31T18:30:00.000Z');
    expect(called.where.attendanceLog.date.lt.toISOString()).toBe('2026-09-30T18:30:00.000Z');
  });

  it('maps the date filter to the requested calendar month, not the next one', async () => {
    const { service, prisma } = buildService();
    await service.getRegularizationReport(companyId, 'u-1', { from: '2026-01-01', to: '2026-01-31' });
    const called = (prisma.regularizationRequest.findMany as jest.Mock).mock.calls[0][0];
    expect(called.where.attendanceLog.date.gte.toISOString()).toBe('2025-12-31T18:30:00.000Z');
    expect(called.where.attendanceLog.date.lt.toISOString()).toBe('2026-01-31T18:30:00.000Z');
  });

  it('supports a single-day range and a from-only range', async () => {
    const { service, prisma } = buildService();
    await service.getRegularizationReport(companyId, 'u-1', { from: '2026-09-15', to: '2026-09-15' });
    const single = (prisma.regularizationRequest.findMany as jest.Mock).mock.calls[0][0].where.attendanceLog.date;
    expect(single.gte.toISOString()).toBe('2026-09-14T18:30:00.000Z');
    expect(single.lt.toISOString()).toBe('2026-09-15T18:30:00.000Z');

    await service.getRegularizationReport(companyId, 'u-1', { from: '2026-12-01' });
    const fromOnly = (prisma.regularizationRequest.findMany as jest.Mock).mock.calls[1][0].where.attendanceLog.date;
    expect(fromOnly.gte.toISOString()).toBe('2026-11-30T18:30:00.000Z');
    expect(fromOnly.lt).toBeUndefined();
  });

  it('resolves approval info (audit timestamp + approver name) for approved rows and null for pending', async () => {
    const { service } = buildService();
    const rows = await service.getRegularizationReport(companyId, 'u-1', {});
    expect(rows[0].approval).toEqual({
      approverId: 'u-1',
      approverName: 'Priya Patel',
      resolvedAt: new Date('2026-09-04T08:30:00Z'),
    });
    expect(rows[1].approval).toEqual({ approverId: null, approverName: null, resolvedAt: null });
    expect(rows[0].requestedCheckIn).toEqual(new Date('2026-09-04T09:00:00Z'));
  });
});

describe('AttendanceService.getRegularizationSummary', () => {
  const companyId = 'c-1';

  const buildService = ({ groupWide = false } = {}) => {
    mockGroupWide(groupWide);
    const prisma: any = {
      company: {
        findUnique: jest.fn(async () => ({ timezone: 'Asia/Kolkata' })),
      },
      regularizationRequest: {
        groupBy: jest.fn(async ({ by }) => {
          if (by[0] === 'status') {
            return [
              { status: 'approved', _count: { _all: 2 } },
              { status: 'pending', _count: { _all: 1 } },
            ];
          }
          return [
            { employeeId: 'e-1', status: 'approved', _count: { _all: 2 } },
            { employeeId: 'e-2', status: 'pending', _count: { _all: 1 } },
          ];
        }),
      },
      employee: {
        findMany: jest.fn(async () => [
          { id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1', department: { name: 'Eng' }, company: { id: 'c-1', name: 'Acme', displayName: 'Acme Ltd' } },
          { id: 'e-2', firstName: 'Bob', lastName: 'Jones', employeeCode: 'E2', department: { name: 'Ops' }, company: { id: 'c-1', name: 'Acme', displayName: 'Acme Ltd' } },
        ]),
      },
    };
    const notifications = { notifyApprover: jest.fn(async () => {}), notifyEmployee: jest.fn(async () => {}) };
    const service = new AttendanceService(prisma as any, notifications as any);
    return { service, prisma };
  };

  it('aggregates totals by status and per-employee counts, sorted by total desc', async () => {
    const { service } = buildService();
    const result = await service.getRegularizationSummary(companyId, 'u-1', {});
    expect(result.totals).toEqual({ total: 3, pending: 1, approved: 2, rejected: 0, cancelled: 0 });
    expect(result.employees).toHaveLength(2);
    expect(result.employees[0]).toMatchObject({ employeeCode: 'E1', name: 'Alice Smith', total: 2, approved: 2, pending: 0, rejected: 0, cancelled: 0 });
    expect(result.employees[1]).toMatchObject({ employeeCode: 'E2', total: 1, pending: 1, approved: 0 });
  });

  it('aggregates in the database with the same company scope', async () => {
    const { service, prisma } = buildService();
    await service.getRegularizationSummary(companyId, 'u-1', {});
    const groupByCalls = (prisma.regularizationRequest.groupBy as jest.Mock).mock.calls;
    expect(groupByCalls).toHaveLength(2);
    for (const [args] of groupByCalls) {
      expect(args.where).toEqual({ employee: { companyId } });
    }
  });
});