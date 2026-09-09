
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async listTypes(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let types = await this.prisma.leaveType.findMany({ where: { companyId } });
    if (types.length === 0 || groupWide) {
      const allTypes = await this.prisma.leaveType.findMany({});
      // If groupWide, deduplicate by normalized name and code to prevent UI redundancy
      const seen = new Map<string, typeof allTypes[0]>();
      for (const t of allTypes) {
        const key = `${(t.name || '').trim().toLowerCase()}_${(t.code || '').trim().toLowerCase()}`;
        if (!seen.has(key) || t.companyId === companyId) {
          seen.set(key, t);
        }
      }
      types = Array.from(seen.values());
    }
    return types;
  }

  createType(companyId: string, data: { name: string; paid: boolean; code?: string; accrualRate?: number; annualAllocation?: number; maxConsecutiveDays?: number; halfDayAllowed?: boolean; carryForward?: boolean; carryForwardLimit?: number; encashment?: boolean; negativeBalanceAllowed?: boolean; attachmentRequired?: boolean; applicableAfterDays?: number; approvalRequired?: boolean; gender?: string }) {
    return this.prisma.leaveType.create({ data: { companyId, ...data } });
  }

  async updateType(companyId: string, id: string, data: Record<string, any>) {
    const type = await this.prisma.leaveType.findFirst({ where: { id, companyId } });
    if (!type) throw new NotFoundException('Leave type not found');
    const allowed = ['code', 'name', 'paid', 'isActive', 'accrualRate', 'annualAllocation', 'maxConsecutiveDays', 'halfDayAllowed', 'carryForward', 'carryForwardLimit', 'encashment', 'negativeBalanceAllowed', 'attachmentRequired', 'applicableAfterDays', 'approvalRequired', 'gender'];
    const updateData: Record<string, any> = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    return this.prisma.leaveType.update({ where: { id }, data: updateData });
  }

  async deleteType(companyId: string, id: string) {
    const type = await this.prisma.leaveType.findFirst({ where: { id, companyId } });
    if (!type) throw new NotFoundException('Leave type not found');
    return this.prisma.$transaction([
      this.prisma.leaveBalance.deleteMany({ where: { leaveTypeId: id } }),
      this.prisma.leaveRequest.deleteMany({ where: { leaveTypeId: id } }),
      this.prisma.leaveType.delete({ where: { id } }),
    ]);
  }

  async apply(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    reason?: string,
    userId?: string,
  ) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
    });
    if (!employee) {
      employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    }
    if (!employee) throw new ForbiddenException('Employee not found');
    if (!leaveTypeId || !startDate || !endDate) throw new BadRequestException('leaveTypeId, startDate and endDate are required');

    const targetCompanyId = employee.companyId || companyId;

    let type = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!type) {
      type = await this.prisma.leaveType.findFirst({
        where: { companyId: targetCompanyId },
      });
    } else if (type.companyId !== targetCompanyId) {
      // Find matching leave type by code or name in employee's company
      const matchingType = await this.prisma.leaveType.findFirst({
        where: {
          companyId: targetCompanyId,
          OR: [
            ...(type.code ? [{ code: type.code }] : []),
            { name: type.name },
            { name: { contains: type.name } },
          ],
        },
      });
      if (matchingType) {
        type = matchingType;
        leaveTypeId = matchingType.id;
      }
    }
    if (!type) throw new NotFoundException('Leave type not found');

    const start = new Date(startDate);
    const year = start.getFullYear();
    const month = start.getMonth() + 1;

    // Rule 4 — monthly Casual Leave accounting: reserve pending days and check balance
    if (await this.hasMonthlyBalance(employeeId, leaveTypeId, year)) {
      let holidays = await this.prisma.holiday.findMany({
        where: groupWide ? {} : { companyId: targetCompanyId },
        select: { date: true },
      });
      if (holidays.length === 0 && !groupWide) {
        holidays = await this.prisma.holiday.findMany({ select: { date: true } });
      }
      const days = isHalfDayCount(start, new Date(endDate), isHalfDay, holidays);
      if (type.negativeBalanceAllowed !== true) {
        const row = await this.prisma.leaveMonthlyBalance.findUnique({
          where: { employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year, month } },
        });
        if (row && row.remaining < days) {
          throw new BadRequestException(`Insufficient ${type.name} balance for the selected dates`);
        }
      }
      const request = await this.prisma.leaveRequest.create({
        data: {
          employeeId,
          leaveTypeId,
          startDate: start,
          endDate: new Date(endDate),
          isHalfDay,
          reason,
        },
      });
      await this.prisma.$transaction(
        (tx) =>
          this.updateMonthlyBalanceTx(tx, targetCompanyId, employeeId, leaveTypeId, year, month, { pending: days }),
        { timeout: 60000, maxWait: 20000 },
      );
      void this.notifyLeaveApplied(targetCompanyId, employee, type.name, start, new Date(endDate), request.id);
      return request;
    }

    const created = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isHalfDay,
        reason,
      },
    });
    void this.notifyLeaveApplied(targetCompanyId, employee, type.name, new Date(startDate), new Date(endDate), created.id);
    return created;
  }

  private async notifyLeaveApplied(
    companyId: string,
    employee: { id: string; firstName?: string; lastName?: string },
    leaveTypeName: string,
    startDate: Date,
    endDate: Date,
    requestId: string,
  ) {
    try {
      const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || 'An employee';
      const range = startDate.toDateString() === endDate.toDateString()
        ? startDate.toDateString()
        : `${startDate.toDateString()} – ${endDate.toDateString()}`;
      await this.notifications.notifyApprover({
        companyId,
        type: 'LEAVE',
        title: `${name} requested ${leaveTypeName} leave (${range})`,
        message: `Leave request is awaiting approval.`,
        referenceType: 'LEAVE_REQUEST',
        referenceId: requestId,
        requesterEmployeeId: employee.id,
      });
    } catch {
      // Best-effort; never fail the leave apply because of a notification.
    }
  }

  async approve(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true }
    });
    if (!req) throw new NotFoundException('Leave request not found');
    if (!groupWide && req.employee.companyId !== companyId) throw new ForbiddenException('Leave request does not belong to this company');
    if (req.status !== 'pending') throw new BadRequestException('Leave request is already processed');

    // Fetch holidays once for reuse in exclusion + attendance log creation
    let holidays = await this.prisma.holiday.findMany({
      where: {
        companyId: req.employee.companyId,
        date: { gte: req.startDate, lte: req.endDate },
      },
      select: { date: true },
    });
    if (holidays.length === 0) {
      holidays = await this.prisma.holiday.findMany({
        where: {
          date: { gte: req.startDate, lte: req.endDate },
        },
        select: { date: true },
      });
    }

    let days = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, holidays);

    // Sandwich Rule detection across separate requests
    // If applying for a Monday (day 1), check if previous Friday (day 5) was a leave.
    const startDay = req.startDate.getDay();
    if (startDay === 1) { // Monday
      const lastFriday = new Date(req.startDate);
      lastFriday.setDate(lastFriday.getDate() - 3);
      
      const startOfLastFriday = new Date(lastFriday);
      startOfLastFriday.setHours(0,0,0,0);
      const endOfLastFriday = new Date(lastFriday);
      endOfLastFriday.setHours(23,59,59,999);
      
      const adjacentLeave = await this.prisma.leaveRequest.findFirst({
        where: {
          employeeId: req.employeeId,
          status: 'approved',
          endDate: {
            gte: startOfLastFriday,
            lte: endOfLastFriday
          }
        }
      });
      if (adjacentLeave) {
        // Sandwich detected: Add Saturday and Sunday
        days += 2;
      }
    }

    // Build AttendanceLog entries for each approved day (so payroll won't charge LOP)
    const onLeaveLogs: any[] = [];
    if (days > 0) {
      const d = new Date(req.startDate);
      const end = new Date(req.endDate);
      d.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (d <= end) {
        if (d.getDay() !== 0) {
          // Skip dates that fall on a company holiday
          const isHoliday = holidays.some((h) => {
            const hd = new Date(h.date);
            hd.setHours(0, 0, 0, 0);
            return hd.getTime() === d.getTime();
          });
          if (!isHoliday) {
            onLeaveLogs.push({
              employeeId: req.employeeId,
              date: new Date(d),
              status: 'on_leave',
              method: 'leave_approved',
            });
          }
        }
        d.setDate(d.getDate() + 1);
      }
    }

    // Rule 4 — monthly ledger sync for monthly-allocated leave types
    const year = req.startDate.getFullYear();
    const month = req.startDate.getMonth() + 1;
    const monthlyActive = await this.hasMonthlyBalance(req.employeeId, req.leaveTypeId, year);
    const reservedDays = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: req.employeeId,
              leaveTypeId: req.leaveTypeId,
              year: req.startDate.getFullYear(),
            },
          },
          update: { used: { increment: days } },
          create: {
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            year: req.startDate.getFullYear(),
            allotted: 0,
            used: days,
          },
        });
        await tx.leaveRequest.update({
          where: { id },
          data: { status: 'approved', approverId },
        });
        await tx.leaveTransaction.create({
          data: {
            companyId,
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            year: req.startDate.getFullYear(),
            type: 'LEAVE_TAKEN',
            amount: days,
            reason: `Approved ${days} day(s) of leave`,
            approvedBy: approverId,
            leaveRequestId: id,
          },
        });
        if (onLeaveLogs.length > 0) {
          await tx.attendanceLog.createMany({ data: onLeaveLogs });
        }
        if (monthlyActive) {
          await this.updateMonthlyBalanceTx(tx, companyId, req.employeeId, req.leaveTypeId, year, month, { pending: -reservedDays, taken: days });
        }
        return { id, status: 'approved' };
      },
      { timeout: 60000, maxWait: 20000 },
    ).then(async (res) => {
      await this.notifyEmployeeLeaveDecision(companyId, req, id, 'approved');
      return res;
    });
  }

  private async notifyEmployeeLeaveDecision(
    companyId: string,
    req: { employee: { id: string; firstName?: string; lastName?: string } },
    requestId: string,
    decision: 'approved' | 'rejected',
  ) {
    try {
      const name = `${req.employee.firstName ?? ''} ${req.employee.lastName ?? ''}`.trim() || 'Your request';
      await this.notifications.notifyEmployee({
        companyId,
        type: 'LEAVE',
        title: `Your leave request was ${decision}`,
        message: name,
        referenceType: 'LEAVE_REQUEST',
        referenceId: requestId,
        employeeId: req.employee.id,
      });
    } catch {
      // Best-effort
    }
  }

  async reject(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Leave request not found');
    if (!groupWide && req.employee.companyId !== companyId) throw new ForbiddenException('Leave request does not belong to this company');
    if (req.status !== 'pending') throw new BadRequestException('Leave request is already processed');

    const targetCompanyId = req.employee.companyId || companyId;
    const year = req.startDate.getFullYear();
    const month = req.startDate.getMonth() + 1;
    const monthlyActive = await this.hasMonthlyBalance(req.employeeId, req.leaveTypeId, year);
    const reservedDays = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.leaveRequest.update({
          where: { id },
          data: { status: 'rejected', approverId },
        });
        if (monthlyActive) {
          // Release the pending reservation (do not count rejected leave)
          await this.updateMonthlyBalanceTx(tx, targetCompanyId, req.employeeId, req.leaveTypeId, year, month, { pending: -reservedDays });
        }
        return { id, status: 'rejected' };
      },
      { timeout: 60000, maxWait: 20000 },
    ).then(async (res) => {
      await this.notifyEmployeeLeaveDecision(targetCompanyId, req, id, 'rejected');
      return res;
    });
  }

  /**
   * Cancel a leave request. Pending requests are cancelled immediately.
   * Approved requests create a LeaveCancellationRequest for HR approval.
   */
  async cancel(id: string, userId: string, reason?: string) {
    const groupWide = await isGroupWideUser(this.prisma, userId);
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Leave request not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!groupWide && req.employee.companyId !== user?.companyId) {
      throw new ForbiddenException('Leave request does not belong to your company');
    }
    if (!groupWide && user?.employeeId && user.employeeId !== req.employeeId) {
      throw new ForbiddenException('Cannot cancel another employee\'s leave request');
    }
    if (req.status === 'pending') {
      const year = req.startDate.getFullYear();
      const month = req.startDate.getMonth() + 1;
      const monthlyActive = await this.hasMonthlyBalance(req.employeeId, req.leaveTypeId, year);
      const reservedDays = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);
      return this.prisma.$transaction(
        async (tx) => {
          await tx.leaveRequest.update({
            where: { id },
            data: { status: 'cancelled', approverId: userId },
          });
          if (monthlyActive) {
            // Release the reservation and record the cancellation in the monthly ledger
            await this.updateMonthlyBalanceTx(tx, req.employee.companyId, req.employeeId, req.leaveTypeId, year, month, { pending: -reservedDays, cancelled: reservedDays });
          }
        },
        { timeout: 60000, maxWait: 20000 },
      );
    }
    if (req.status !== 'approved') {
      throw new Error('Only pending or approved leave requests can be cancelled');
    }

    const existing = await this.prisma.leaveCancellationRequest.findFirst({
      where: { leaveRequestId: id, status: 'pending' },
    });
    if (existing) return existing;

    return this.prisma.leaveCancellationRequest.create({
      data: {
        companyId: req.employee.companyId,
        leaveRequestId: id,
        employeeId: req.employeeId,
        reason,
      },
    });
  }

  async listCancellations(companyId: string, status?: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const rows = await this.prisma.leaveCancellationRequest.findMany({
      where: {
        ...(groupWide ? {} : { companyId }),
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        leaveRequest: { include: { leaveType: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { name: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Flatten leave fields so UI queues can render without digging into nested relations.
    return rows.map((r) => ({
      ...r,
      leaveType: r.leaveRequest?.leaveType?.name ?? null,
      startDate: r.leaveRequest?.startDate ?? null,
      endDate: r.leaveRequest?.endDate ?? null,
      isHalfDay: r.leaveRequest?.isHalfDay ?? false,
      days: r.leaveRequest ? isHalfDayCount(r.leaveRequest.startDate, r.leaveRequest.endDate, r.leaveRequest.isHalfDay) : 0,
      leaveReason: r.leaveRequest?.reason ?? null,
    }));
  }

  async approveCancellation(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const cancel = await this.prisma.leaveCancellationRequest.findUnique({
      where: { id },
      include: { leaveRequest: true, employee: true },
    });
    if (!cancel) throw new NotFoundException('Cancellation request not found');
    if (!groupWide && cancel.employee.companyId !== companyId) throw new ForbiddenException('Cancellation request does not belong to this company');
    if (cancel.status !== 'pending') throw new Error('Cancellation request already processed');

    // Restore leave balance if the leave was approved and counted.
    // Re-apply holiday exclusion (same logic as approve) but NOT sandwich rule
    // because sandwich penalty was additive on approval — canceling the Monday
    // leave doesn't restore Sat/Sun (those belong to the adjacent Friday leave).
    const leave = cancel.leaveRequest;
    let restoreDays = 0;
    if (leave.status === 'approved') {
      restoreDays = isHalfDayCount(leave.startDate, leave.endDate, leave.isHalfDay);
      if (!leave.isHalfDay) {
        const holidays = await this.prisma.holiday.findMany({
          where: {
            companyId: cancel.employee.companyId,
            date: { gte: leave.startDate, lte: leave.endDate },
          },
        });
        let holidayCount = 0;
        for (const h of holidays) {
          if (h.date.getDay() !== 0) holidayCount++;
        }
        restoreDays = Math.max(0, restoreDays - holidayCount);
      }
    }

    const year = leave.startDate.getFullYear();
    const month = leave.startDate.getMonth() + 1;
    const monthlyActive = await this.hasMonthlyBalance(leave.employeeId, leave.leaveTypeId, year);

    // Delete on_leave AttendanceLog records for the leave dates.
    // Expand range to full UTC days to handle timezone differences
    // (e.g. midnight IST = 18:30 UTC previous day).
    const deleteStart = new Date(leave.startDate);
    deleteStart.setUTCHours(0, 0, 0, 0);
    deleteStart.setDate(deleteStart.getDate() - 1);
    const deleteEnd = new Date(leave.endDate);
    deleteEnd.setUTCHours(23, 59, 59, 999);
    deleteEnd.setDate(deleteEnd.getDate() + 1);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.leaveCancellationRequest.update({
          where: { id },
          data: { status: 'approved', approvedBy: approverId },
        });
        await tx.leaveRequest.update({
          where: { id: cancel.leaveRequestId },
          data: { status: 'cancelled', approverId },
        });

        if (leave.status === 'approved' && restoreDays > 0) {
          await tx.leaveBalance.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: leave.employeeId,
                leaveTypeId: leave.leaveTypeId,
                year: leave.startDate.getFullYear(),
              },
            },
            update: { used: { decrement: restoreDays } },
            create: {
              employeeId: leave.employeeId,
              leaveTypeId: leave.leaveTypeId,
              year: leave.startDate.getFullYear(),
              allotted: 0,
              used: 0,
            },
          });
          await tx.leaveTransaction.create({
            data: {
              companyId,
              employeeId: leave.employeeId,
              leaveTypeId: leave.leaveTypeId,
              year: leave.startDate.getFullYear(),
              type: 'CANCELLATION_CREDIT',
              amount: restoreDays,
              reason: `Cancellation approved — ${restoreDays} day(s) restored`,
              approvedBy: approverId,
              leaveRequestId: cancel.leaveRequestId,
            },
          });
        }

        await tx.attendanceLog.deleteMany({
          where: {
            employeeId: leave.employeeId,
            status: 'on_leave',
            date: { gte: deleteStart, lte: deleteEnd },
          },
        });

        if (monthlyActive && restoreDays > 0) {
          // Restore availability in the monthly ledger and keep an audit trail
          await this.updateMonthlyBalanceTx(tx, companyId, leave.employeeId, leave.leaveTypeId, year, month, { taken: -restoreDays, cancelled: restoreDays });
        }
      },
      { timeout: 60000, maxWait: 20000 },
    );
  }

  async rejectCancellation(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const cancel = await this.prisma.leaveCancellationRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!cancel) throw new NotFoundException('Cancellation request not found');
    if (!groupWide && cancel.employee.companyId !== companyId) throw new ForbiddenException('Cancellation request does not belong to this company');
    if (cancel.status !== 'pending') throw new Error('Cancellation request already processed');
    return this.prisma.leaveCancellationRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId },
    });
  }

  async listForEmployee(employeeId: string, companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: {
        leaveType: true,
        cancellations: {
          where: { status: 'pending' },
          select: { id: true, status: true, createdAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    }).then((rows) => rows.map((r) => ({ ...r, cancellationPending: r.cancellations?.[0] ?? null })));
  }

  async listPendingForCompany(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        ...(groupWide ? { employee: { isSystem: false } } : { employee: { companyId, isSystem: false } }),
        status: 'pending',
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { name: true, displayName: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    let holidays = await this.prisma.holiday.findMany({
      where: groupWide ? {} : { companyId },
      select: { date: true },
    });
    if (holidays.length === 0 && !groupWide) {
      holidays = await this.prisma.holiday.findMany({ select: { date: true } });
    }
    // Attach a computed duration (in days) so the UI doesn't have to guess.
    return rows.map((r) => ({
      ...r,
      duration: isHalfDayCount(r.startDate, r.endDate, r.isHalfDay, holidays),
    }));
  }

  async balances(employeeId: string, year: number, companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
    });
    if (!employee) {
      employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    }
    if (!employee) throw new NotFoundException('Employee not found');
    const rows = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
      orderBy: { leaveType: { name: 'asc' } },
    });

    // Deduplicate by leave type name / code to ensure each leave category appears only once
    const seen = new Map<string, (typeof rows)[0]>();
    for (const row of rows) {
      const typeKey = (row.leaveType?.name || row.leaveType?.code || row.leaveTypeId || '').toLowerCase().trim();
      if (!seen.has(typeKey)) {
        seen.set(typeKey, { ...row });
      } else {
        const existing = seen.get(typeKey)!;
        existing.used = Math.max(existing.used, row.used);
        existing.allotted = Math.max(existing.allotted, row.allotted);
      }
    }
    return Array.from(seen.values()).map((r) => ({
      ...r,
      remaining: Math.max(0, r.allotted + r.carriedOver - r.used - r.pending - r.encashed),
    }));
  }

  // Company-wide balance grid used by the HR "Employee Leave Balances" tab.
  async balancesOverview(
    companyId: string,
    year: number,
    filters: { departmentId?: string; leaveTypeId?: string; search?: string },
    userId?: string,
  ) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const employees = await this.prisma.employee.findMany({
      where: {
        ...(groupWide ? { isSystem: false } : { companyId, isSystem: false }),
        status: 'active',
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.search
          ? {
              OR: [
                { firstName: { contains: filters.search } },
                { lastName: { contains: filters.search } },
                { employeeCode: { contains: filters.search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        department: { select: { name: true } },
        company: { select: { name: true, displayName: true } },
        leaveBalances: {
          where: {
            year,
            ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
          },
          include: { leaveType: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return employees.map((e) => {
      // Deduplicate balances by leave type name
      const seenBalances = new Map<string, any>();
      for (const b of e.leaveBalances) {
        const typeKey = (b.leaveType?.name || b.leaveType?.code || b.leaveTypeId || '').toLowerCase().trim();
        const mapped = {
          id: b.id,
          leaveType: b.leaveType.name,
          allotted: b.allotted,
          used: b.used,
          carriedOver: b.carriedOver,
          encashed: b.encashed,
          pending: b.pending,
          remaining: Math.max(0, b.allotted + b.carriedOver - b.used - b.pending - b.encashed),
        };
        if (!seenBalances.has(typeKey)) {
          seenBalances.set(typeKey, mapped);
        } else {
          const existing = seenBalances.get(typeKey);
          existing.allotted = Math.max(existing.allotted, mapped.allotted);
          existing.used = Math.max(existing.used, mapped.used);
          existing.pending = Math.max(existing.pending, mapped.pending);
          existing.remaining = Math.max(0, existing.allotted + existing.carriedOver - existing.used - existing.pending - existing.encashed);
        }
      }

      return {
        employeeId: e.id,
        employeeCode: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        department: e.department?.name || '-',
        company: e.company?.displayName || e.company?.name || '-',
        balances: Array.from(seenBalances.values()),
      };
    });
  }

  // All leave requests for a company (used by the Reports tab), with optional filters.
  async listAllForCompany(
    companyId: string,
    filters: { departmentId?: string; status?: string; year?: number },
    userId?: string,
  ) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return this.prisma.leaveRequest.findMany({
      where: {
        employee: {
          ...(groupWide ? { isSystem: false } : { companyId, isSystem: false }),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        },
        ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
        ...(filters.year
          ? {
              startDate: {
                gte: new Date(filters.year, 0, 1),
                lte: new Date(filters.year, 11, 31, 23, 59, 59),
              },
            }
          : {}),
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { name: true, displayName: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async listHolidays(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let holidays = await this.prisma.holiday.findMany({
      where: groupWide ? {} : { companyId },
      orderBy: { date: 'asc' },
    });
    if (holidays.length === 0 && !groupWide) {
      holidays = await this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    }
    return holidays;
  }

  createHoliday(companyId: string, name: string, date: string) {
    return this.prisma.holiday.create({
      data: { companyId, name, date: new Date(date) }
    });
  }

  async deleteHoliday(companyId: string, id: string) {
    const existing = await this.prisma.holiday.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Holiday not found');
    return this.prisma.holiday.delete({ where: { id } });
  }

  // --- Leave Balance Allocation ---

  async adjustBalance(companyId: string, data: { employeeId: string; leaveTypeId: string; year: number; amount: number; reason?: string }, approvedBy: string) {
    let employee = await this.prisma.employee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) {
      employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
    }
    if (!employee) throw new NotFoundException('Employee not found');
    const targetCompanyId = employee.companyId || companyId;

    let type = await this.prisma.leaveType.findFirst({ where: { id: data.leaveTypeId, companyId: targetCompanyId } });
    if (!type) {
      type = await this.prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } });
    }
    if (!type) throw new NotFoundException('Leave type not found');
    const leaveTypeId = type.id;

    const upsert = this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: data.employeeId,
          leaveTypeId,
          year: data.year,
        },
      },
      update: { allotted: { increment: data.amount } },
      create: {
        employeeId: data.employeeId,
        leaveTypeId,
        year: data.year,
        allotted: data.amount,
        used: 0,
      },
    });

    const transaction = this.prisma.leaveTransaction.create({
      data: {
        companyId: targetCompanyId,
        employeeId: data.employeeId,
        leaveTypeId,
        year: data.year,
        type: 'ALLOCATION',
        amount: data.amount,
        reason: data.reason || `Admin allocation of ${data.amount} days`,
        approvedBy,
      },
    });

    const [balance] = await this.prisma.$transaction([upsert, transaction]);
    return balance;
  }

  async bulkAllocate(companyId: string, data: { employeeIds: string[]; leaveTypeId: string; year: number; amount: number; reason?: string }, approvedBy: string) {
    const type = await this.prisma.leaveType.findFirst({ where: { id: data.leaveTypeId, companyId } });
    if (!type) throw new NotFoundException('Leave type not found');

    const results: { employeeId: string; success: boolean; error?: string }[] = [];

    for (const empId of data.employeeIds) {
      try {
        await this.adjustBalance(companyId, {
          employeeId: empId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
          amount: data.amount,
          reason: data.reason || `Bulk allocation of ${data.amount} days`,
        }, approvedBy);
        results.push({ employeeId: empId, success: true });
      } catch (e: any) {
        results.push({ employeeId: empId, success: false, error: e.message });
      }
    }

    return { total: data.employeeIds.length, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  }

  /**
   * Set absolute annual balance values for an existing LeaveBalance row.
   * Always writes a MANUAL_ADJUSTMENT transaction + audit entry, and for
   * monthly-tracked (Rule 4) leave types also mirrors arbitrary admin edits
   * into the monthly ledger so the two views stay consistent.
   */
  async updateBalance(
    companyId: string,
    id: string,
    data: { allotted?: number; used?: number; carriedOver?: number; encashed?: number; reason?: string },
    approvedBy: string,
  ) {
    if (!data.reason || !data.reason.trim()) throw new BadRequestException('Reason is required');
    const editReason = data.reason.trim();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { id },
      include: {
        employee: { select: { companyId: true } },
        leaveType: { select: { id: true, name: true } },
      },
    });
    if (!balance || balance.employee.companyId !== companyId) throw new NotFoundException('Leave balance not found');

    const before = {
      allotted: balance.allotted,
      used: balance.used,
      carriedOver: balance.carriedOver,
      encashed: balance.encashed,
    };
    const after: typeof before = { ...before };
    for (const key of ['allotted', 'used', 'carriedOver', 'encashed'] as const) {
      if (data[key] === undefined) continue;
      const val = Number(data[key]);
      if (!Number.isFinite(val) || val < 0) throw new BadRequestException(`${key} must be a non-negative number`);
      after[key] = val;
    }
    if (before.allotted === after.allotted && before.used === after.used && before.carriedOver === after.carriedOver && before.encashed === after.encashed) {
      throw new BadRequestException('No changes detected');
    }

    // Latest month present for this employee + type + year (determines monthly-tracked types under Rule 4)
    const monthlyRows = await this.prisma.leaveMonthlyBalance.findMany({
      where: { employeeId: balance.employeeId, leaveTypeId: balance.leaveTypeId, year: balance.year },
      orderBy: { month: 'desc' },
      take: 1,
    });

    const netDays =
      (after.allotted + after.carriedOver - after.used - after.encashed) -
      (before.allotted + before.carriedOver - before.used - before.encashed);

    return this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.leaveBalance.update({
          where: { id },
          data: { allotted: after.allotted, used: after.used, carriedOver: after.carriedOver, encashed: after.encashed },
          include: { leaveType: { select: { id: true, name: true } }, employee: { select: { employeeCode: true } } },
        });

        const changeParts: string[] = [];
        for (const key of ['allotted', 'used', 'carriedOver', 'encashed'] as const) {
          if (after[key] !== before[key]) changeParts.push(`${key}: ${before[key]} -> ${after[key]}`);
        }
        await tx.leaveTransaction.create({
          data: {
            companyId,
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            year: balance.year,
            type: 'MANUAL_ADJUSTMENT',
            amount: netDays,
            reason: editReason,
            approvedBy,
          },
        });

        // Keep the monthly ledger consistent for monthly-tracked leave types
        if (monthlyRows.length > 0) {
          await this.updateMonthlyBalanceTx(tx, companyId, balance.employeeId, balance.leaveTypeId, balance.year, monthlyRows[0].month, {
            adjusted: after.allotted - before.allotted,
            taken: after.used - before.used,
          });
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: approvedBy,
            action: 'LEAVE_BALANCE_UPDATE',
            entity: 'LeaveBalance',
            entityId: id,
            metadata: { before, after, changes: changeParts, reason: editReason },
          },
        });

        return updated;
      },
      { timeout: 60000, maxWait: 20000 },
    );
  }

  /**
   * Delete an annual LeaveBalance row (and any matching monthly-ledger rows for
   * the same employee + type + year) plus an audit entry.
   */
  async deleteBalance(companyId: string, id: string, approvedBy: string) {
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { id },
      include: {
        employee: { select: { companyId: true } },
        leaveType: { select: { id: true, name: true } },
      },
    });
    if (!balance || balance.employee.companyId !== companyId) throw new NotFoundException('Leave balance not found');

    await this.prisma.$transaction(
      async (tx) => {
        await tx.leaveMonthlyBalance.deleteMany({
          where: { employeeId: balance.employeeId, leaveTypeId: balance.leaveTypeId, year: balance.year },
        });
        await tx.leaveBalance.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            companyId,
            userId: approvedBy,
            action: 'LEAVE_BALANCE_DELETE',
            entity: 'LeaveBalance',
            entityId: id,
            metadata: {
              employeeId: balance.employeeId,
              leaveType: balance.leaveType?.name,
              year: balance.year,
              allotted: balance.allotted,
              used: balance.used,
              carriedOver: balance.carriedOver,
              encashed: balance.encashed,
            },
          },
        });
      },
      { timeout: 60000, maxWait: 20000 },
    );

    return { success: true, id };
  }

  async transactions(companyId: string, employeeId: string, year?: number, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.leaveTransaction.findMany({
      where: {
        employeeId,
        ...(year ? { year } : {}),
      },
      include: { leaveType: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Monthly Casual Leave Ledger (Rule 4) ---

  /** True when the monthly ledger is active for this employee + leave type + year */
  private async hasMonthlyBalance(employeeId: string, leaveTypeId: string, year: number) {
    return (await this.prisma.leaveMonthlyBalance.count({
      where: { employeeId, leaveTypeId, year },
    })) > 0;
  }

  /**
   * Adjust a monthly balance row inside a transaction and recompute its remaining.
   * `cancelled` is kept as an audit trail; it does not reduce availability
   * (cancellation restores the days), while `taken` and `pending` do.
   */
  private async updateMonthlyBalanceTx(
    tx: any,
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
    month: number,
    changes: { taken?: number; pending?: number; cancelled?: number; adjusted?: number },
  ) {
    const where = { employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year, month } };
    const row = await tx.leaveMonthlyBalance.findUnique({ where });
    if (!row) return;
    const taken = Math.max(0, row.taken + (changes.taken ?? 0));
    const pending = Math.max(0, row.pending + (changes.pending ?? 0));
    const cancelled = Math.max(0, row.cancelled + (changes.cancelled ?? 0));
    const adjusted = row.adjusted + (changes.adjusted ?? 0);
    const remaining = Math.max(0, row.openingBalance + row.allocated + adjusted - taken - pending);
    await tx.leaveMonthlyBalance.update({ where, data: { taken, pending, cancelled, adjusted, remaining } });

    // Cascade carry forward to subsequent months of the same year
    let prevRemaining = remaining;
    for (let m = month + 1; m <= 12; m++) {
      const nextWhere = { employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year, month: m } };
      const nextRow = await tx.leaveMonthlyBalance.findUnique({ where: nextWhere });
      if (!nextRow) break;
      const nextRemaining = Math.max(0, prevRemaining + nextRow.allocated + nextRow.adjusted - nextRow.taken - nextRow.pending);
      await tx.leaveMonthlyBalance.update({
        where: nextWhere,
        data: {
          openingBalance: prevRemaining,
          carryForward: prevRemaining,
          remaining: nextRemaining,
        },
      });
      prevRemaining = nextRemaining;
    }
  }

  /** Rule 4 — monthly balance ledger for an employee (optionally filtered by year) */
  async monthlyBalances(employeeId: string, companyId: string, year?: number, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId } : { id: employeeId, companyId },
    });
    if (!employee) {
      employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    }
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.leaveMonthlyBalance.findMany({
      where: { employeeId, ...(year ? { year } : {}) },
      include: { leaveType: { select: { id: true, name: true, code: true } } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }

  // --- Leave Year CRUD ---

  listLeaveYears(companyId: string) {
    return this.prisma.leaveYear.findMany({ where: { companyId }, orderBy: { startDate: 'desc' } });
  }

  async createLeaveYear(companyId: string, data: { name: string; startDate: string; endDate: string }) {
    if (data.startDate >= data.endDate) throw new BadRequestException('startDate must be before endDate');
    return this.prisma.leaveYear.create({
      data: { companyId, name: data.name, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
    });
  }

  async updateLeaveYear(companyId: string, id: string, data: { isActive?: boolean; carryForwardProcessed?: boolean }) {
    const ly = await this.prisma.leaveYear.findFirst({ where: { id, companyId } });
    if (!ly) throw new NotFoundException('Leave year not found');
    if (data.isActive) {
      await this.prisma.leaveYear.updateMany({ where: { companyId, isActive: true }, data: { isActive: false } });
    }
    return this.prisma.leaveYear.update({ where: { id }, data });
  }

  async deleteLeaveYear(companyId: string, id: string) {
    const ly = await this.prisma.leaveYear.findFirst({ where: { id, companyId } });
    if (!ly) throw new NotFoundException('Leave year not found');
    return this.prisma.leaveYear.delete({ where: { id } });
  }

  // --- Carry Forward ---

  async processCarryForward(companyId: string, fromYearId: string, approvedBy: string) {
    const fromYear = await this.prisma.leaveYear.findFirst({ where: { id: fromYearId, companyId } });
    if (!fromYear) throw new NotFoundException('Source leave year not found');
    if (fromYear.carryForwardProcessed) throw new BadRequestException('Carry forward already processed for this year');

    const toYearName = `${parseInt(fromYear.name) + 1}`;
    let toYear = await this.prisma.leaveYear.findFirst({ where: { companyId, name: toYearName } });
    if (!toYear) {
      const nextStart = new Date(fromYear.endDate);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);
      toYear = await this.prisma.leaveYear.create({
        data: { companyId, name: toYearName, startDate: nextStart, endDate: nextEnd },
      });
    }

    const fromYearNum = parseInt(fromYear.name);
    const toYearNum = parseInt(toYearName);

    const eligibleTypes = await this.prisma.leaveType.findMany({
      where: { companyId, carryForward: true, isActive: true },
    });

    if (eligibleTypes.length === 0) {
      await this.prisma.leaveYear.update({ where: { id: fromYearId }, data: { carryForwardProcessed: true } });
      return { carried: 0, message: 'No leave types eligible for carry forward' };
    }

    const typeIds = eligibleTypes.map(t => t.id);
    const balances = await this.prisma.leaveBalance.findMany({
      where: { employee: { companyId }, year: fromYearNum, leaveTypeId: { in: typeIds } },
    });

    let carried = 0;
    for (const bal of balances) {
      const remaining = Math.max(0, bal.allotted - bal.used);
      if (remaining <= 0) continue;
      const type = eligibleTypes.find(t => t.id === bal.leaveTypeId);
      const maxCarry = type?.carryForwardLimit ?? remaining;
      const carryAmount = Math.min(remaining, maxCarry);
      if (carryAmount <= 0) continue;

      await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: { employeeId: bal.employeeId, leaveTypeId: bal.leaveTypeId, year: toYearNum },
        },
        update: { carriedOver: { increment: carryAmount } },
        create: { employeeId: bal.employeeId, leaveTypeId: bal.leaveTypeId, year: toYearNum, allotted: 0, used: 0, carriedOver: carryAmount },
      });

      await this.prisma.leaveTransaction.create({
        data: { companyId, employeeId: bal.employeeId, leaveTypeId: bal.leaveTypeId, year: toYearNum, type: 'CARRY_FORWARD', amount: carryAmount, reason: `Carry forward from ${fromYear.name}`, approvedBy },
      });

      carried++;
    }

    await this.prisma.leaveYear.update({ where: { id: fromYearId }, data: { carryForwardProcessed: true } });
    return { carried, message: `Carried forward ${carried} balance records` };
  }

  // --- PHASE 4: Enterprise Leave Features ---

  async bulkApprove(ids: string[], companyId: string, approverId: string) {
    let count = 0;
    for (const id of ids) {
      try {
        await this.approve(id, companyId, approverId);
        count++;
      } catch (e) {
        console.error(`Failed to approve ${id}`, e);
      }
    }
    return { count };
  }

  async bulkReject(ids: string[], companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const result = await this.prisma.leaveRequest.updateMany({
      where: {
        id: { in: ids },
        status: 'pending',
        ...(groupWide ? {} : { employee: { companyId } }),
      },
      data: { status: 'rejected', approverId },
    });
    return { count: result.count };
  }

  async getPolicies(companyId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { companyId_key: { companyId, key: 'LEAVE_POLICIES' } }
    });
    return setting ? setting.value : null;
  }

  async setPolicies(companyId: string, policies: any) {
    return this.prisma.setting.upsert({
      where: { companyId_key: { companyId, key: 'LEAVE_POLICIES' } },
      update: { value: policies },
      create: { companyId, key: 'LEAVE_POLICIES', value: policies }
    });
  }

  async analytics(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const totalEmployees = await this.prisma.employee.count({
      where: groupWide ? { isSystem: false, status: 'active' } : { companyId, status: 'active' }
    });

    const pendingRequests = await this.prisma.leaveRequest.count({
      where: {
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false },
        status: 'pending',
      }
    });

    const approvedThisMonth = await this.prisma.leaveRequest.count({
      where: { 
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false }, 
        status: 'approved',
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const rejectedThisMonth = await this.prisma.leaveRequest.count({
      where: { 
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false }, 
        status: 'rejected',
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const upcomingHolidays = await this.prisma.holiday.findMany({
      where: {
        ...(groupWide ? {} : { companyId }),
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
      take: 5
    });

    // Leave balance alerts: employees with 2 or fewer days remaining on any leave type.
    const currentYearBalances = await this.prisma.leaveBalance.findMany({
      where: {
        year: now.getFullYear(),
        employee: groupWide ? { isSystem: false, status: 'active' } : { companyId, status: 'active' },
      },
    });
    const lowBalanceEmployeeIds = new Set(
      currentYearBalances.filter((b) => b.allotted - b.used <= 2).map((b) => b.employeeId),
    );
    const leaveBalanceAlerts = lowBalanceEmployeeIds.size;

    // We can simulate today's on-leave based on the date range
    const onLeaveToday = await this.prisma.leaveRequest.count({
      where: {
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false },
        status: 'approved',
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });

    // Real monthly trend and breakdown for last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const leaveRequestsLast6Months = await this.prisma.leaveRequest.findMany({
      where: {
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false },
        startDate: { gte: sixMonthsAgo }
      },
      select: {
        startDate: true,
        status: true,
        leaveType: { select: { name: true } },
        employee: { select: { department: { select: { name: true } } } }
      }
    });

    const monthlyTrendMap: Record<string, { month: string; approved: number; rejected: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleDateString('en-US', { month: 'short' });
      monthlyTrendMap[mStr] = { month: mStr, approved: 0, rejected: 0 };
    }

    const deptLeaveMap: Record<string, number> = {};
    const typeLeaveMap: Record<string, number> = {};

    for (const req of leaveRequestsLast6Months) {
      const mStr = req.startDate.toLocaleDateString('en-US', { month: 'short' });
      if (monthlyTrendMap[mStr]) {
        if (req.status === 'approved') monthlyTrendMap[mStr].approved++;
        else if (req.status === 'rejected') monthlyTrendMap[mStr].rejected++;
      }

      if (req.status === 'approved') {
        const deptName = req.employee?.department?.name || 'General';
        deptLeaveMap[deptName] = (deptLeaveMap[deptName] || 0) + 1;

        const typeName = req.leaveType?.name || 'Leave';
        typeLeaveMap[typeName] = (typeLeaveMap[typeName] || 0) + 1;
      }
    }

    const monthlyTrend = Object.values(monthlyTrendMap);
    const departmentMix = Object.entries(deptLeaveMap).map(([name, value]) => ({ name, value }));
    const typeDistribution = Object.entries(typeLeaveMap).map(([name, value]) => ({ name, value }));

    return {
      summary: {
        totalEmployees,
        onLeaveToday,
        pendingRequests,
        approvedThisMonth,
        rejectedThisMonth,
        upcomingHolidays,
        leaveBalanceAlerts,
      },
      charts: {
        monthlyTrend,
        departmentMix,
        typeDistribution
      }
    };
  }
}

function isHalfDayCount(start: Date, end: Date, isHalfDay: boolean, holidays?: { date: Date }[]): number {
  if (isHalfDay) return 0.5;
  
  let count = 0;
  const current = new Date(start);
  const endDate = new Date(end);
  
  // Reset times to compare dates safely
  current.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const holidayTimestamps = new Set(
    (holidays || []).map((h) => {
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  
  while (current <= endDate) {
    // 0 is Sunday
    if (current.getDay() !== 0 && !holidayTimestamps.has(current.getTime())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return Math.max(count, 0);
}

