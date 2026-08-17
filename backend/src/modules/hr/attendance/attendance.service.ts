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

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

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

    // Determine if late — compare to shift start time
    const shiftAssignment = await this.prisma.shiftAssignment.findFirst({
      where: { employeeId },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    let status = 'present';
    if (shiftAssignment) {
      const [shiftHour, shiftMin] = shiftAssignment.shift.startTime.split(':').map(Number);
      const shiftStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), shiftHour, shiftMin);
      const graceMins = 10;
      if (today.getTime() > shiftStart.getTime() + graceMins * 60000) {
        status = 'late';
      }
    }

    // Prevent duplicate check-in: if a log already exists for today, return it
    // (or update checkout if one already exists).
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

    const checkIn = log.checkIn ? log.checkIn.getTime() : Date.now();
    const durationMins = (Date.now() - checkIn) / 60000;
    const overtimeMinutes = Math.max(0, Math.round(durationMins - 480)); // > 8 hrs

    return this.prisma.attendanceLog.update({
      where: { id: logId },
      data: { checkOut: new Date(), overtimeMinutes },
    });
  }

  /** Manual punch (HR or self-service) — creates/updates a log for a specific date */
  async manualPunch(companyId: string, employeeId: string, date: string, time: string, type: 'IN' | 'OUT', reason?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const day = new Date(date);
    if (isNaN(day.getTime())) throw new BadRequestException('Invalid date');
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) throw new BadRequestException('Invalid time');
    const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
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

    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDaysInMonth = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i).getDay();
      if (workingDaysPerWeek === 5 && d >= 1 && d <= 5) workingDaysInMonth++;
      else if (workingDaysPerWeek === 6 && d >= 1 && d <= 6) workingDaysInMonth++;
      else if (workingDaysPerWeek === 7) workingDaysInMonth++;
    }

    const absent = Math.max(0, workingDaysInMonth - present - late - halfDay - onLeave);

    return { present, late, halfDay, onLeave, absent, totalOvertimeMins, totalDays: workingDaysInMonth, logs };
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
          select: { id: true, date: true, checkIn: true, checkOut: true, status: true, isWithinGeofence: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestRegularization(companyId: string, logId: string, employeeId: string, requestedCheckIn?: Date, requestedCheckOut?: Date, reason: string = '') {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Attendance log not found');
    if (log.employeeId !== employeeId) throw new ForbiddenException('Attendance log does not belong to this employee');
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new ForbiddenException('Employee does not belong to this company');

    // Note-only corrections (no explicit times) keep the log's original times
    const inTime = requestedCheckIn || log.checkIn;
    const outTime = requestedCheckOut || log.checkOut;

    // 1. Create a request in the new RegularizationRequest table
    const req = await this.prisma.regularizationRequest.create({
      data: {
        attendanceLogId: logId,
        employeeId,
        requestedCheckIn: inTime,
        requestedCheckOut: outTime,
        reason,
        status: 'pending',
      },
    });

    // 2. Mark the log as pending regularization for quick dashboard queries
    await this.prisma.attendanceLog.update({
      where: { id: logId },
      data: { regularizationStatus: 'pending', regularizationNote: reason },
    });

    return req;
  }

  async approveRegularization(requestId: string, companyId: string, approverId: string) {
    const req = await this.prisma.regularizationRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Regularization request not found');
    if (req.employee.companyId !== companyId) throw new ForbiddenException('Request does not belong to this company');

    return this.prisma.$transaction([
      this.prisma.regularizationRequest.update({
        where: { id: requestId },
        data: { status: 'approved', approverId },
      }),
      this.prisma.attendanceLog.update({
        where: { id: req.attendanceLogId },
        data: {
          checkIn: req.requestedCheckIn ?? undefined,
          checkOut: req.requestedCheckOut ?? undefined,
          regularizationStatus: 'approved',
          status: 'present',
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
}

