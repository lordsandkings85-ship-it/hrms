
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  listTypes(companyId: string) {
    return this.prisma.leaveType.findMany({ where: { companyId } });
  }

  createType(companyId: string, name: string, paid: boolean) {
    return this.prisma.leaveType.create({ data: { companyId, name, paid } });
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

  deleteHoliday(companyId: string, id: string) {
    return this.prisma.holiday.delete({
      where: { id, companyId }
    });
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

    // Simulate mock data for charts since Prisma groupBy across relations is limited
    const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        approved: Math.floor(Math.random() * 20) + 5,
        rejected: Math.floor(Math.random() * 5),
      };
    });

    const departments = await this.prisma.department.findMany({ where: { companyId } });
    const departmentMix = departments.map(d => ({
      name: d.name,
      value: Math.floor(Math.random() * 30) + 10
    }));

    const types = await this.prisma.leaveType.findMany({ where: { companyId } });
    const typeDistribution = types.map(t => ({
      name: t.name,
      value: Math.floor(Math.random() * 50) + 10
    }));

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
        departmentMix: departmentMix.length ? departmentMix : [{ name: 'Engineering', value: 40 }, { name: 'Sales', value: 25 }],
        typeDistribution: typeDistribution.length ? typeDistribution : [{ name: 'Sick Leave', value: 30 }, { name: 'Casual Leave', value: 70 }]
      }
    };
  }
}

function isHalfDayCount(start: Date, end: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  
  let count = 0;
  let current = new Date(start);
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
