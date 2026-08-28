
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  listTypes(companyId: string) {
    return this.prisma.leaveType.findMany({ where: { companyId } });
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
  ) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new ForbiddenException('Employee does not belong to this company');
    if (!leaveTypeId || !startDate || !endDate) throw new BadRequestException('leaveTypeId, startDate and endDate are required');
    const type = await this.prisma.leaveType.findFirst({ where: { id: leaveTypeId, companyId } });
    if (!type) throw new NotFoundException('Leave type not found');

    const start = new Date(startDate);
    const year = start.getFullYear();
    const month = start.getMonth() + 1;

    // Rule 4 — monthly Casual Leave accounting: reserve pending days and check balance
    if (await this.hasMonthlyBalance(employeeId, leaveTypeId, year)) {
      const days = isHalfDayCount(start, new Date(endDate), isHalfDay);
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
      await this.prisma.$transaction((tx) =>
        this.updateMonthlyBalanceTx(tx, companyId, employeeId, leaveTypeId, year, month, { pending: days }),
      );
      return request;
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isHalfDay,
        reason,
      },
    });
  }

async approve(id: string, companyId: string, approverId: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true }
    });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.employee.companyId !== companyId) throw new ForbiddenException('Leave request does not belong to this company');
    if (req.status !== 'pending') throw new Error('Leave request is already processed');

    let days = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);

    // Fetch holidays once for reuse in exclusion + attendance log creation
    const holidays = await this.prisma.holiday.findMany({
      where: {
        companyId: req.employee.companyId,
        date: { gte: req.startDate, lte: req.endDate },
      },
    });

    // Holiday Exclusion (Exclude non-Sunday holidays)
    if (!req.isHalfDay) {
      let holidayCount = 0;
      for (const h of holidays) {
        if (h.date.getDay() !== 0) holidayCount++;
      }
      days = Math.max(0, days - holidayCount);
    }

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

    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  async reject(id: string, companyId: string, approverId: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.employee.companyId !== companyId) throw new ForbiddenException('Leave request does not belong to this company');
    if (req.status !== 'pending') throw new Error('Leave request is already processed');

    const year = req.startDate.getFullYear();
    const month = req.startDate.getMonth() + 1;
    const monthlyActive = await this.hasMonthlyBalance(req.employeeId, req.leaveTypeId, year);
    const reservedDays = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);

    return this.prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: { status: 'rejected', approverId },
      });
      if (monthlyActive) {
        // Release the pending reservation (do not count rejected leave)
        await this.updateMonthlyBalanceTx(tx, companyId, req.employeeId, req.leaveTypeId, year, month, { pending: -reservedDays });
      }
    });
  }

  /**
   * Cancel a leave request. Pending requests are cancelled immediately.
   * Approved requests create a LeaveCancellationRequest for HR approval.
   */
  async cancel(id: string, userId: string, reason?: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!req) throw new NotFoundException('Leave request not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (req.employee.companyId !== user?.companyId) {
      throw new ForbiddenException('Leave request does not belong to your company');
    }
    if (user?.employeeId && user.employeeId !== req.employeeId) {
      throw new ForbiddenException('Cannot cancel another employee\'s leave request');
    }
    if (req.status === 'pending') {
      const year = req.startDate.getFullYear();
      const month = req.startDate.getMonth() + 1;
      const monthlyActive = await this.hasMonthlyBalance(req.employeeId, req.leaveTypeId, year);
      const reservedDays = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);
      return this.prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({
          where: { id },
          data: { status: 'cancelled', approverId: userId },
        });
        if (monthlyActive) {
          // Release the reservation and record the cancellation in the monthly ledger
          await this.updateMonthlyBalanceTx(tx, req.employee.companyId, req.employeeId, req.leaveTypeId, year, month, { pending: -reservedDays, cancelled: reservedDays });
        }
      });
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

  async listCancellations(companyId: string) {
    return this.prisma.leaveCancellationRequest.findMany({
      where: { companyId },
      include: {
        leaveRequest: { include: { leaveType: true } },
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveCancellation(id: string, companyId: string, approverId: string) {
    const cancel = await this.prisma.leaveCancellationRequest.findUnique({
      where: { id },
      include: { leaveRequest: true, employee: true },
    });
    if (!cancel) throw new NotFoundException('Cancellation request not found');
    if (cancel.employee.companyId !== companyId) throw new ForbiddenException('Cancellation request does not belong to this company');
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

    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  async rejectCancellation(id: string, companyId: string, approverId: string) {
    const cancel = await this.prisma.leaveCancellationRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!cancel) throw new NotFoundException('Cancellation request not found');
    if (cancel.employee.companyId !== companyId) throw new ForbiddenException('Cancellation request does not belong to this company');
    if (cancel.status !== 'pending') throw new Error('Cancellation request already processed');
    return this.prisma.leaveCancellationRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId },
    });
  }

async listForEmployee(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPendingForCompany(companyId: string) {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { employee: { companyId }, status: 'pending' },
      include: {
        leaveType: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Attach a computed duration (in days) so the UI doesn't have to guess.
    return rows.map((r) => ({
      ...r,
      duration: isHalfDayCount(r.startDate, r.endDate, r.isHalfDay),
    }));
  }

async balances(employeeId: string, year: number, companyId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    return this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }

  // Company-wide balance grid used by the HR "Employee Leave Balances" tab.
  async balancesOverview(
    companyId: string,
    year: number,
    filters: { departmentId?: string; leaveTypeId?: string; search?: string },
  ) {
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
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

    return employees.map((e) => ({
      employeeId: e.id,
      employeeCode: e.employeeCode,
      name: `${e.firstName} ${e.lastName}`,
      department: e.department?.name || '-',
      balances: e.leaveBalances.map((b) => ({
        leaveType: b.leaveType.name,
        allotted: b.allotted,
        used: b.used,
        carriedOver: b.carriedOver,
        encashed: b.encashed,
        pending: b.pending,
        remaining: Math.max(0, b.allotted + b.carriedOver - b.used - b.encashed),
      })),
    }));
  }

  // All leave requests for a company (used by the Reports tab), with optional filters.
  listAllForCompany(
    companyId: string,
    filters: { departmentId?: string; status?: string; year?: number },
  ) {
    return this.prisma.leaveRequest.findMany({
      where: {
        employee: {
          companyId,
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        },
        ...(filters.status ? { status: filters.status } : {}),
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
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  listHolidays(companyId: string) {
    return this.prisma.holiday.findMany({
      where: { companyId },
      orderBy: { date: 'asc' }
    });
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
    const employee = await this.prisma.employee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const type = await this.prisma.leaveType.findFirst({ where: { id: data.leaveTypeId, companyId } });
    if (!type) throw new NotFoundException('Leave type not found');

    const upsert = this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
      update: { allotted: { increment: data.amount } },
      create: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year: data.year,
        allotted: data.amount,
        used: 0,
      },
    });

    const transaction = this.prisma.leaveTransaction.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
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

  async transactions(companyId: string, employeeId: string, year?: number) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
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
  }

  /** Rule 4 — monthly balance ledger for an employee (optionally filtered by year) */
  async monthlyBalances(employeeId: string, companyId: string, year?: number) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
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
    const result = await this.prisma.leaveRequest.updateMany({
      where: { id: { in: ids }, status: 'pending', employee: { companyId } },
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

  async analytics(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const totalEmployees = await this.prisma.employee.count({
      where: { companyId, status: 'active' }
    });

    const pendingRequests = await this.prisma.leaveRequest.count({
      where: { employee: { companyId }, status: 'pending' }
    });

    const approvedThisMonth = await this.prisma.leaveRequest.count({
      where: { 
        employee: { companyId }, 
        status: 'approved',
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const rejectedThisMonth = await this.prisma.leaveRequest.count({
      where: { 
        employee: { companyId }, 
        status: 'rejected',
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const upcomingHolidays = await this.prisma.holiday.findMany({
      where: { companyId, date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 5
    });

    // Leave balance alerts: employees with 2 or fewer days remaining on any leave type.
    const currentYearBalances = await this.prisma.leaveBalance.findMany({
      where: { year: now.getFullYear(), employee: { companyId, status: 'active' } },
    });
    const lowBalanceEmployeeIds = new Set(
      currentYearBalances.filter((b) => b.allotted - b.used <= 2).map((b) => b.employeeId),
    );
    const leaveBalanceAlerts = lowBalanceEmployeeIds.size;

    // We can simulate today's on-leave based on the date range
    const onLeaveToday = await this.prisma.leaveRequest.count({
      where: {
        employee: { companyId },
        status: 'approved',
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });

    // Real monthly trend and breakdown for last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const leaveRequestsLast6Months = await this.prisma.leaveRequest.findMany({
      where: {
        employee: { companyId },
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

function isHalfDayCount(start: Date, end: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  
  let count = 0;
  const current = new Date(start);
  const endDate = new Date(end);
  
  // Reset times to compare dates safely
  current.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    // 0 is Sunday
    if (current.getDay() !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return Math.max(count, 1);
}

