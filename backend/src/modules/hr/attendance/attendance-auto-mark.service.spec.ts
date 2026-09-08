import { AttendanceAutoMarkService } from './attendance-auto-mark.service';
import { AttendanceService } from './attendance.service';

describe('AttendanceService.markAbsentForDate', () => {
  const companyId = 'c-1';

  type EmployeeFixture = {
    id: string;
    firstName?: string;
    lastName?: string;
    employeeCode?: string;
    workingDaysPerWeek?: number;
    department?: { name: string };
  };

  const buildService = (
    opts: {
      logsForDay?: { employeeId: string; checkIn: Date | null }[];
      existingForDay?: string[];
      employees?: EmployeeFixture[];
      leaves?: { employeeId: string; isHalfDay: boolean }[];
      holidays?: number;
      secondSaturdayOff?: boolean;
      assignments?: { employeeId: string; shift: { id: string; startTime: string; endTime: string } }[];
    } = {},
  ) => {
    const prisma: any = {
      attendanceLog: {
        findMany: jest.fn(async ({ where }: any) => {
          if (where?.employeeId?.in) {
            return (opts.existingForDay ?? []).map((employeeId) => ({ employeeId }));
          }
          return opts.logsForDay ?? [];
        }),
        create: jest.fn(async (args: any) => ({ id: `log-${args.data.employeeId}`, ...args.data })),
      },
      employee: {
        findMany: jest.fn(async () => {
          const employees = opts.employees ?? [];
          return employees.map((e) => ({
            firstName: 'A',
            lastName: 'Z',
            employeeCode: 'E1',
            workingDaysPerWeek: 5,
            department: { name: 'Eng' },
            ...e,
          }));
        }),
      },
      leaveRequest: { findMany: jest.fn(async () => opts.leaves ?? []) },
      holiday: { findMany: jest.fn(async () => (opts.holidays ?? 0 ? [{ id: 'h-1' }] : [])) },
      attendancePolicy: {
        findMany: jest.fn(async () =>
          opts.secondSaturdayOff ? [{ key: 'custom.secondSaturdayOff', value: 'true' }] : [],
        ),
      },
      shiftAssignment: { findMany: jest.fn(async () => opts.assignments ?? []) },
      attendanceAudit: { create: jest.fn(async (args: any) => ({ id: `audit-${args.data.employeeId}` })) },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => fn(prisma)),
    };
    const notifications = { notifyApprover: jest.fn(), notifyEmployee: jest.fn() };
    const service = new AttendanceService(prisma as any, notifications as any);
    return { service, prisma };
  };

  it('creates an absent row + audit for employees with no log', async () => {
    const { service, prisma } = buildService({
      employees: [{ id: 'e-1' }, { id: 'e-2' }],
      assignments: [
        { employeeId: 'e-2', shift: { id: 's-9', startTime: '09:00', endTime: '18:00' } },
      ],
    });

    const res = await service.markAbsentForDate(companyId, new Date(2026, 8, 7));

    expect(res.marked).toBe(2);
    expect(prisma.attendanceLog.create).toHaveBeenCalledTimes(2);
    const createdE1 = prisma.attendanceLog.create.mock.calls.find(([c]: any[]) => c.data.employeeId === 'e-1');
    const createdE2 = prisma.attendanceLog.create.mock.calls.find(([c]: any[]) => c.data.employeeId === 'e-2');
    expect(createdE1[0].data).toMatchObject({
      employeeId: 'e-1',
      status: 'absent',
      checkIn: null,
      checkOut: null,
      date: new Date(2026, 8, 7),
    });
    expect(createdE2[0].data).toMatchObject({ shiftId: 's-9', shiftStart: '09:00', shiftEnd: '18:00' });

    expect(prisma.attendanceAudit.create).toHaveBeenCalledTimes(2);
    expect(prisma.attendanceAudit.create.mock.calls[0][0].data).toMatchObject({
      action: 'AUTO_ABSENT',
      actorRole: 'SYSTEM',
      attendanceLogId: 'log-e-1',
    });
  });

  it('skips employees who already checked in', async () => {
    const { service, prisma } = buildService({
      employees: [{ id: 'e-1' }, { id: 'e-2' }],
      logsForDay: [{ employeeId: 'e-1', checkIn: new Date(2026, 8, 7, 9, 0) }],
    });

    const res = await service.markAbsentForDate(companyId, new Date(2026, 8, 7));

    expect(res.marked).toBe(1);
    expect(prisma.attendanceLog.create.mock.calls.map(([c]: any[]) => c.data.employeeId)).toEqual(['e-2']);
  });

  it('skips employees on full-day or half-day approved leave', async () => {
    const { service, prisma } = buildService({
      employees: [{ id: 'e-full' }, { id: 'e-half' }, { id: 'e-work' }],
      leaves: [
        { employeeId: 'e-full', isHalfDay: false },
        { employeeId: 'e-half', isHalfDay: true },
      ],
    });

    const res = await service.markAbsentForDate(companyId, new Date(2026, 8, 7));

    expect(res.marked).toBe(1);
    expect(prisma.attendanceLog.create.mock.calls.map(([c]: any[]) => c.data.employeeId)).toEqual(['e-work']);
  });

  it('skips everyone on a company holiday or second Saturday off', async () => {
    const { service: holidaySvc, prisma: holidayPrisma } = buildService({
      employees: [{ id: 'e-1' }],
      holidays: 1,
    });
    await expect(holidaySvc.markAbsentForDate(companyId, new Date(2026, 8, 7))).resolves.toMatchObject({ marked: 0 });
    expect(holidayPrisma.$transaction).not.toHaveBeenCalled();

    const { service: satSvc } = buildService({
      employees: [{ id: 'e-1', workingDaysPerWeek: 6 }],
      secondSaturdayOff: true,
    });
    // 12 Sep 2026 is a Saturday within the second-Saturday window (8-14)
    await expect(satSvc.markAbsentForDate(companyId, new Date(2026, 8, 12))).resolves.toMatchObject({ marked: 0 });
  });

  it('does not mark a non-working weekend day', async () => {
    const { service } = buildService({ employees: [{ id: 'e-1' }] });
    // 6 Sep 2026 is a Sunday — not a working day for a 5-day week
    await expect(service.markAbsentForDate(companyId, new Date(2026, 8, 6))).resolves.toMatchObject({ marked: 0 });
  });

  it('is idempotent — skips employees who already carry an absent row', async () => {
    const { service, prisma } = buildService({
      employees: [{ id: 'e-1' }, { id: 'e-2' }],
      existingForDay: ['e-1', 'e-2'],
    });

    const res = await service.markAbsentForDate(companyId, new Date(2026, 8, 7));

    expect(res.marked).toBe(0);
    expect(res.skipped).toBe(2);
    expect(prisma.attendanceLog.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AttendanceAutoMarkService', () => {
  it('runBackfill marks every day from->to for each active company', async () => {
    const prisma = {
      employee: { findMany: jest.fn(async () => [{ companyId: 'c-1' }, { companyId: 'c-2' }]) },
    };
    const attendance = {
      markAbsentForDate: jest.fn(async () => ({ marked: 1, skipped: 0 })),
      markMissingCheckouts: jest.fn(async () => ({ marked: 0 })),
    };
    const svc = new AttendanceAutoMarkService(prisma as any, attendance as any);

    await svc.runBackfill(new Date(2026, 8, 1), new Date(2026, 8, 3));

    expect(attendance.markAbsentForDate).toHaveBeenCalledTimes(6); // 3 days x 2 companies
    expect(attendance.markMissingCheckouts).toHaveBeenCalledTimes(2); // once per company
  });

  it('markToday marks today once per company', async () => {
    const prisma = {
      employee: { findMany: jest.fn(async () => [{ companyId: 'c-1' }, { companyId: 'c-2' }]) },
    };
    const attendance = {
      markAbsentForDate: jest.fn(async () => ({ marked: 0 })),
      markMissingCheckouts: jest.fn(async () => ({ marked: 0 })),
    };
    const svc = new AttendanceAutoMarkService(prisma as any, attendance as any);
    const today = new Date();

    await svc.markToday();

    expect(attendance.markAbsentForDate).toHaveBeenCalledTimes(2);
    expect(attendance.markAbsentForDate.mock.calls[0]).toEqual(['c-1', today]);
    expect(attendance.markMissingCheckouts).toHaveBeenCalledTimes(2); // once per company
    expect((attendance.markMissingCheckouts as jest.Mock).mock.calls[0][0]).toBe('c-1');
  });

  it('continues past a failing company instead of aborting', async () => {
    const prisma = {
      employee: { findMany: jest.fn(async () => [{ companyId: 'c-bad' }, { companyId: 'c-ok' }]) },
    };
    const attendance = {
      markAbsentForDate: jest.fn(async (cid: string) => {
        if (cid === 'c-bad') throw new Error('boom');
        return { marked: 1 };
      }),
      markMissingCheckouts: jest.fn(async () => ({ marked: 0 })),
    };
    const svc = new AttendanceAutoMarkService(prisma as any, attendance as any);

    await expect(svc.runBackfill(new Date(2026, 8, 1), new Date(2026, 8, 1))).resolves.toBeUndefined();
    expect(attendance.markAbsentForDate).toHaveBeenCalledTimes(2);
    // The failing company aborts before reaching the missing-checkout pass; only
    // the healthy company runs it.
    expect(attendance.markMissingCheckouts).toHaveBeenCalledTimes(1);
  });
});