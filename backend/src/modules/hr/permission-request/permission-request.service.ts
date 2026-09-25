import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

export const PERMISSION_MIN_MINUTES = 30;
export const PERMISSION_MAX_MINUTES = 180;
export const PERMISSION_STEP_MINUTES = 15;
export const PERMISSION_MONTHLY_QUOTA_MINUTES = 180;

function totalMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function hoursMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
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
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUTC - date.getTime();
}

function zonedDateTime(timeZone: string, y: number, m: number, d: number, h: number, min: number, s = 0): Date {
  const guess = new Date(Date.UTC(y, m, d, h, min, s));
  return new Date(guess.getTime() - tzOffsetMs(timeZone, guess));
}

/** Interpret "HH:mm" on the given UTC-stored calendar day in the company timezone. */
function toTzInstant(timeZone: string, date: Date, hhmm: string): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const [hh, mm] = hhmm.split(':').map(Number);
  return zonedDateTime(timeZone, get('year'), get('month') - 1, get('day'), hh || 0, mm || 0);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class PermissionRequestService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async employerOf(userId: string): Promise<{ employeeId: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { employeeId: true } });
    return { employeeId: user?.employeeId ?? null };
  }

  private async resolveShift(employeeId: string, date: Date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: startOfDay },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: startOfDay } }],
      },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!assignment) return null;
    return { startTime: assignment.shift.startTime, endTime: assignment.shift.endTime };
  }

  private async resolveApproverNames(reqs: { approvedBy?: string | null }[]) {
    const ids = [...new Set(reqs.map((r) => r.approvedBy).filter(Boolean))] as string[];
    if (ids.length === 0) return new Map<string, string>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } },
    });
    return new Map(
      users.map((u) => [
        u.id,
        u.employee ? `${u.employee.firstName} ${u.employee.lastName || ''}`.trim() : u.email,
      ]),
    );
  }

  private async usedQuota(employeeId: string, date: Date): Promise<number> {
    const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const aggr = await this.prisma.permissionRequest.aggregate({
      where: {
        employeeId,
        date: { gte: monthStart, lt: monthEnd },
        status: { in: ['pending', 'approved'] },
      },
      _sum: { minutes: true },
    });
    return aggr._sum.minutes ?? 0;
  }

  private validateWindow(companyId: string, date: Date, fromTime: string, toTime: string) {
    if (!TIME_RE.test(fromTime) || !TIME_RE.test(toTime)) {
      throw new BadRequestException('Invalid time format (expected HH:mm)');
    }
    const fromMin = totalMinutes(fromTime);
    const toMin = totalMinutes(toTime);
    if (toMin <= fromMin) throw new BadRequestException('"To" time must be after "From" time');
    const duration = toMin - fromMin;
    if (duration < PERMISSION_MIN_MINUTES || duration > PERMISSION_MAX_MINUTES) {
      throw new BadRequestException(`Permission must be between ${PERMISSION_MIN_MINUTES} minutes and 3 hours`);
    }
    if (duration % PERMISSION_STEP_MINUTES !== 0) {
      throw new BadRequestException(`Permission duration must be in ${PERMISSION_STEP_MINUTES}-minute steps`);
    }
    return duration;
  }

  async create(input: {
    userId: string;
    companyId: string;
    employeeId: string;
    date: string;
    fromTime: string;
    toTime: string;
    reason: string;
  }) {
    const groupWide = await isGroupWideUser(this.prisma, input.userId);
    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: input.employeeId } : { id: input.employeeId, companyId: input.companyId },
      include: { company: { select: { timezone: true } } },
    });
    if (!employee) throw new ForbiddenException('Employee does not belong to this company');

    const targetCompanyId = employee.companyId;
    const date = startOfUtcDay(new Date(input.date));
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const reason = (input.reason || '').trim();
    if (!reason) throw new BadRequestException('Reason is required');
    if (reason.length < 10) throw new BadRequestException('Reason must be at least 10 characters');

    const duration = this.validateWindow(targetCompanyId, date, input.fromTime, input.toTime);

    const shift = await this.resolveShift(employee.id, date);
    if (shift && TIME_RE.test(shift.startTime) && TIME_RE.test(shift.endTime)) {
      const shiftStart = totalMinutes(shift.startTime);
      const shiftEnd = totalMinutes(shift.endTime);
      const fromMin = totalMinutes(input.fromTime);
      const toMin = totalMinutes(input.toTime);
      if (fromMin < shiftStart || toMin > shiftEnd) {
        throw new BadRequestException(`Permission must be within your shift (${shift.startTime}–${shift.endTime})`);
      }
    }

    const overlap = await this.prisma.permissionRequest.findFirst({
      where: { employeeId: employee.id, date, status: { in: ['pending', 'approved'] } },
      select: { id: true },
    });
    if (overlap) throw new BadRequestException('You already have a permission request for this day');

    const used = await this.usedQuota(employee.id, date);
    if (used + duration > PERMISSION_MONTHLY_QUOTA_MINUTES) {
      throw new BadRequestException(
        `Monthly permission limit (${hoursMinutes(PERMISSION_MONTHLY_QUOTA_MINUTES)}) reached — you have ${hoursMinutes(PERMISSION_MONTHLY_QUOTA_MINUTES - used)} left`,
      );
    }

    const req = await this.prisma.permissionRequest.create({
      data: {
        companyId: targetCompanyId,
        employeeId: employee.id,
        date,
        fromTime: input.fromTime,
        toTime: input.toTime,
        minutes: duration,
        reason,
        status: 'pending',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: targetCompanyId,
        userId: input.userId,
        action: 'PERMISSION_CREATED',
        entity: 'PERMISSION_REQUEST',
        entityId: req.id,
        metadata: {
          employeeId: employee.id,
          date: date.toISOString(),
          fromTime: input.fromTime,
          toTime: input.toTime,
          minutes: duration,
          reason,
        },
      },
    }).catch(() => undefined);

    try {
      const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || 'An employee';
      await this.notifications.notifyApprover({
        companyId: targetCompanyId,
        type: 'PERMISSION_REQUEST',
        title: `${name} requested ${duration} min permission`,
        message: `${date.toISOString().slice(0, 10)} • ${input.fromTime}–${input.toTime}`,
        referenceType: 'PERMISSION_REQUEST',
        referenceId: req.id,
        requesterEmployeeId: employee.id,
      });
    } catch {
      // Best-effort
    }

    return req;
  }

  async listMine(userId: string) {
    const { employeeId } = await this.employerOf(userId);
    if (!employeeId) return [];
    const reqs = await this.prisma.permissionRequest.findMany({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } },
            company: { select: { name: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const approverMap = await this.resolveApproverNames(reqs);
    return reqs.map((r) => ({ ...r, approverName: r.approvedBy ? (approverMap.get(r.approvedBy) ?? null) : null }));
  }

  async list(filters: {
    companyId: string;
    userId: string;
    status?: string;
    employeeId?: string;
    from?: string;
    to?: string;
    company?: string;
  }) {
    const groupWide = await isGroupWideUser(this.prisma, filters.userId);
    const where: any = {
      ...(groupWide ? {} : { companyId: filters.companyId }),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    };
    if (filters.status && filters.status !== 'all' && ['pending', 'approved', 'rejected', 'cancelled'].includes(filters.status)) {
      where.status = filters.status;
    }
    if (filters.from) {
      const f = startOfUtcDay(new Date(filters.from));
      if (!isNaN(f.getTime())) where.date = { ...(where.date ?? {}), gte: f };
    }
    if (filters.to) {
      const t = startOfUtcDay(new Date(filters.to));
      t.setUTCDate(t.getUTCDate() + 1);
      if (!isNaN(t.getTime())) where.date = { ...(where.date ?? {}), lt: t };
    }
    if (groupWide && filters.company) {
      where.company = { id: filters.company };
    }

    const reqs = await this.prisma.permissionRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } },
            company: { select: { name: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const approverMap = await this.resolveApproverNames(reqs);
    return reqs.map((r) => ({ ...r, approverName: r.approvedBy ? (approverMap.get(r.approvedBy) ?? null) : null }));
  }

  private async assertManageable(requestId: string, companyId: string, userId: string) {
    const groupWide = await isGroupWideUser(this.prisma, userId);
    const req = await this.prisma.permissionRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Permission request not found');
    if (!groupWide && req.employee.companyId !== companyId) {
      throw new ForbiddenException('Request does not belong to this company');
    }
    return { req, groupWide };
  }

  private async notifyEmployeeOfDecision(req: { companyId: string; employeeId: string; id: string }, title: string, message: string) {
    try {
      await this.notifications.notifyEmployee({
        companyId: req.companyId,
        type: 'PERMISSION_REQUEST',
        title,
        message,
        referenceType: 'PERMISSION_REQUEST',
        referenceId: req.id,
        employeeId: req.employeeId,
      });
    } catch {
      // Best-effort
    }
  }

  /** Excuse late/early punches that fall inside the approved permission window. */
  private async applyExcuse(req: any, timezone: string, approverId: string) {
    const windowStart = toTzInstant(timezone, req.date, req.fromTime);
    const windowEnd = toTzInstant(timezone, req.date, req.toTime);
    const logs = await this.prisma.attendanceLog.findMany({
      where: { employeeId: req.employeeId, date: req.date },
    });
    const targetCompanyId = req.employee?.companyId ?? req.companyId;

    for (const log of logs) {
      const updates: Record<string, any> = {};
      let excused = false;

      if (log.checkIn && log.checkIn >= windowStart && log.checkIn <= windowEnd) {
        if (log.lateStatus === 'late' || log.status === 'late') {
          updates.lateMinutes = 0;
          updates.lateStatus = 'on_time';
          updates.status = 'present';
          excused = true;
        }
      }
      if (log.checkOut && log.checkOut >= windowStart && log.checkOut <= windowEnd) {
        if (log.attendanceStatus === 'OFF_DAY_OR_INCOMPLETE' || log.attendanceStatus === null) {
          updates.attendanceStatus = 'FULL_DAY_PRESENT';
          updates.status = 'present';
          excused = true;
        }
      }

      if (excused) {
        await this.prisma.attendanceLog.update({
          where: { id: log.id },
          data: { ...updates, correctionOf: req.id },
        });
        await this.prisma.attendanceAudit.create({
          data: {
            companyId: targetCompanyId,
            employeeId: req.employeeId,
            attendanceLogId: log.id,
            action: 'PERMISSION_EXCUSED',
            fromValue: log.lateStatus ?? null,
            toValue: 'on_time',
            actorId: approverId,
            actorRole: 'hr',
            notes: `Approved permission window ${req.fromTime}–${req.toTime} excused in-window punch (in ${log.checkIn?.toISOString() ?? '—'}, out ${log.checkOut?.toISOString() ?? '—'}).`,
          },
        }).catch(() => undefined);
      }
    }
  }

  async approve(requestId: string, companyId: string, userId: string, note?: string) {
    const { req, groupWide } = await this.assertManageable(requestId, companyId, userId);
    if (req.status !== 'pending') throw new BadRequestException('Only pending requests can be approved');
    const requester = await this.employerOf(userId);
    if (!groupWide && requester.employeeId && requester.employeeId === req.employeeId) {
      throw new ForbiddenException('Employees cannot approve their own permission request');
    }

    const tz = (await this.prisma.company.findUnique({
      where: { id: req.employee.companyId || companyId },
      select: { timezone: true },
    }))?.timezone || 'UTC';

    await this.applyExcuse(req, tz, userId);

    const updated = await this.prisma.permissionRequest.update({
      where: { id: requestId },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: req.employee.companyId || companyId,
        userId,
        action: 'PERMISSION_APPROVED',
        entity: 'PERMISSION_REQUEST',
        entityId: updated.id,
        metadata: { minutes: req.minutes, fromTime: req.fromTime, toTime: req.toTime, note: note ?? null },
      },
    }).catch(() => undefined);

    await this.notifyEmployeeOfDecision(
      req,
      'Permission approved',
      `Your permission request for ${req.date.toISOString().slice(0, 10)} (${req.fromTime}–${req.toTime}) was approved.`,
    );

    return updated;
  }

  async reject(requestId: string, companyId: string, userId: string, reason: string) {
    const { req, groupWide } = await this.assertManageable(requestId, companyId, userId);
    if (req.status !== 'pending') throw new BadRequestException('Only pending requests can be rejected');
    const requester = await this.employerOf(userId);
    if (!groupWide && requester.employeeId && requester.employeeId === req.employeeId) {
      throw new ForbiddenException('Employees cannot reject their own permission request');
    }
    const rejectReason = (reason || '').trim();
    if (!rejectReason) throw new BadRequestException('Reject reason is required');

    const updated = await this.prisma.permissionRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', approvedBy: userId, rejectReason },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: req.employee.companyId || companyId,
        userId,
        action: 'PERMISSION_REJECTED',
        entity: 'PERMISSION_REQUEST',
        entityId: updated.id,
        metadata: { minutes: req.minutes, fromTime: req.fromTime, toTime: req.toTime, rejectReason },
      },
    }).catch(() => undefined);

    await this.notifyEmployeeOfDecision(
      req,
      'Permission rejected',
      `Your permission request for ${req.date.toISOString().slice(0, 10)} (${req.fromTime}–${req.toTime}) was rejected.${rejectReason ? ` Reason: ${rejectReason}` : ''}`,
    );

    return updated;
  }

  async cancel(requestId: string, companyId: string, userId: string) {
    const { req, groupWide } = await this.assertManageable(requestId, companyId, userId);
    const requester = await this.employerOf(userId);
    if (!groupWide && requester.employeeId && requester.employeeId !== req.employeeId) {
      throw new ForbiddenException('Cannot cancel another employee\u2019s permission request');
    }
    if (req.status !== 'pending') throw new BadRequestException('Only pending requests can be cancelled');

    const updated = await this.prisma.permissionRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', approvedBy: userId },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: req.employee.companyId || companyId,
        userId,
        action: 'PERMISSION_CANCELLED',
        entity: 'PERMISSION_REQUEST',
        entityId: updated.id,
        metadata: { minutes: req.minutes, fromTime: req.fromTime, toTime: req.toTime },
      },
    }).catch(() => undefined);

    return updated;
  }

  /** Report of per-company monthly licence usage for the super-admin command center. */
  async usageReport(userId: string, month?: string) {
    const groupWide = await isGroupWideUser(this.prisma, userId);
    if (!groupWide) throw new ForbiddenException('Only super admins can access the global permission report');
    const now = new Date();
    const y = month ? Number(month.slice(0, 4)) : now.getUTCFullYear();
    const m = month ? Number(month.slice(5, 7)) : now.getUTCMonth() + 1;
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 1));

    const requests = await this.prisma.permissionRequest.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, companyId: true, company: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const byCompany = new Map<string, { companyId: string; companyName: string; used: number; pending: number; approved: number; employees: Set<string> }>();
    for (const r of requests) {
      const e = r.employee;
      const cid = e.companyId;
      let bucket = byCompany.get(cid);
      if (!bucket) {
        bucket = { companyId: cid, companyName: e.company?.name ?? cid, used: 0, pending: 0, approved: 0, employees: new Set() };
        byCompany.set(cid, bucket);
      }
      if (r.status === 'pending' || r.status === 'approved') bucket.used += r.minutes;
      if (r.status === 'pending') bucket.pending++;
      if (r.status === 'approved') bucket.approved++;
      bucket.employees.add(e.employeeCode || e.id);
    }

    return {
      month: `${y}-${String(m).padStart(2, '0')}`,
      quotaPerEmployee: PERMISSION_MONTHLY_QUOTA_MINUTES,
      companies: [...byCompany.values()].map((b) => ({
        companyId: b.companyId,
        companyName: b.companyName,
        usedMinutes: b.used,
        quotaMinutes: PERMISSION_MONTHLY_QUOTA_MINUTES,
        pending: b.pending,
        approved: b.approved,
        employees: b.employees.size,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        companyId: r.employee.companyId,
        companyName: r.employee.company?.name,
        employeeId: r.employeeId,
        employeeCode: r.employee.employeeCode,
        employeeName: `${r.employee.firstName} ${r.employee.lastName || ''}`.trim(),
        date: r.date,
        fromTime: r.fromTime,
        toTime: r.toTime,
        minutes: r.minutes,
        reason: r.reason,
        status: r.status,
        rejectReason: r.rejectReason,
        createdAt: r.createdAt,
      })),
    };
  }
}