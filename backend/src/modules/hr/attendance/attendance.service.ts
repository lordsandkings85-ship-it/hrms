import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/** Haversine formula — returns distance in metres between two GPS points */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUTC - date.getTime();
}

function zonedDateTime(timeZone: string, y: number, m: number, d: number, h: number, min: number, s = 0): Date {
  const guess = new Date(Date.UTC(y, m, d, h, min, s));
  return new Date(guess.getTime() - tzOffsetMs(timeZone, guess));
}

function toZonedDate(timeZone: string, input?: string | Date | null): Date | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input;
  // Naive ISO string like "2026-09-01T10:25:00" (or with seconds) — interpret as company wall-clock time
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(input);
  if (m) {
    return zonedDateTime(timeZone, +m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  const dt = new Date(input);
  return isNaN(dt.getTime()) ? undefined : dt;
}

function zonedWallClock(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month') - 1, d: get('day'), hh: get('hour'), mm: get('minute'), ss: get('second') };
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /** Resolve the current shift assignment (respecting effectiveFrom/effectiveTo) for an employee on a given date */
  private async resolveShiftContext(companyId: string, employeeId: string, date: Date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: startOfDay },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: startOfDay } }],
      },
      include: { shift: { include: { shiftType: true } } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!assignment) return null;

    const shift = assignment.shift;
    const shiftType = shift.shiftType ?? null;
    const [company, policies] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId }, select: { timezone: true } }),
      this.prisma.attendancePolicy.findMany({ where: { companyId } }),
    ]);
    const tz = company?.timezone || 'UTC';
    const policyMap = new Map(policies.map(p => [p.key, p.value]));
    const wall = zonedWallClock(tz, date);
    const [sh, sm] = (shift.startTime || '').split(':').map(Number);
    const [eh, em] = (shift.endTime || '').split(':').map(Number);
    const shiftStart = zonedDateTime(tz, wall.y, wall.m, wall.d, sh || 9, sm || 0);
    const shiftEnd = zonedDateTime(tz, wall.y, wall.m, wall.d, eh || 18, em || 0);
    const graceMins = shiftType?.graceMinutes ?? Number(policyMap.get('custom.gracePeriodMins') ?? 10);
    const requiredMinutes = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000);

    const isFlexible = shiftType?.isFlexible ?? policyMap.get('custom.flexiTime') === 'true';
    const coreStartStr = shiftType?.coreHoursStart ?? policyMap.get('custom.coreHoursStart') ?? null;
    const coreEndStr = shiftType?.coreHoursEnd ?? policyMap.get('custom.coreHoursEnd') ?? null;
    let coreStart: Date | null = null;
    let coreEnd: Date | null = null;
    if (isFlexible && coreStartStr && coreEndStr) {
      const [csH, csM] = coreStartStr.split(':').map(Number);
      const [ceH, ceM] = coreEndStr.split(':').map(Number);
      coreStart = zonedDateTime(tz, wall.y, wall.m, wall.d, csH || 0, csM || 0);
      coreEnd = zonedDateTime(tz, wall.y, wall.m, wall.d, ceH || 0, ceM || 0);
    }

    return {
      assignment,
      shift,
      shiftType,
      policyMap,
      timezone: tz,
      shiftStart,
      shiftEnd,
      coreStart,
      coreEnd,
      graceMins,
      requiredMinutes,
    };
  }

  /** Second Saturday of the month = a Saturday falling between day-of-month 8 and 14 */
  private isSecondSaturday(date: Date): boolean {
    return date.getDay() === 6 && date.getDate() >= 8 && date.getDate() <= 14;
  }

  async checkIn(companyId: string, employeeId: string, method: string, lat?: number, lng?: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.companyId !== companyId) throw new ForbiddenException('Employee does not belong to this company');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Determine geofence compliance
    let isWithinGeofence: boolean | null = null;
    const { geofenceLat, geofenceLng, geofenceRadius } = employee.company;

    if (lat != null && lng != null && geofenceLat && geofenceLng) {
      const distance = haversineDistance(lat, lng, geofenceLat, geofenceLng);
      isWithinGeofence = distance <= (geofenceRadius ?? 500);
    }

    // Determine if late — compare to assigned shift start time + grace
    const ctx = await this.resolveShiftContext(companyId, employeeId, today);

    let status = 'present';
    let lateMinutes = 0;
    let lateStatus: string | null = null;
    if (ctx) {
      const punchTime = today.getTime();
      const lateAfter = (ctx.coreStart ?? ctx.shiftStart).getTime() + ctx.graceMins * 60000;

      if (punchTime > lateAfter) {
        status = 'late';
        lateStatus = 'late';
        lateMinutes = Math.max(0, Math.round((punchTime - lateAfter) / 60000));
      } else {
        lateStatus = 'on_time';
        lateMinutes = 0;
      }
    }

    // Rule 3 — Second Saturday weekly off marking for 6-day workweek employees
    let weeklyOff = false;
    if (ctx) {
      const policies = ctx.policyMap;
      const secondSatEnabled = policies.get('custom.secondSaturdayOff') === 'true';
      const workDays = employee.workingDaysPerWeek ?? 5;
      if (secondSatEnabled && workDays === 6 && this.isSecondSaturday(today)) {
        weeklyOff = true;
      }
    }

    // Prevent duplicate check-in: if a log already exists for today, return it
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const existingLog = await this.prisma.attendanceLog.findFirst({
      where: { employeeId, date: { gte: startOfDay, lt: endOfDay } },
    });
    if (existingLog) {
      return existingLog;
    }

    return this.prisma.attendanceLog.create({
      data: {
        employeeId,
        date: startOfDay,
        checkIn: new Date(),
        method,
        latitude: lat,
        longitude: lng,
        status,
        isWithinGeofence,
        shiftId: ctx?.shift?.id ?? null,
        shiftStart: ctx?.shift?.startTime ?? null,
        shiftEnd: ctx?.shift?.endTime ?? null,
        requiredMinutes: ctx?.requiredMinutes ?? null,
        lateMinutes,
        lateStatus,
        attendanceStatus: weeklyOff ? 'WEEKLY_OFF' : null,
        isWeeklyOff: weeklyOff,
      },
    });
  }

  async checkOut(companyId: string, logId: string, userId: string) {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id: logId }, include: { employee: true } });
    if (!log) throw new NotFoundException('Attendance log not found');
    if (log.employee.companyId !== companyId) throw new ForbiddenException('Attendance log does not belong to this company');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.employeeId && user.employeeId !== log.employeeId) {
      throw new ForbiddenException('Cannot check out for another employee');
    }

    // Read policy map + OT threshold
    const ctx = await this.resolveShiftContext(companyId, log.employeeId, new Date());
    const policyMap = ctx ? ctx.policyMap : new Map<string, string>();
    const otThreshold = ctx?.shift.shiftType?.overtimeThresholdMinutes
      ?? Number(policyMap.get('custom.overtimeThresholdMinutes') ?? 480);

    const checkIn = log.checkIn ? log.checkIn.getTime() : Date.now();
    const now = Date.now();
    const durationMins = (now - checkIn) / 60000;
    const overtimeMinutes = Math.max(0, Math.round(durationMins - otThreshold));
    const workedMinutes = Math.round(durationMins);

    // Rule 2 — compare worked duration with required shift duration (via snapshot)
    let attendanceStatus: string | null = log.attendanceStatus ?? null;
    const required = log.requiredMinutes;
    const incompleteEnabled = policyMap.get('custom.incompleteShiftEnabled') !== 'false';
    if (required && required > 0) {
      const thresholdPct = Number(policyMap.get('custom.incompleteShiftThresholdPct') ?? 100);
      const complete = workedMinutes * 100 >= required * thresholdPct;
      if (complete) {
        attendanceStatus = 'FULL_DAY_PRESENT';
      } else if (incompleteEnabled) {
        attendanceStatus = policyMap.get('custom.incompleteShiftStatus') ?? 'OFF_DAY_OR_INCOMPLETE';
      }
    }

    const tx: any[] = [
      this.prisma.attendanceLog.update({
        where: { id: logId },
        data: { checkOut: new Date(), overtimeMinutes, workedMinutes, attendanceStatus },
      }),
    ];

    // Rule 3 — valid (completed) second-Saturday work earns a Comp Off credit
    const creditAmount = Number(policyMap.get('custom.secondSaturdayCompOffCredit') ?? 1);
    if (log.isWeeklyOff && attendanceStatus === 'FULL_DAY_PRESENT' && !log.compOffCredited && creditAmount > 0) {
      tx.push(
        this.prisma.compOffBalance.create({
          data: {
            companyId,
            employeeId: log.employeeId,
            attendanceLogId: logId,
            sourceType: 'SECOND_SATURDAY',
            creditAmount,
            consumedAmount: 0,
            status: 'AVAILABLE',
          },
        }),
        this.prisma.attendanceAudit.create({
          data: {
            companyId,
            employeeId: log.employeeId,
            attendanceLogId: logId,
            action: 'COMP_OFF_CREDIT',
            toValue: `${creditAmount}`,
            notes: `Second Saturday work — ${creditAmount} Comp Off day(s) credited`,
          },
        }),
      );
      tx.push(
        this.prisma.attendanceLog.update({
          where: { id: logId },
          data: { compOffCredited: true },
        }),
      );
    }

    return this.prisma.$transaction(tx);
  }

  /** Rule 1 — live shift status + remaining hours computed from authoritative server time */
  async getTodayStatus(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, workingDaysPerWeek: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const now = new Date();
    const ctx = await this.resolveShiftContext(companyId, employeeId, now);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const log = await this.prisma.attendanceLog.findFirst({
      where: { employeeId, date: { gte: startOfDay, lt: endOfDay } },
    });

    const shiftStart = ctx?.shiftStart ?? null;
    const shiftEnd = ctx?.shiftEnd ?? null;
    const required = ctx?.requiredMinutes ?? null;
    let remainingMinutes: number | null = null;
    if (ctx && shiftStart && shiftEnd) {
      // Remaining is time until shift end, never exceeding the shift duration —
      // before the shift begins it reads the full required time (not hours until 19:00).
      const untilEnd = Math.max(0, Math.round((shiftEnd.getTime() - now.getTime()) / 60000));
      const capped = required != null ? Math.min(untilEnd, required) : untilEnd;
      if (!log?.checkIn) {
        remainingMinutes = capped;
      } else if (!log.checkOut && now.getTime() < shiftEnd.getTime()) {
        remainingMinutes = capped;
      } else {
        remainingMinutes = 0;
      }
    }

    const workedMinutes = log?.checkIn
      ? Math.round(((log.checkOut?.getTime() ?? now.getTime()) - log.checkIn.getTime()) / 60000)
      : null;

    return {
      date: startOfDay,
      serverNow: now,
      log,
      shiftId: ctx?.shift?.id ?? null,
      shiftName: ctx?.shift?.name ?? null,
      shiftStartTime: ctx?.shift?.startTime ?? null,
      shiftEndTime: ctx?.shift?.endTime ?? null,
      shiftStart: shiftStart ?? null,
      shiftEnd: shiftEnd ?? null,
      requiredMinutes: ctx?.requiredMinutes ?? null,
      graceMinutes: ctx?.graceMins ?? null,
      isFlexible: ctx ? (ctx.shiftType?.isFlexible ?? ctx.policyMap.get('custom.flexiTime') === 'true') : false,
      isWeeklyOff: Boolean(log?.isWeeklyOff),
      todayIsSecondSaturday: ctx ? this.isSecondSaturday(now) : false,
      workedMinutes,
      remainingMinutes,
      lateStatus: log?.lateStatus ?? null,
      lateMinutes: log?.lateMinutes ?? null,
      attendanceStatus: log?.attendanceStatus ?? null,
      checkIn: log?.checkIn ?? null,
      checkOut: log?.checkOut ?? null,
      status: log?.status ?? null,
      overtimeMinutes: log?.overtimeMinutes ?? 0,
      regularizationStatus: log?.regularizationStatus ?? null,
      compOffCredited: Boolean(log?.compOffCredited),
    };
  }

  /** Manual punch (HR or self-service) — creates/updates a log for a specific date */
  async manualPunch(companyId: string, employeeId: string, date: string, time: string, type: 'IN' | 'OUT', reason?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { timezone: true } });
    const tz = company?.timezone || 'UTC';

    const day = new Date(`${date}T00:00:00Z`);
    if (isNaN(day.getTime())) throw new BadRequestException('Invalid date');
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) throw new BadRequestException('Invalid time');
    const y = day.getUTCFullYear();
    const mo = day.getUTCMonth();
    const d = day.getUTCDate();
    const ts = zonedDateTime(tz, y, mo, d, h, m);

    const wall = zonedWallClock(tz, new Date());
    const diffMin = Math.abs(h * 60 + m - (wall.hh * 60 + wall.mm));
    if (diffMin > 5) {
      throw new BadRequestException('Submitted time deviates from server time by more than 5 minutes');
    }
    const dayStart = zonedDateTime(tz, y, mo, d, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const existing = await this.prisma.attendanceLog.findFirst({
      where: { employeeId, date: { gte: dayStart, lt: dayEnd } },
    });

    if (type === 'IN') {
      if (existing?.checkIn) throw new ConflictException('Check-in already exists for this date');
      if (existing) {
        return this.prisma.attendanceLog.update({
          where: { id: existing.id },
          data: { checkIn: ts, method: 'manual', regularizationNote: reason || null, regularizationStatus: 'pending' },
        });
      }
      return this.prisma.attendanceLog.create({
        data: {
          employeeId,
          date: dayStart,
          checkIn: ts,
          method: 'manual',
          status: 'present',
          regularizationNote: reason || null,
          regularizationStatus: 'pending',
        },
      });
    }

    if (!existing?.checkIn) throw new BadRequestException('No check-in exists for this date');
    const durationMins = Math.round((ts.getTime() - existing.checkIn.getTime()) / 60000);
    return this.prisma.attendanceLog.update({
      where: { id: existing.id },
      data: {
        checkOut: ts,
        overtimeMinutes: Math.max(0, durationMins - 480),
        regularizationNote: reason || null,
        regularizationStatus: 'pending',
      },
    });
  }

  async listForEmployee(companyId: string, employeeId: string, from?: string, to?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.attendanceLog.findMany({
      where: {
        employeeId,
        ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  async listForCompany(companyId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.attendanceLog.findMany({
      where: { employee: { companyId }, date: { gte: startOfDay, lt: endOfDay } },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    });
  }

  async listAbsent(companyId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const dow = day.getDay();

    const [checkedLogs, employees, approvedLeaves, holidays, policies, assignments] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where: { employee: { companyId }, date: { gte: startOfDay, lt: endOfDay } },
        select: { employeeId: true },
      }),
      this.prisma.employee.findMany({
        where: { companyId, status: 'active', isSystem: false },
        select: {
          id: true, firstName: true, lastName: true, employeeCode: true, workingDaysPerWeek: true,
          department: { select: { name: true } },
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'approved', employee: { companyId }, startDate: { lte: endOfDay }, endDate: { gte: startOfDay } },
        select: { employeeId: true },
      }),
      this.prisma.holiday.findMany({
        where: { companyId, date: { gte: startOfDay, lt: endOfDay } },
        select: { id: true },
      }),
      this.prisma.attendancePolicy.findMany({ where: { companyId }, select: { key: true, value: true } }),
      this.prisma.shiftAssignment.findMany({
        where: {
          employee: { companyId },
          effectiveFrom: { lte: startOfDay },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: startOfDay } }],
        },
        include: { shift: { select: { startTime: true, endTime: true } } },
      }),
    ]);

    const checkedIn = new Set(checkedLogs.map(l => l.employeeId));
    const onLeaveIds = new Set(approvedLeaves.map(l => l.employeeId));
    const isHoliday = holidays.length > 0;
    const secondSatEnabled = new Map(policies.map(p => [p.key, p.value])).get('custom.secondSaturdayOff') === 'true';
    const isSecondSat = this.isSecondSaturday(day);

    const shiftByEmployee = new Map<string, { startTime: string; endTime: string }>();
    for (const a of assignments) {
      if (!shiftByEmployee.has(a.employeeId)) {
        shiftByEmployee.set(a.employeeId, { startTime: a.shift.startTime, endTime: a.shift.endTime });
      }
    }

    const absentEmployees = employees.filter((e) => {
      if (checkedIn.has(e.id)) return false;
      if (onLeaveIds.has(e.id)) return false;
      const workDays = e.workingDaysPerWeek ?? 5;
      const isWorkingDay =
        workDays === 7 ? true : workDays === 6 ? dow >= 1 && dow <= 6 : dow >= 1 && dow <= 5;
      if (!isWorkingDay) return false;
      if (isHoliday) return false;
      if (secondSatEnabled && workDays === 6 && isSecondSat) return false;
      return true;
    }).map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName || ''}`.trim(),
      employeeCode: e.employeeCode,
      department: e.department?.name ?? null,
      shiftStart: shiftByEmployee.get(e.id)?.startTime ?? null,
      shiftEnd: shiftByEmployee.get(e.id)?.endTime ?? null,
    }));

    return {
      date: startOfDay.toISOString(),
      count: absentEmployees.length,
      onLeaveToday: onLeaveIds.size,
      employees: absentEmployees,
    };
  }

  async listForCompanyMonth(companyId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    return this.prisma.attendanceLog.findMany({
      where: { employee: { companyId }, date: { gte: start, lt: end } },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { checkIn: 'asc' }],
    });
  }

  async getMonthlySummary(companyId: string, employeeId: string, year: number, month: number) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { workingDaysPerWeek: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const logs = await this.prisma.attendanceLog.findMany({
      where: { employeeId, date: { gte: start, lt: end } },
    });

    const workingDaysPerWeek = employee.workingDaysPerWeek ?? 5;

    // Group logs by date to avoid double counting multiple check-ins per day
    const uniqueDays = new Map<number, any>();
    for (const log of logs) {
      const time = log.date.getTime();
      if (!uniqueDays.has(time)) {
        uniqueDays.set(time, log);
      } else if (log.status === 'late' || log.status === 'half_day') {
        // Prioritize late or half_day over present if there's a conflict
        uniqueDays.set(time, log);
      }
    }
    const uniqueLogs = Array.from(uniqueDays.values());

    const present = uniqueLogs.filter(l => l.status === 'present').length;
    const late = uniqueLogs.filter(l => l.status === 'late').length;
    const halfDay = uniqueLogs.filter(l => l.status === 'half_day').length;
    const onLeave = uniqueLogs.filter(l => l.status === 'on_leave').length;
    const totalOvertimeMins = logs.reduce((s, l) => s + l.overtimeMinutes, 0);

    // Fetch company holidays for the month and exclude those on working days
    const holidays = await this.prisma.holiday.findMany({
      where: { companyId, date: { gte: start, lt: end } },
    });
    const holidayCount = holidays.filter(h => {
      const dow = h.date.getDay();
      if (workingDaysPerWeek === 5 && dow >= 1 && dow <= 5) return true;
      if (workingDaysPerWeek === 6 && dow >= 1 && dow <= 6) return true;
      if (workingDaysPerWeek === 7) return true;
      return false;
    }).length;

    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDaysInMonth = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i).getDay();
      if (workingDaysPerWeek === 5 && d >= 1 && d <= 5) workingDaysInMonth++;
      else if (workingDaysPerWeek === 6 && d >= 1 && d <= 6) workingDaysInMonth++;
      else if (workingDaysPerWeek === 7) workingDaysInMonth++;
    }

    const absent = Math.max(0, workingDaysInMonth - holidayCount - present - late - halfDay - onLeave);

    return { present, late, halfDay, onLeave, absent, holidays: holidayCount, totalOvertimeMins, totalDays: workingDaysInMonth - holidayCount, logs };
  }

async listPendingRegularizations(companyId: string) {
    return this.prisma.regularizationRequest.findMany({
      where: { status: 'pending', employee: { companyId } },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } } }
        },
        attendanceLog: {
          select: { id: true, date: true, checkIn: true, checkOut: true, status: true, attendanceStatus: true, isWithinGeofence: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestRegularization(companyId: string, logId: string, employeeId: string, requestedCheckIn?: string | Date | null, requestedCheckOut?: string | Date | null, reason: string = '', type: string = 'regularization') {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Attendance log not found');
    if (log.employeeId !== employeeId) throw new ForbiddenException('Attendance log does not belong to this employee');
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new ForbiddenException('Employee does not belong to this company');
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { timezone: true } });
    const tz = company?.timezone || 'UTC';

    // Rule 2 — full-day corrections are only allowed when the day was marked incomplete
    if (type === 'full_day' && log.attendanceStatus === 'FULL_DAY_PRESENT') {
      throw new BadRequestException('This day is already a full-day presence — no correction needed');
    }

    // Note-only corrections (no explicit times) keep the log's original times.
    // Submitted wall-clock times are interpreted in the company timezone so they
    // store the correct UTC instant (avoids the previous 5h30m IST→UTC shift).
    // A blank/omitted out-time means "not checked out" (null), never the stale punch.
    const requestedIn = toZonedDate(tz, requestedCheckIn);
    const requestedOut = toZonedDate(tz, requestedCheckOut);
    const inTime = requestedIn || log.checkIn;
    const outTime = requestedOut ?? null;

    // 1. Create a request in the new RegularizationRequest table
    const req = await this.prisma.regularizationRequest.create({
      data: {
        attendanceLogId: logId,
        employeeId,
        requestedCheckIn: inTime,
        requestedCheckOut: outTime,
        reason,
        status: 'pending',
        type,
      },
    });

    // 2. Mark the log as pending regularization for quick dashboard queries
    await this.prisma.attendanceLog.update({
      where: { id: logId },
      data: { regularizationStatus: 'pending', regularizationNote: reason },
    });

    return req;
  }

  async approveRegularization(requestId: string, companyId: string, approverId: string, resolutionNote?: string) {
    const req = await this.prisma.regularizationRequest.findUnique({
      where: { id: requestId },
      include: { employee: true, attendanceLog: true },
    });
    if (!req) throw new NotFoundException('Regularization request not found');
    if (req.employee.companyId !== companyId) throw new ForbiddenException('Request does not belong to this company');

    if (req.type === 'full_day') {
      // Rule 2 — preserve original punches, record correction in audit trail, set final status
      const fromStatus = req.attendanceLog?.attendanceStatus ?? req.attendanceLog?.status ?? null;
      const log = req.attendanceLog;
      const logUpdateData: any = {
        attendanceStatus: 'FULL_DAY_PRESENT',
        regularizationStatus: 'approved',
        regularizationNote: req.reason,
        correctionOf: requestId,
      };
      const tx: any[] = [
        this.prisma.regularizationRequest.update({
          where: { id: requestId },
          data: { status: 'approved', approverId, resolutionNote: resolutionNote ?? null },
        }),
        this.prisma.attendanceLog.update({
          where: { id: req.attendanceLogId },
          data: logUpdateData,
        }),
        this.prisma.attendanceAudit.create({
          data: {
            companyId,
            employeeId: req.employeeId,
            attendanceLogId: req.attendanceLogId,
            action: 'REGULARIZATION_APPROVED',
            fromValue: fromStatus ?? null,
            toValue: 'FULL_DAY_PRESENT',
            actorId: approverId,
            actorRole: 'hr',
            notes: `Full-day correction approved. Original punches preserved (in ${log?.checkIn?.toISOString() ?? '—'}, out ${log?.checkOut?.toISOString() ?? '—'}).`,
          },
        }),
      ];

      // Rule 3 — a corrected second-Saturday log (worked, punches incomplete) also earns the Comp Off credit
      const creditAmount = Number((await this.getPolicyMap(companyId)).get('custom.secondSaturdayCompOffCredit') ?? 1);
      if (log?.isWeeklyOff && !log.compOffCredited && creditAmount > 0) {
        logUpdateData.compOffCredited = true;
        tx.push(
          this.prisma.compOffBalance.create({
            data: {
              companyId,
              employeeId: req.employeeId,
              attendanceLogId: req.attendanceLogId,
              sourceType: 'SECOND_SATURDAY',
              creditAmount,
              consumedAmount: 0,
              status: 'AVAILABLE',
            },
          }),
          this.prisma.attendanceAudit.create({
            data: {
              companyId,
              employeeId: req.employeeId,
              attendanceLogId: req.attendanceLogId,
              action: 'COMP_OFF_CREDIT',
              toValue: `${creditAmount}`,
              actorId: approverId,
              actorRole: 'hr',
              notes: `Second Saturday full-day correction approved — ${creditAmount} Comp Off day(s) credited`,
            },
          }),
        );
      }

      return this.prisma.$transaction(tx);
    }

    // Apply the resolved in/out, then recompute all derived fields so an approved
    // correction renders correctly (worked/OT, late, incomplete vs FULL_DAY_PRESENT).
    const newCheckIn = req.requestedCheckIn ?? req.attendanceLog?.checkIn ?? null;
    const newCheckOut = req.requestedCheckOut ?? null; // null clears a mistaken punch
    const ctx = await this.resolveShiftContext(companyId, req.employeeId, newCheckIn ?? new Date());
    const policyMap = ctx ? ctx.policyMap : new Map<string, string>();
    const otThreshold = ctx?.shift.shiftType?.overtimeThresholdMinutes
      ?? Number(policyMap.get('custom.overtimeThresholdMinutes') ?? 480);

    const data: any = {
      checkIn: newCheckIn ?? undefined,
      checkOut: newCheckOut,
      regularizationStatus: 'approved',
      status: 'present',
    };

    if (newCheckIn) {
      data.requiredMinutes = ctx?.requiredMinutes ?? req.attendanceLog?.requiredMinutes ?? undefined;
      if (ctx) {
        const punch = newCheckIn.getTime();
        const lateAfter = (ctx.coreStart ?? ctx.shiftStart).getTime() + ctx.graceMins * 60000;
        data.lateMinutes = punch > lateAfter ? Math.max(0, Math.round((punch - lateAfter) / 60000)) : 0;
        data.lateStatus = punch > lateAfter ? 'late' : 'on_time';
        if (data.lateStatus === 'late') data.status = 'late';
      }

      if (newCheckOut) {
        const worked = Math.max(0, Math.round((newCheckOut.getTime() - newCheckIn.getTime()) / 60000));
        data.workedMinutes = worked;
        data.overtimeMinutes = Math.max(0, worked - otThreshold);
        let attr: string | null = req.attendanceLog?.attendanceStatus ?? null;
        const required = data.requiredMinutes;
        if (required && required > 0) {
          const thresholdPct = Number(policyMap.get('custom.incompleteShiftThresholdPct') ?? 100);
          const complete = worked * 100 >= required * thresholdPct;
          attr = complete
            ? 'FULL_DAY_PRESENT'
            : policyMap.get('custom.incompleteShiftEnabled') !== 'false'
              ? policyMap.get('custom.incompleteShiftStatus') ?? 'OFF_DAY_OR_INCOMPLETE'
              : attr;
        }
        data.attendanceStatus = attr;
      } else {
        // Out-time blank → still checked in; keep the day open, never flag incomplete.
        data.workedMinutes = null;
        data.overtimeMinutes = 0;
        data.attendanceStatus = null;
      }
    }

    return this.prisma.$transaction([
      this.prisma.regularizationRequest.update({
        where: { id: requestId },
        data: { status: 'approved', approverId, resolutionNote: resolutionNote ?? null },
      }),
      this.prisma.attendanceLog.update({
        where: { id: req.attendanceLogId },
        data,
      }),
      this.prisma.attendanceAudit.create({
        data: {
          companyId,
          employeeId: req.employeeId,
          attendanceLogId: req.attendanceLogId,
          action: 'REGULARIZATION_APPROVED',
          fromValue: req.requestedCheckIn ? undefined : null,
          toValue: req.requestedCheckOut ? undefined : null,
          actorId: approverId,
          actorRole: 'hr',
          notes: `Time regularization approved (in ${newCheckIn?.toISOString() ?? '—'}, out ${newCheckOut?.toISOString() ?? '—'}).`,
        },
      }),
    ]);
  }

  async rejectRegularization(requestId: string, companyId: string, approverId: string) {
    const req = await this.prisma.regularizationRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Regularization request not found');
    if (req.employee.companyId !== companyId) throw new ForbiddenException('Request does not belong to this company');

    return this.prisma.$transaction([
      this.prisma.regularizationRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', approverId },
      }),
      this.prisma.attendanceLog.update({
        where: { id: req.attendanceLogId },
        data: { regularizationStatus: 'rejected' },
      }),
      this.prisma.attendanceAudit.create({
        data: {
          companyId,
          employeeId: req.employeeId,
          attendanceLogId: req.attendanceLogId,
          action: 'REGULARIZATION_REJECTED',
          actorId: approverId,
          actorRole: 'hr',
          notes: `Correction request rejected (${req.type}).`,
        },
      }),
    ]);
  }

  /** Save geofence config for a company */
  async setGeofence(companyId: string, lat: number, lng: number, radius: number) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { geofenceLat: lat, geofenceLng: lng, geofenceRadius: radius },
    });
  }

async getGeofence(companyId: string) {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { geofenceLat: true, geofenceLng: true, geofenceRadius: true },
    });
    return c;
  }

  /** Company-level attendance policy map (literal keys) — single source of truth for rule flags. */
  private async getPolicyMap(companyId: string) {
    const policies = await this.prisma.attendancePolicy.findMany({ where: { companyId } });
    return new Map(policies.map(p => [p.key, p.value]));
  }
}

