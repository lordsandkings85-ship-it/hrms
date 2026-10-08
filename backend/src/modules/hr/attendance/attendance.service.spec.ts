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

  it('archives the pre-correction punch in the audit before the log is overwritten', async () => {
    const { service, prisma, originalCheckIn } = build();
    await service.approveRegularization('r-1', 'c-1', 'approver');
    const audit = prisma.attendanceAudit.create.mock.calls[0][0].data;
    expect(audit.action).toBe('REGULARIZATION_APPROVED');
    expect(audit.fromValue).toBe(originalCheckIn.toISOString());
    expect(audit.toValue).toBeNull();
    expect(audit.notes).toContain('Original punch before correction');
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
        findMany: jest.fn(async () => [{ companyId: 'c-1', key: 'custom.secondSaturdayOff', value: 'true' }]),
        findFirst: jest.fn(async () => null),
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
      leaveRequest: { findMany: jest.fn(async () => []) },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.monthlyWorkdaySummaries('c-1', 2026, 9, 'admin-1');
    expect(rows).toHaveLength(1);
    // 26 Mon-Sat minus the 2nd Saturday = 25 working days; the 2 holidays stay inside
    // that count as paid holidays and are not absent.
    expect(rows[0]).toMatchObject({
      totalWorkingDays: 25,
      paidHolidays: 2,
      present: 0,
      absent: 23,
    });
  });

  it('counts 6-day working days minus the 2nd Saturday policy; holidays are paid, not absent', async () => {
    const prisma: any = {
      employee: {
        findMany: jest.fn(async () => [{
          id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1',
          workingDaysPerWeek: 6, companyId: 'c-1', department: { name: 'Eng' },
        }]),
      },
      attendancePolicy: {
        findMany: jest.fn(async () => [{ companyId: 'c-1', key: 'custom.secondSaturdayOff', value: 'true' }]),
        findFirst: jest.fn(async () => null),
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
      leaveRequest: { findMany: jest.fn(async () => []) },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.monthlyWorkdaySummaries('c-1', 2026, 9);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      employeeCode: 'E1',
      totalWorkingDays: 25, // 26 (Mon-Sat minus the 2nd Saturday); the holiday stays inside
      present: 10,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      paidHolidays: 1,
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
    // Sept 2026: 26 Mon-Sat minus the 2nd Saturday = 25 working days. The holiday on
    // Sep 16 is a paid working day (visible separately, still paid, not absent).
    expect(summary.totalDays).toBe(25);
    expect(summary.holidays).toBe(1);
    expect(summary.paidHolidays).toBe(1);
    expect(summary.absent).toBe(24);
  });

  it('getMonthlySummary counts 5-day working days correctly (Mon-Fri, holidays included)', async () => {
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
    // Sept 2026: 22 Mon-Fri, and the Sep 16 holiday stays inside as a paid working day.
    expect(summary.totalDays).toBe(22);
    expect(summary.paidHolidays).toBe(1);
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
    // 26 Mon-Sat minus the 2nd Saturday = 25 working days; both holidays stay inside
    // as paid holidays, so no absent accrues on them.
    expect(summary.totalDays).toBe(25);
    expect(summary.holidays).toBe(2);
    expect(summary.paidHolidays).toBe(2);
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
        findFirst: jest.fn(async () => null),
      },
      holiday: {
        findMany: jest.fn()
          .mockImplementationOnce(async () => [])
          .mockImplementation(async () => [{ date: new Date(2026, 8, 16) }]),
      },
      attendanceLog: {
        findMany: jest.fn(async () => []),
      },
      leaveRequest: { findMany: jest.fn(async () => []) },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const rows = await service.monthlyWorkdaySummaries('c-2', 2026, 9);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      totalWorkingDays: 22, // 22 (Mon-Fri); the holiday stays inside as a paid day
      present: 0,
      paidHolidays: 1,
      absent: 21,
    });
  });

  it('getMonthlySummary annotates penalized lates and approved-permission days on the logs', async () => {
    const lateDates = [4, 7, 8, 9, 11, 14, 15].map((d) => new Date(2026, 8, d)); // 7 lates → 1 beyond allowance
    const prisma: any = {
      employee: {
        findFirst: jest.fn(async () => ({ workingDaysPerWeek: 5, companyId: 'c-1' })),
      },
      attendanceLog: {
        findMany: jest.fn(async () => [
          ...lateDates.map((date) => ({
            id: `late-${date.getDate()}`,
            employeeId: 'e-1',
            date,
            status: 'late',
            attendanceStatus: null,
            overtimeMinutes: 0,
          })),
          {
            id: 'perm-16',
            employeeId: 'e-1',
            date: new Date(2026, 8, 16),
            status: 'present',
            attendanceStatus: 'FULL_DAY_PRESENT',
            overtimeMinutes: 0,
          },
        ]),
      },
      permissionRequest: {
        findMany: jest.fn(async () => [
          { id: 'p-1', date: new Date('2026-09-16T00:00:00.000Z'), fromTime: '10:30', toTime: '11:30', minutes: 60 },
        ]),
      },
      holiday: {
        findMany: jest.fn(async () => []),
      },
      attendancePolicy: {
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
    };
    const service = new AttendanceService(prisma as any, notifications as any);
    const summary = await service.getMonthlySummary('c-1', 'e-1', 2026, 9);
    // 7 lates with a default allowance of 6 → exactly the chronological 7th is half-LOP.
    expect(summary.late).toBe(7);
    expect(summary.lateLop).toBe(1);
    expect(summary.maxLateAllowance).toBe(6);
    const lateLog: any = summary.logs.find((l: any) => l.id === 'late-15');
    expect(lateLog?.lateLop).toBe(true);
    const freeLog: any = summary.logs.find((l: any) => l.id === 'late-14');
    expect(freeLog?.lateLop).toBeUndefined();
    // The approved permission on Sep 16 surfaces on the log for "Present / Permission" labels.
    const permLog: any = summary.logs.find((l: any) => l.id === 'perm-16');
    expect(permLog?.permission).toMatchObject({ fromTime: '10:30', toTime: '11:30', minutes: 60 });
  });

  // Sept 2026: Sundays 6/13/20/27, Saturdays 5/12/19/26 (12th is the 2nd Saturday).
  describe('day classification', () => {
    const buildSummaries = async (opts: {
      workingDaysPerWeek?: number;
      policies?: any[];
      holidays?: Date[];
      logs?: any[];
      halfDayLeaves?: any[];
    }) => {
      const prisma: any = {
        employee: {
          findMany: jest.fn(async () => [{
            id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1',
            workingDaysPerWeek: opts.workingDaysPerWeek ?? 5,
            companyId: 'c-1', department: { name: 'Eng' },
          }]),
        },
        attendancePolicy: {
          findMany: jest.fn(async () => opts.policies ?? []),
          findFirst: jest.fn(async () => null),
        },
        holiday: {
          findMany: jest.fn()
            .mockImplementationOnce(async () => [])
            .mockImplementation(async () => (opts.holidays ?? []).map((date) => ({ date }))),
        },
        attendanceLog: { findMany: jest.fn(async () => opts.logs ?? []) },
        leaveRequest: { findMany: jest.fn(async () => opts.halfDayLeaves ?? []) },
      };
      const service = new AttendanceService(prisma as any, notifications as any);
      const rows = await service.monthlyWorkdaySummaries('c-1', 2026, 9);
      return rows[0];
    };

    const punch = (day: number, status: string, extra: any = {}) => ({
      employeeId: 'e-1', date: new Date(2026, 8, day), status,
      checkIn: null, checkOut: null, attendanceStatus: null, ...extra,
    });

    it('counts a half-day leave as 0.5 instead of a whole leave day', async () => {
      const row = await buildSummaries({
        logs: [punch(15, 'on_leave')],
        halfDayLeaves: [{
          employeeId: 'e-1',
          startDate: new Date(2026, 8, 15),
          endDate: new Date(2026, 8, 15),
        }],
      });
      // leave.service writes a FULL-day on_leave log for a 0.5-day leave; the report
      // must not credit a whole day.
      expect(row.halfDay).toBe(0.5);
      expect(row.onLeave).toBe(0);
      expect(row.totalWorkingDays).toBe(22);
      expect(row.absent).toBe(21.5);
      expect(row.reconciles).toBe(true);
    });

    it('counts a half-day leave even when no attendance log exists for it', async () => {
      const row = await buildSummaries({
        halfDayLeaves: [{
          employeeId: 'e-1',
          startDate: new Date(2026, 8, 15),
          endDate: new Date(2026, 8, 15),
        }],
      });
      expect(row.halfDay).toBe(0.5);
      expect(row.absent).toBe(21.5);
    });

    it('ignores an on_leave log on a Saturday for a 5-day employee', async () => {
      const row = await buildSummaries({
        logs: [punch(5, 'on_leave'), punch(4, 'on_leave')],
      });
      // Sept 5 is a Saturday — not counted for a 5-day week. Sept 4 (Fri) is.
      expect(row.onLeave).toBe(1);
      expect(row.totalWorkingDays).toBe(22);
      expect(row.absent).toBe(21);
      expect(row.reconciles).toBe(true);
    });

    it('derives a half day from an incomplete shift once the employee checks out', async () => {
      const row = await buildSummaries({
        logs: [punch(2, 'present', {
          checkIn: new Date(2026, 8, 2, 9),
          checkOut: new Date(2026, 8, 2, 13),
          attendanceStatus: 'INCOMPLETE',
        })],
      });
      expect(row.halfDay).toBe(0.5);
      expect(row.present).toBe(0);
    });

    it('keeps a present day when the incomplete shift has no check-out yet', async () => {
      const row = await buildSummaries({
        logs: [punch(2, 'present', {
          checkIn: new Date(2026, 8, 2, 9),
          checkOut: null,
          attendanceStatus: 'INCOMPLETE',
        })],
      });
      expect(row.present).toBe(1);
      expect(row.halfDay).toBe(0);
    });

    it('counts Sundays as working days for a 7-day week', async () => {
      const row = await buildSummaries({
        workingDaysPerWeek: 7,
        logs: [punch(6, 'present'), punch(13, 'present')],
      });
      // Every day of Sept 2026 is a working day for a 7-day week.
      expect(row.totalWorkingDays).toBe(30);
      expect(row.present).toBe(2);
      expect(row.absent).toBe(28);
    });

    it('never lets the categories exceed the total working days', async () => {
      const row = await buildSummaries({
        workingDaysPerWeek: 6,
        policies: [{ companyId: 'c-1', key: 'custom.secondSaturdayOff', value: 'true' }],
        logs: [
          punch(5, 'on_leave'),   // Saturday — counts for a 6-day week
          punch(6, 'on_leave'),   // Sunday — never counts
          punch(7, 'present'),
        ],
        halfDayLeaves: [{
          employeeId: 'e-1',
          startDate: new Date(2026, 8, 8),
          endDate: new Date(2026, 8, 8),
        }],
      });
      // Mon-Sat (26) minus the 2nd Saturday (12th) = 25 working days.
      expect(row.totalWorkingDays).toBe(25);
      expect(row.onLeave).toBe(1);
      expect(row.present).toBe(1);
      expect(row.halfDay).toBe(0.5);
      expect(row.reconciles).toBe(true);
      expect(row.present + row.late + row.halfDay + row.onLeave + row.absent).toBe(row.totalWorkingDays);
    });

    it('treats a working-day holiday as a paid day (not absent) and ignores a weekly-off holiday', async () => {
      const row = await buildSummaries({
        holidays: [new Date(2026, 8, 16), new Date(2026, 8, 6)], // Sep 16 (Wed, working), Sep 6 (Sunday, off)
        logs: [],
      });
      expect(row.totalWorkingDays).toBe(22); // holidays stay inside the working-day count
      expect(row.paidHolidays).toBe(1);      // the Sunday holiday is not a paid working day
      expect(row.absent).toBe(21);           // 22 working days - 1 paid holiday
      expect(row.reconciles).toBe(true);
    });

    it('counts a worked holiday once — the punch absorbs the paid holiday', async () => {
      const row = await buildSummaries({
        holidays: [new Date(2026, 8, 16)],
        logs: [punch(16, 'present')],
      });
      expect(row.totalWorkingDays).toBe(22);
      expect(row.present).toBe(1);
      expect(row.paidHolidays).toBe(1);
      expect(row.absent).toBe(21); // the worked holiday counts once, not twice
      expect(row.reconciles).toBe(true);
    });
  });

  describe('monthly late allowance', () => {
    const buildSummaries = async (opts: {
      workingDaysPerWeek?: number;
      policies?: any[];
      logs?: any[];
    }) => {
      const prisma: any = {
        employee: {
          findMany: jest.fn(async () => [{
            id: 'e-1', firstName: 'Alice', lastName: 'Smith', employeeCode: 'E1',
            workingDaysPerWeek: opts.workingDaysPerWeek ?? 5,
            companyId: 'c-1', department: { name: 'Eng' },
          }]),
        },
        attendancePolicy: {
          findMany: jest.fn(async () => opts.policies ?? []),
          findFirst: jest.fn(async () => null),
        },
        holiday: {
          findMany: jest.fn()
            .mockImplementationOnce(async () => [])
            .mockImplementation(async () => []),
        },
        attendanceLog: { findMany: jest.fn(async () => opts.logs ?? []) },
        leaveRequest: { findMany: jest.fn(async () => []) },
      };
      const service = new AttendanceService(prisma as any, notifications as any);
      const rows = await service.monthlyWorkdaySummaries('c-1', 2026, 9);
      return rows[0];
    };

    const punch = (day: number, status: string) => ({
      employeeId: 'e-1', date: new Date(2026, 8, day), status,
      checkIn: null, checkOut: null, attendanceStatus: null,
    });

    it('flags lates beyond the default allowance of 6 as half-LOP (8 lates → lateLop 2)', async () => {
      // All 8 days are Mon-Fri working days in Sept 2026.
      const row = await buildSummaries({
        logs: [4, 7, 8, 9, 11, 14, 15, 16].map((d) => punch(d, 'late')),
      });
      expect(row.late).toBe(8);
      expect(row.lateLop).toBe(2); // first 6 chronologically are free, the last 2 are penalized
      expect(row.maxLateAllowance).toBe(6);
      expect(row.reconciles).toBe(true);
    });

    it('uses the configured company maxLatesPerMonth policy (allowance 3 → lateLop 5)', async () => {
      const row = await buildSummaries({
        policies: [{ companyId: 'c-1', key: 'custom.maxLatesPerMonth', value: '3' }],
        logs: [4, 7, 8, 9, 11, 14, 15, 16].map((d) => punch(d, 'late')),
      });
      expect(row.late).toBe(8);
      expect(row.lateLop).toBe(5);
      expect(row.maxLateAllowance).toBe(3);
      expect(row.reconciles).toBe(true);
    });

    it('keeps lates free up to the allowance (exactly 6 lates → lateLop 0)', async () => {
      const row = await buildSummaries({
        logs: [4, 7, 8, 9, 11, 14].map((d) => punch(d, 'late')),
      });
      expect(row.lateLop).toBe(0);
      expect(row.maxLateAllowance).toBe(6);
      expect(row.reconciles).toBe(true);
    });
  });
});

