import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { holidayCompanyFilter, isGroupWideUser } from '../../../utils/group-access.util';

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
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUTC - date.getTime();
}

function zonedDateTime(timeZone: string, y: number, m: number, d: number, h: number, min: number, s = 0): Date {
  const guess = new Date(Date.UTC(y, m, d, h, min, s));
  return new Date(guess.getTime() - tzOffsetMs(timeZone, guess));
}

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async list(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let shifts = await this.prisma.shift.findMany({
      where: groupWide ? {} : { companyId },
      include: {
        company: { select: { id: true, name: true, displayName: true } },
        shiftType: { select: { id: true, name: true, isFlexible: true, graceMinutes: true } },
      },
      orderBy: { name: 'asc' },
    });
    if (shifts.length === 0 && !groupWide) {
      shifts = await this.prisma.shift.findMany({
        include: {
          company: { select: { id: true, name: true, displayName: true } },
          shiftType: { select: { id: true, name: true, isFlexible: true, graceMinutes: true } },
        },
        orderBy: { name: 'asc' },
      });
    }
    return shifts;
  }

  async create(companyId: string, name: string, startTime: string, endTime: string, type: string, shiftTypeId?: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let finalStart = startTime;
    let finalEnd = endTime;
    let finalType = type;

    if (shiftTypeId) {
      const shiftType = await this.prisma.shiftType.findFirst({
        where: groupWide ? { id: shiftTypeId } : { id: shiftTypeId, companyId },
      });
      if (!shiftType) throw new NotFoundException('Shift type not found');
      finalStart = finalStart || shiftType.defaultStartTime;
      finalEnd = finalEnd || shiftType.defaultEndTime;
      finalType = shiftType.isFlexible ? 'flexible' : 'fixed';
    }

    return this.prisma.shift.create({
      data: {
        companyId,
        name,
        startTime: finalStart,
        endTime: finalEnd,
        type: finalType,
        ...(shiftTypeId && { shiftTypeId }),
      },
      include: { shiftType: { select: { id: true, name: true, isFlexible: true, graceMinutes: true } } },
    });
  }

  async assign(companyId: string, shiftId: string, employeeId: string, effectiveFrom: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let shift = await this.prisma.shift.findFirst({
      where: groupWide ? { id: shiftId } : { id: shiftId, companyId },
    });
    if (!shift) {
      shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift) throw new NotFoundException('Shift not found');
    }

    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId, isSystem: false } : { id: employeeId, companyId, isSystem: false },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const effectiveDate = new Date(effectiveFrom);
    const existing = await this.prisma.shiftAssignment.findFirst({
      where: { shiftId, employeeId, effectiveFrom: effectiveDate },
    });
    let result = existing;
    if (!existing) {
      result = await this.prisma.shiftAssignment.create({
        data: { shiftId, employeeId, effectiveFrom: effectiveDate },
      });
    }

    // Automatically sync and recalculate attendance for this date if checkIn already exists
    await this.syncAttendanceForDate(employee.id, employee.companyId, effectiveDate);

    return result;
  }

  async listAssignments(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return this.prisma.shiftAssignment.findMany({
      where: {
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { id: true, name: true, displayName: true } },
          },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true, type: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async listHolidays(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const holidays = await this.prisma.holiday.findMany({
      where: groupWide ? {} : { companyId: await holidayCompanyFilter(this.prisma, companyId) },
      orderBy: { date: 'asc' },
    });
    return holidays;
  }

  async addHoliday(companyId: string, name: string, date: string) {
    return this.prisma.holiday.create({ data: { companyId, name, date: new Date(date) } });
  }

  async deleteShift(companyId: string, id: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shift = await this.prisma.shift.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return this.prisma.$transaction([
      this.prisma.shiftChangeRequest.deleteMany({ where: { shiftId: id } }),
      this.prisma.shiftChangeRequest.deleteMany({ where: { requestedShiftId: id } }),
      this.prisma.shiftAssignment.deleteMany({ where: { shiftId: id } }),
      this.prisma.shift.delete({ where: { id } }),
    ]);
  }

  async deleteAssignment(companyId: string, id: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        id,
        employee: groupWide ? { isSystem: false } : { companyId },
      },
      include: { employee: true },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');
    const employeeId = assignment.employeeId;
    const empCompanyId = assignment.employee?.companyId || companyId;
    const effectiveDate = assignment.effectiveFrom;

    const res = await this.prisma.shiftAssignment.delete({ where: { id } });
    await this.syncAttendanceForDate(employeeId, empCompanyId, effectiveDate);
    return res;
  }

  /**
   * Recalculates and updates attendance log for an employee on a target date
   * when shift assignment changes.
   */
  async syncAttendanceForDate(employeeId: string, companyId: string, targetDate: Date) {
    try {
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const log = await this.prisma.attendanceLog.findFirst({
        where: { employeeId, date: { gte: startOfDay, lt: endOfDay } },
      });
      if (!log || !log.checkIn) return;

      const assignment = await this.prisma.shiftAssignment.findFirst({
        where: {
          employeeId,
          effectiveFrom: { lte: startOfDay },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: startOfDay } }],
        },
        include: { shift: { include: { shiftType: true } } },
        orderBy: { effectiveFrom: 'desc' },
      });

      const shift = assignment?.shift;
      if (!shift) return;

      const [company, policies] = await Promise.all([
        this.prisma.company.findUnique({ where: { id: companyId }, select: { timezone: true } }),
        this.prisma.attendancePolicy.findMany({ where: { companyId } }),
      ]);
      const tz = company?.timezone || 'UTC';
      const policyMap = new Map(policies.map((p) => [p.key, p.value]));

      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      const parts = dtf.formatToParts(log.checkIn);
      const getVal = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
      const wall = { y: getVal('year'), m: getVal('month') - 1, d: getVal('day') };

      const [sh, sm] = (shift.startTime || '09:00').split(':').map(Number);
      const [eh, em] = (shift.endTime || '18:00').split(':').map(Number);

      const shiftStart = zonedDateTime(tz, wall.y, wall.m, wall.d, sh || 9, sm || 0);
      const shiftEnd = zonedDateTime(tz, wall.y, wall.m, wall.d, eh || 18, em || 0);

      const graceMins = shift.shiftType?.graceMinutes ?? Number(policyMap.get('custom.gracePeriodMins') ?? 10);
      const requiredMinutes = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000);

      const punchTime = log.checkIn.getTime();
      const lateAfter = shiftStart.getTime() + graceMins * 60000;

      let status = log.status;
      let lateMinutes = 0;
      let lateStatus = 'on_time';

      if (punchTime > lateAfter) {
        status = 'late';
        lateStatus = 'late';
        lateMinutes = Math.max(0, Math.round((punchTime - lateAfter) / 60000));
      } else {
        lateStatus = 'on_time';
        lateMinutes = 0;
        if (status === 'late') {
          status = 'present';
        }
      }

      await this.prisma.attendanceLog.update({
        where: { id: log.id },
        data: {
          shiftId: shift.id,
          shiftStart: shift.startTime,
          shiftEnd: shift.endTime,
          requiredMinutes,
          lateMinutes,
          lateStatus,
          status,
        },
      });
    } catch (err) {
      console.error('Failed to sync attendance for shift update:', err);
    }
  }

  async requestChange(
    companyId: string,
    body: { employeeId: string; shiftId?: string; requestedShiftId: string; reason?: string; effectiveFrom: string },
    userId?: string,
  ) {
    if (!body.requestedShiftId || !body.effectiveFrom) {
      throw new BadRequestException('requestedShiftId and effectiveFrom are required');
    }
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shift = await this.prisma.shift.findFirst({
      where: groupWide ? { id: body.requestedShiftId } : { id: body.requestedShiftId, companyId },
    });
    if (!shift) throw new NotFoundException('Requested shift not found');
    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: body.employeeId } : { id: body.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const targetCompanyId = employee.companyId || companyId;
    return this.prisma.shiftChangeRequest.create({
      data: {
        companyId: targetCompanyId,
        employeeId: body.employeeId,
        shiftId: body.shiftId || null,
        requestedShiftId: body.requestedShiftId,
        reason: body.reason,
        effectiveFrom: new Date(body.effectiveFrom),
      },
    });
  }

  async listChangeRequests(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return this.prisma.shiftChangeRequest.findMany({
      where: groupWide ? { employee: { isSystem: false } } : { companyId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { id: true, name: true, displayName: true } },
          },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        requestedShift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveChangeRequest(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const req = await this.prisma.shiftChangeRequest.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!req) throw new NotFoundException('Shift change request not found');

    await this.prisma.$transaction([
      this.prisma.shiftChangeRequest.update({
        where: { id },
        data: { status: 'approved', approvedBy: approverId },
      }),
      this.prisma.shiftAssignment.create({
        data: { shiftId: req.requestedShiftId, employeeId: req.employeeId, effectiveFrom: req.effectiveFrom },
      }),
    ]);
    return req;
  }

  async rejectChangeRequest(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const req = await this.prisma.shiftChangeRequest.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!req) throw new NotFoundException('Shift change request not found');
    return this.prisma.shiftChangeRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId },
    });
  }

  async generateDepartmentRoster(
    companyId: string,
    departmentId: string,
    shiftIds: string[],
    startDate: string,
    weeks: number,
    userId?: string,
  ) {
    if (!shiftIds || shiftIds.length === 0) throw new BadRequestException('At least one shift is required.');

    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shifts = await this.prisma.shift.findMany({
      where: groupWide ? { id: { in: shiftIds } } : { id: { in: shiftIds }, companyId },
      select: { id: true },
    });
    if (shifts.length !== shiftIds.length) throw new NotFoundException('One or more shifts not found');

    const employees = await this.prisma.employee.findMany({
      where: {
        ...(groupWide ? {} : { companyId }),
        departmentId,
        status: 'active',
        isSystem: false,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (employees.length === 0) return { message: 'No active employees in department.' };

    const start = new Date(startDate);
    const assignments: any[] = [];

    // Distribute shifts round-robin
    for (let w = 0; w < weeks; w++) {
      const effectiveDate = new Date(start);
      effectiveDate.setDate(effectiveDate.getDate() + w * 7);

      const rosterWeek = `${effectiveDate.getFullYear()}-W${Math.ceil(
        (effectiveDate.getDate() + effectiveDate.getDay()) / 7,
      )}`;

      employees.forEach((emp, index) => {
        const shiftIndex = (index + w) % shiftIds.length;
        const assignedShift = shiftIds[shiftIndex];

        assignments.push({
          shiftId: assignedShift,
          employeeId: emp.id,
          effectiveFrom: effectiveDate,
          rosterWeek,
        });
      });
    }

    await this.prisma.shiftAssignment.createMany({
      data: assignments,
    });

    return { message: `Roster generated successfully for ${weeks} weeks.` };
  }
}
