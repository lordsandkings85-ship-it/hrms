import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  async checkIn(employeeId: string, method: string, lat?: number, lng?: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Determine geofence compliance
    let isWithinGeofence: boolean | null = null;
    const { geofenceLat, geofenceLng, geofenceRadius } = employee.company;

    if (method !== 'web' && lat != null && lng != null && geofenceLat && geofenceLng) {
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

  async checkOut(logId: string) {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Attendance log not found');

    const checkIn = log.checkIn ? log.checkIn.getTime() : Date.now();
    const durationMins = (Date.now() - checkIn) / 60000;
    const overtimeMinutes = Math.max(0, Math.round(durationMins - 480)); // > 8 hrs

    return this.prisma.attendanceLog.update({
      where: { id: logId },
      data: { checkOut: new Date(), overtimeMinutes },
    });
  }

  async listForEmployee(employeeId: string, from?: string, to?: string) {
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

  async getMonthlySummary(employeeId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const logs = await this.prisma.attendanceLog.findMany({
      where: { employeeId, date: { gte: start, lt: end } },
    });

    const present = logs.filter(l => l.status === 'present').length;
    const late = logs.filter(l => l.status === 'late').length;
    const halfDay = logs.filter(l => l.status === 'half_day').length;
    const onLeave = logs.filter(l => l.status === 'on_leave').length;
    const totalOvertimeMins = logs.reduce((s, l) => s + l.overtimeMinutes, 0);

    const daysInMonth = new Date(year, month, 0).getDate();
    const absent = Math.max(0, daysInMonth - present - late - halfDay - onLeave);

    return { present, late, halfDay, onLeave, absent, totalOvertimeMins, totalDays: daysInMonth, logs };
  }

  async requestRegularization(logId: string, employeeId: string, requestedCheckIn: Date, requestedCheckOut: Date, reason: string) {
    // 1. Create a request in the new RegularizationRequest table
    const req = await this.prisma.regularizationRequest.create({
      data: {
        attendanceLogId: logId,
        employeeId,
        requestedCheckIn,
        requestedCheckOut,
        reason,
        status: 'pending',
      },
    });

    // 2. Mark the log as pending regularization for quick dashboard queries
    await this.prisma.attendanceLog.update({
      where: { id: logId },
      data: { regularizationStatus: 'pending' },
    });

    return req;
  }

  async approveRegularization(requestId: string, approverId: string) {
    const req = await this.prisma.regularizationRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Regularization request not found');

    // 1. Update the request status
    await this.prisma.regularizationRequest.update({
      where: { id: requestId },
      data: { status: 'approved', approverId },
    });

    // 2. Apply the requested times and clear the pending status on the actual log
    return this.prisma.attendanceLog.update({
      where: { id: req.attendanceLogId },
      data: { 
        checkIn: req.requestedCheckIn ?? undefined,
        checkOut: req.requestedCheckOut ?? undefined,
        regularizationStatus: 'approved',
        status: 'present', // Assume present if regularized
      },
    });
  }

  async rejectRegularization(requestId: string, approverId: string) {
    const req = await this.prisma.regularizationRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Regularization request not found');

    // 1. Update the request status
    await this.prisma.regularizationRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', approverId },
    });

    // 2. Clear the pending status on the actual log
    return this.prisma.attendanceLog.update({
      where: { id: req.attendanceLogId },
      data: { regularizationStatus: 'rejected' },
    });
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
