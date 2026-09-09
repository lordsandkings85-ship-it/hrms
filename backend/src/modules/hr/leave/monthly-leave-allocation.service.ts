import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

function isEmployeeJoinedByMonth(joiningDate: Date | string | null | undefined, year: number, month: number): boolean {
  if (!joiningDate) return true;
  const d = new Date(joiningDate);
  const jYear = d.getFullYear();
  const jMonth = d.getMonth() + 1;
  if (jYear > year) return false;
  if (jYear === year && jMonth > month) return false;
  return true;
}

function isHalfDayCount(start: Date, end: Date, isHalfDay: boolean, holidays?: { date: Date }[]): number {
  if (isHalfDay) return 0.5;
  let count = 0;
  const current = new Date(start);
  const endDate = new Date(end);
  current.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const holidayTimestamps = new Set(
    (holidays || []).map((h) => {
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );
  while (current <= endDate) {
    if (current.getDay() !== 0 && !holidayTimestamps.has(current.getTime())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(count, 0);
}

/**
 * Rule 4 — Monthly Casual Leave allocation with carry forward.
 *
 * Every eligible employee receives 1 Casual Leave per month (configurable via the
 * `custom.monthlyCasualLeaveAmount` attendance policy).
 *
 * Idempotency: allocation is keyed by (employeeId, leaveTypeId, year, month) on the
 * LeaveMonthlyBalance table plus a unique `uniqueKey` on the LeaveTransaction.
 * Re-running the job never double-allocates.
 */
@Injectable()
export class MonthlyLeaveAllocationService {
  private readonly logger = new Logger(MonthlyLeaveAllocationService.name);

  constructor(private prisma: PrismaService) {}

  // Self-healing scheduler: runs every 4 hours and is idempotent, so any month
  // missed (e.g. server was down on the 1st) gets backfilled automatically within
  // hours instead of being skipped forever. Allocations only create rows for months
  // that don't already exist — re-running never double-allocates.
  @Cron('0 0,4,8,12,16,20 * * *')
  async handleMonthlyCasualLeaveAllocation() {
    this.logger.log('Starting monthly Casual Leave allocation job (catch-up run)...');
    const now = new Date();
    try {
      const result = await this.runAllocation(now.getFullYear(), now.getMonth() + 1);
      this.logger.log(`Monthly Casual Leave allocation done: ${JSON.stringify(result)}`);
      if (result.allocated > 0) {
        this.logger.warn(`Caught up ${result.allocated} missed monthly Casual Leave allocation(s).`);
      }
    } catch (e: any) {
      this.logger.error(`Monthly Casual Leave allocation job failed: ${e?.message}`, e?.stack);
    }
  }

  /**
   * Allocate Casual Leave for a given month (and backfill any missing prior months).
   * Idempotent — safe to call repeatedly.
   */
  async runAllocation(year: number, month: number, companyId?: string) {
    const targetDate = new Date(year, month - 1, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;

    // Backfill window: from 24 months before target up to the target month,
    // so employees joining mid-year and previously-missed months get allocated only once.
    const monthCursor = new Date(year, month - 24, 1);
    const months: { year: number; month: number }[] = [];
    const cursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    while (cursor <= targetDate) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const companies = companyId
      ? [{ id: companyId }]
      : await this.prisma.company.findMany({ select: { id: true } });

    let allocated = 0;
    let companiesSkipped = 0;
    const errors: { companyId: string; employeeId: string; year: number; month: number; error: string }[] = [];
    let skipped = 0;

    for (const company of companies) {
      const policyMap = await this.getPolicyMap(company.id);
      if (policyMap.get('custom.monthlyCasualLeave') === 'false') {
        companiesSkipped++;
        continue;
      }
      const monthlyAmount = Number(policyMap.get('custom.monthlyCasualLeaveAmount') ?? 1);

      const leaveType = await this.getOrCreateCasualLeaveType(company.id);
      if (!leaveType) {
        this.logger.warn(`No Casual Leave type for company ${company.id}`);
        continue;
      }

      const employees = await this.prisma.employee.findMany({
        where: {
          companyId: company.id,
          status: 'active',
          isSystem: false,
          OR: [
            { adminInfo: { is: { attendancePolicy: true } } },
            { adminInfo: { is: null } },
          ],
        },
        select: { id: true, joiningDate: true },
      });

      for (const monthMeta of months) {
        for (const employee of employees) {
          if (!isEmployeeJoinedByMonth(employee.joiningDate, monthMeta.year, monthMeta.month)) {
            // Employee has not joined yet in this month — do not allocate
            continue;
          }
          try {
            const allocatedNow = await this.allocateMonthForEmployee(
              company.id,
              employee.id,
              leaveType.id,
              monthMeta.year,
              monthMeta.month,
              monthlyAmount,
              employee.joiningDate,
            );
            if (allocatedNow) allocated++;
            else skipped++;
          } catch (e: any) {
            // A single employee/month failure must not abort the whole company run.
            errors.push({
              companyId: company.id,
              employeeId: employee.id,
              year: monthMeta.year,
              month: monthMeta.month,
              error: e?.message || String(e),
            });
            this.logger.error(
              `Allocation failed for employee ${employee.id}, ${monthMeta.year}-${monthMeta.month}: ${e?.message}`,
            );
          }
        }
      }
    }

    return { targetYear, targetMonth, allocated, skipped, companiesSkipped, errors };
  }

  /** Allocate one month for one employee. Returns true when a new allocation was created. */
  private async allocateMonthForEmployee(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
    month: number,
    amount: number,
    employeeJoiningDate?: Date | null,
  ): Promise<boolean> {
    if (!isEmployeeJoinedByMonth(employeeJoiningDate, year, month)) {
      return false;
    }

    const existing = await this.prisma.leaveMonthlyBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year, month },
      },
    });
    if (existing && existing.allocated > 0) return false;
    if (!amount || amount <= 0) return false;

    // Opening balance for this month:
    // If month === 1 (January), reset opening balance to 0 for a clean new annual cycle
    let opening = 0;
    let carryForward = 0;
    if (month > 1) {
      const prev = await this.prisma.leaveMonthlyBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year, month: month - 1 },
        },
      });
      opening = prev ? prev.remaining : 0;
      carryForward = prev ? prev.remaining : 0;
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
        await tx.leaveMonthlyBalance.create({
          data: {
            companyId,
            employeeId,
            leaveTypeId,
            year,
            month,
            openingBalance: opening,
            allocated: amount,
            carryForward,
            taken: 0,
            pending: 0,
            cancelled: 0,
            adjusted: 0,
            remaining: opening + amount,
          },
        });

        await tx.leaveTransaction.create({
          data: {
            companyId,
            employeeId,
            leaveTypeId,
            year,
            type: 'MONTHLY_ALLOCATION',
            amount,
            uniqueKey: `MONTHLY_ALLOC_${employeeId}_${leaveTypeId}_${year}_${month}`,
            reason: `Monthly Casual Leave allocation for ${year}-${month}`,
          },
        });

        // Keep the annual balance consistent with the sum of monthly allocations in that year
        const totalAllocated = await tx.leaveMonthlyBalance.aggregate({
          where: { employeeId, leaveTypeId, year },
          _sum: { allocated: true },
        });
        const currentYearAllotted = totalAllocated._sum.allocated ?? amount;

        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
          },
          update: { allotted: currentYearAllotted },
          create: { employeeId, leaveTypeId, year, allotted: currentYearAllotted, used: 0 },
        });
      },
        { timeout: 60000, maxWait: 20000 },
      );
      return true;
    } catch (e: any) {
      // P2002 = unique constraint -> already allocated (idempotent run)
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  /** Find the Casual Leave type for a company, creating it when missing. */
  private async getOrCreateCasualLeaveType(companyId: string) {
    const existing = await this.prisma.leaveType.findFirst({
      where: { companyId, OR: [{ code: 'CL' }, { name: { contains: 'Casual Leave' } }] },
    });
    if (existing) return existing;
    return this.prisma.leaveType.create({
      data: {
        companyId,
        code: 'CL',
        name: 'Casual Leave',
        paid: true,
        carryForward: true,
        negativeBalanceAllowed: false,
        halfDayAllowed: true,
      },
    });
  }

  private async getPolicyMap(companyId: string) {
    const policies = await this.prisma.attendancePolicy.findMany({ where: { companyId } });
    return new Map(policies.map(p => [p.key, p.value]));
  }

  /**
   * Report the last casual-leave allocation status for a company so admins can see
   * whether the monthly job actually ran for the current month.
   */
  async getAllocationStatus(companyId: string) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { companyId, OR: [{ code: 'CL' }, { name: { contains: 'Casual Leave' } }] },
    });
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let lastRun: Date | null = null;
    if (leaveType) {
      const lastTx = await this.prisma.leaveTransaction.findFirst({
        where: { companyId, leaveTypeId: leaveType.id, type: 'MONTHLY_ALLOCATION' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, year: true },
      });
      lastRun = lastTx?.createdAt ?? null;
    }

    // Whether the current month's allocation row exists for any eligible employee
    const currentMonthAllocated = await this.prisma.leaveMonthlyBalance.count({
      where: { companyId, year: currentYear, month: currentMonth, allocated: { gt: 0 } },
    });

    return {
      lastRun,
      currentYear,
      currentMonth,
      currentMonthAllocated,
      currentMonthCredited: currentMonthAllocated > 0,
    };
  }

  /**
   * Recalibrate leave balances across all employees or for a specific company.
   * Cleans up pre-joining records, computes accurate monthly allocations,
   * calculates exact used/pending days from approved/pending LeaveRequests,
   * and synchronizes annual LeaveBalance rows.
   */
  async recalibrateAllBalances(companyId?: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const holidays = await this.prisma.holiday.findMany({ select: { date: true, companyId: true } });
    const leaveTypes = await this.prisma.leaveType.findMany();

    const employees = await this.prisma.employee.findMany({
      where: {
        isSystem: false,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        leaveBalances: { include: { leaveType: true } },
        leaveRequest: { include: { leaveType: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    let recalibratedCount = 0;

    for (const emp of employees) {
      if (!emp.joiningDate) continue;
      const jDate = new Date(emp.joiningDate);
      const jYear = jDate.getFullYear();
      const jMonth = jDate.getMonth() + 1;

      const clType = leaveTypes.find(t => t.companyId === emp.companyId && (t.code === 'CL' || t.name.includes('Casual Leave')));
      if (!clType) continue;

      // 1. Delete invalid monthly balances before joining date
      const monthlyBalances = await this.prisma.leaveMonthlyBalance.findMany({
        where: { employeeId: emp.id },
      });
      const invalidMonthlyIds = monthlyBalances
        .filter(mb => mb.year < jYear || (mb.year === jYear && mb.month < jMonth))
        .map(mb => mb.id);
      if (invalidMonthlyIds.length > 0) {
        await this.prisma.leaveMonthlyBalance.deleteMany({
          where: { id: { in: invalidMonthlyIds } },
        });
      }

      // 2. Delete invalid annual balances before joining year
      const invalidAnnualIds = emp.leaveBalances
        .filter(b => b.year < jYear)
        .map(b => b.id);
      if (invalidAnnualIds.length > 0) {
        await this.prisma.leaveBalance.deleteMany({
          where: { id: { in: invalidAnnualIds } },
        });
      }

      // 3. Compute accurate monthly balances
      let prevRemaining = 0;
      const computedMonthly: any[] = [];
      const empHolidays = holidays.filter(h => h.companyId === emp.companyId);

      for (let y = jYear; y <= currentYear; y++) {
        const startM = (y === jYear) ? jMonth : 1;
        const endM = (y === currentYear) ? currentMonth : 12;

        for (let m = startM; m <= endM; m++) {
          const opening = (m === startM || m === 1) ? 0 : prevRemaining;
          const carryForward = opening;
          const allocated = 1;

          const monthStart = new Date(y, m - 1, 1);
          const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

          const approvedRequestsThisMonth = emp.leaveRequest.filter(r => {
            if (r.status !== 'approved' || r.leaveTypeId !== clType.id) return false;
            const rStart = new Date(r.startDate);
            return rStart >= monthStart && rStart <= monthEnd;
          });
          let takenThisMonth = 0;
          for (const req of approvedRequestsThisMonth) {
            takenThisMonth += isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, empHolidays);
          }

          const pendingRequestsThisMonth = emp.leaveRequest.filter(r => {
            if (r.status !== 'pending' || r.leaveTypeId !== clType.id) return false;
            const rStart = new Date(r.startDate);
            return rStart >= monthStart && rStart <= monthEnd;
          });
          let pendingThisMonth = 0;
          for (const req of pendingRequestsThisMonth) {
            pendingThisMonth += isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, empHolidays);
          }

          const remaining = Math.max(0, opening + allocated - takenThisMonth - pendingThisMonth);
          prevRemaining = remaining;

          computedMonthly.push({
            companyId: emp.companyId,
            employeeId: emp.id,
            leaveTypeId: clType.id,
            year: y,
            month: m,
            openingBalance: opening,
            allocated,
            carryForward,
            taken: takenThisMonth,
            pending: pendingThisMonth,
            cancelled: 0,
            adjusted: 0,
            remaining,
          });
        }
      }

      for (const cm of computedMonthly) {
        await this.prisma.leaveMonthlyBalance.upsert({
          where: {
            employeeId_leaveTypeId_year_month: {
              employeeId: cm.employeeId,
              leaveTypeId: cm.leaveTypeId,
              year: cm.year,
              month: cm.month,
            },
          },
          update: cm,
          create: cm,
        });
      }

      // 4. Compute Annual Leave Balances for all leave types and active years
      for (let y = jYear; y <= currentYear; y++) {
        const monthlyForYear = computedMonthly.filter(m => m.year === y);
        const totalAllottedCL = monthlyForYear.reduce((sum, m) => sum + m.allocated, 0);

        const yearStart = new Date(y, 0, 1);
        const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);

        const approvedCLRequests = emp.leaveRequest.filter(r => {
          if (r.status !== 'approved' || r.leaveTypeId !== clType.id) return false;
          const rStart = new Date(r.startDate);
          return rStart >= yearStart && rStart <= yearEnd;
        });
        let totalUsedCL = 0;
        for (const req of approvedCLRequests) {
          totalUsedCL += isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, empHolidays);
        }

        const pendingCLRequests = emp.leaveRequest.filter(r => {
          if (r.status !== 'pending' || r.leaveTypeId !== clType.id) return false;
          const rStart = new Date(r.startDate);
          return rStart >= yearStart && rStart <= yearEnd;
        });
        let totalPendingCL = 0;
        for (const req of pendingCLRequests) {
          totalPendingCL += isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, empHolidays);
        }

        await this.prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: emp.id,
              leaveTypeId: clType.id,
              year: y,
            },
          },
          update: {
            allotted: totalAllottedCL,
            used: totalUsedCL,
            pending: totalPendingCL,
            carriedOver: 0,
            encashed: 0,
          },
          create: {
            employeeId: emp.id,
            leaveTypeId: clType.id,
            year: y,
            allotted: totalAllottedCL,
            used: totalUsedCL,
            pending: totalPendingCL,
            carriedOver: 0,
            encashed: 0,
          },
        });

        // Other leave types (e.g. Compensatory Off)
        const otherBalances = emp.leaveBalances.filter(b => b.year === y && b.leaveTypeId !== clType.id);
        for (const ob of otherBalances) {
          const approvedOtherRequests = emp.leaveRequest.filter(r => {
            if (r.status !== 'approved' || r.leaveTypeId !== ob.leaveTypeId) return false;
            const rStart = new Date(r.startDate);
            return rStart >= yearStart && rStart <= yearEnd;
          });
          let usedOther = 0;
          for (const req of approvedOtherRequests) {
            usedOther += isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, empHolidays);
          }

          const pendingOtherRequests = emp.leaveRequest.filter(r => {
            if (r.status !== 'pending' || r.leaveTypeId !== ob.leaveTypeId) return false;
            const rStart = new Date(r.startDate);
            return rStart >= yearStart && rStart <= yearEnd;
          });
          let pendingOther = 0;
          for (const req of pendingOtherRequests) {
            pendingOther += isHalfDayCount(req.startDate, req.endDate, req.isHalfDay, empHolidays);
          }

          await this.prisma.leaveBalance.update({
            where: { id: ob.id },
            data: {
              used: usedOther,
              pending: pendingOther,
            },
          });
        }
      }

      recalibratedCount++;
    }

    // Clean up any system employee balances
    const systemEmployees = await this.prisma.employee.findMany({ where: { isSystem: true }, select: { id: true } });
    if (systemEmployees.length > 0) {
      const sysIds = systemEmployees.map(s => s.id);
      await this.prisma.leaveMonthlyBalance.deleteMany({ where: { employeeId: { in: sysIds } } });
      await this.prisma.leaveBalance.deleteMany({ where: { employeeId: { in: sysIds } } });
    }

    return {
      success: true,
      employeesRecalibrated: recalibratedCount,
      totalEmployees: employees.length,
    };
  }
}