
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  listTypes(companyId: string) {
    return this.prisma.leaveType.findMany({ where: { companyId } });
  }

  createType(companyId: string, name: string, paid: boolean) {
    return this.prisma.leaveType.create({ data: { companyId, name, paid } });
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

  apply(
    employeeId: string,
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    reason?: string,
  ) {
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

  async approve(id: string, approverId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ 
      where: { id },
      include: { employee: true }
    });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.status !== 'pending') throw new Error('Leave request is already processed');

    let days = isHalfDayCount(req.startDate, req.endDate, req.isHalfDay);

    // Holiday Exclusion (Exclude non-Sunday holidays)
    if (!req.isHalfDay) {
      const holidays = await this.prisma.holiday.findMany({
        where: {
          companyId: req.employee.companyId,
          date: { gte: req.startDate, lte: req.endDate },
        },
      });
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

    await this.prisma.leaveBalance.upsert({
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

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'approved', approverId },
    });
  }

  async reject(id: string, approverId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.status !== 'pending') throw new Error('Leave request is already processed');

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'rejected', approverId },
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
    if (req.status === 'pending') {
      return this.prisma.leaveRequest.update({
        where: { id },
        data: { status: 'cancelled', approverId: userId },
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

  async approveCancellation(id: string, approverId: string) {
    const cancel = await this.prisma.leaveCancellationRequest.findUnique({
      where: { id },
      include: { leaveRequest: true },
    });
    if (!cancel) throw new NotFoundException('Cancellation request not found');
    if (cancel.status !== 'pending') throw new Error('Cancellation request already processed');

    await this.prisma.$transaction([
      this.prisma.leaveCancellationRequest.update({
        where: { id },
        data: { status: 'approved', approvedBy: approverId },
      }),
      this.prisma.leaveRequest.update({
        where: { id: cancel.leaveRequestId },
        data: { status: 'cancelled', approverId },
      }),
    ]);

    // Restore leave balance if the leave was approved and counted
    const leave = cancel.leaveRequest;
    if (leave.status === 'approved') {
      const days = isHalfDayCount(leave.startDate, leave.endDate, leave.isHalfDay);
      await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: leave.employeeId,
            leaveTypeId: leave.leaveTypeId,
            year: leave.startDate.getFullYear(),
          },
        },
        update: { used: { decrement: days } },
        create: {
          employeeId: leave.employeeId,
          leaveTypeId: leave.leaveTypeId,
          year: leave.startDate.getFullYear(),
          allotted: 0,
          used: 0,
        },
      });
    }
    return cancel;
  }

  async rejectCancellation(id: string, approverId: string) {
    const cancel = await this.prisma.leaveCancellationRequest.findUnique({ where: { id } });
    if (!cancel) throw new NotFoundException('Cancellation request not found');
    if (cancel.status !== 'pending') throw new Error('Cancellation request already processed');
    return this.prisma.leaveCancellationRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId },
    });
  }

  listForEmployee(employeeId: string) {
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

  balances(employeeId: string, year: number) {
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
        remaining: Math.max(0, b.allotted - b.used),
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

  // --- PHASE 4: Enterprise Leave Features ---

  async bulkApprove(ids: string[], approverId: string) {
    let count = 0;
    for (const id of ids) {
      try {
        await this.approve(id, approverId);
        count++;
      } catch (e) {
        console.error(`Failed to approve ${id}`, e);
      }
    }
    return { count };
  }

  async bulkReject(ids: string[], approverId: string) {
    const result = await this.prisma.leaveRequest.updateMany({
      where: { id: { in: ids }, status: 'pending' },
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