describe('AttendanceService.getRegularizationReport', () => {
  const companyId = 'c-1';

  const buildService = ({ groupWide = false, audits, requests }: { groupWide?: boolean; audits?: any[]; requests?: any[] } = {}) => {
    mockGroupWide(groupWide);
    const prisma: any = {
      company: {
        findUnique: jest.fn(async () => ({ timezone: 'Asia/Kolkata' })),
      },
      regularizationRequest: {
        findMany: jest.fn(async () => requests ?? [
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
        findMany: jest.fn(async () => audits ?? [
          {
            attendanceLogId: 'l-1',
            action: 'REGULARIZATION_APPROVED',
            createdAt: new Date('2026-09-04T08:30:00Z'),
            fromValue: '2026-09-03T11:20:00.000Z',
            toValue: '2026-09-03T20:15:00.000Z',
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

  it('accepts every documented status, including cancelled', async () => {
    const { service, prisma } = buildService();
    for (const status of ['pending', 'approved', 'rejected', 'cancelled']) {
      await service.getRegularizationReport(companyId, 'u-1', { status });
    }
    const wheres = (prisma.regularizationRequest.findMany as jest.Mock).mock.calls.map((c) => c[0].where);
    expect(wheres).toEqual([
      { employee: { companyId }, status: 'pending' },
      { employee: { companyId }, status: 'approved' },
      { employee: { companyId }, status: 'rejected' },
      { employee: { companyId }, status: 'cancelled' },
    ]);
  });

  it('ignores an unknown status instead of filtering by it', async () => {
    const { service, prisma } = buildService();
    await service.getRegularizationReport(companyId, 'u-1', { status: 'bogus' });
    const called = (prisma.regularizationRequest.findMany as jest.Mock).mock.calls[0][0];
    expect(called.where.status).toBeUndefined();
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

  it('returns the pre-correction punch for an approved time change', async () => {
    const { service } = buildService();
    const rows = await service.getRegularizationReport(companyId, 'u-1', {});
    expect(rows[0].originalPunch).toEqual({
      checkIn: new Date('2026-09-03T11:20:00.000Z'),
      checkOut: new Date('2026-09-03T20:15:00.000Z'),
      source: 'pre_correction',
    });
  });

  it('flags not_retained when an approved time change has no archived original', async () => {
    const { service } = buildService({
      audits: [{ attendanceLogId: 'l-1', action: 'REGULARIZATION_APPROVED', createdAt: new Date('2026-09-04T08:30:00Z'), fromValue: null, toValue: null }],
    });
    const rows = await service.getRegularizationReport(companyId, 'u-1', {});
    expect(rows[0].originalPunch).toEqual({ checkIn: null, checkOut: null, source: 'not_retained' });
  });

  it('treats the stored punch as the original for a pending request', async () => {
    const { service } = buildService({
      audits: [],
      requests: [
        {
          id: 'r-9', attendanceLogId: 'l-9', employeeId: 'e-9',
          requestedCheckIn: new Date('2026-09-04T09:00:00Z'), requestedCheckOut: new Date('2026-09-04T18:00:00Z'),
          reason: 'No electricity', status: 'pending', type: 'regularization', resolutionNote: null, approverId: null,
          createdAt: new Date('2026-09-04T07:00:00Z'),
          employee: { id: 'e-9', firstName: 'Cara', lastName: 'D', employeeCode: 'E9', department: { name: 'IT' }, designation: null, branch: null, company: { id: 'c-1', name: 'Acme', displayName: 'Acme' } },
          attendanceLog: { id: 'l-9', date: new Date('2026-09-04'), checkIn: new Date('2026-09-04T10:30:00Z'), checkOut: new Date('2026-09-04T19:10:00Z'), status: 'late', attendanceStatus: 'FULL_DAY_PRESENT', workedMinutes: 520, requiredMinutes: 480, lateMinutes: 30, lateStatus: 'late', correctionOf: null, regularizationStatus: 'pending', regularizationNote: null, overtimeMinutes: 40 },
        },
      ],
    });
    const rows = await service.getRegularizationReport(companyId, 'u-1', {});
    expect(rows[0].originalPunch).toEqual({
      checkIn: new Date('2026-09-04T10:30:00Z'),
      checkOut: new Date('2026-09-04T19:10:00Z'),
      source: 'current_punch',
    });
  });

  it('uses the preserved punches as the original for an approved full-day request', async () => {
    const { service } = buildService({
      audits: [],
      requests: [
        {
          id: 'r-8', attendanceLogId: 'l-8', employeeId: 'e-8',
          requestedCheckIn: null, requestedCheckOut: null,
          reason: 'Client visit', status: 'approved', type: 'full_day', resolutionNote: 'ok', approverId: 'u-1',
          createdAt: new Date('2026-09-04T07:00:00Z'),
          employee: { id: 'e-8', firstName: 'Dan', lastName: 'E', employeeCode: 'E8', department: null, designation: null, branch: null, company: { id: 'c-1', name: 'Acme', displayName: 'Acme' } },
          attendanceLog: { id: 'l-8', date: new Date('2026-09-04'), checkIn: new Date('2026-09-04T06:30:50Z'), checkOut: new Date('2026-09-04T06:30:54Z'), status: 'present', attendanceStatus: 'FULL_DAY_PRESENT', workedMinutes: 0, requiredMinutes: 480, lateMinutes: 0, lateStatus: 'on_time', correctionOf: 'r-8', regularizationStatus: 'approved', regularizationNote: 'Client visit', overtimeMinutes: 0 },
        },
      ],
    });
    const rows = await service.getRegularizationReport(companyId, 'u-1', {});
    expect(rows[0].originalPunch).toEqual({
      checkIn: new Date('2026-09-04T06:30:50Z'),
      checkOut: new Date('2026-09-04T06:30:54Z'),
      source: 'preserved_full_day',
    });
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