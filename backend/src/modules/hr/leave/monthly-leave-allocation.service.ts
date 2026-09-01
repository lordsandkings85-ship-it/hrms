import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
          OR: [
            { adminInfo: { is: { attendancePolicy: true } } },
            { adminInfo: { is: null } },
          ],
        },
        select: { id: true },
      });

      for (const monthMeta of months) {
        for (const employee of employees) {
          try {
            const allocatedNow = await this.allocateMonthForEmployee(
              company.id,
              employee.id,
              leaveType.id,
              monthMeta.year,
              monthMeta.month,
              monthlyAmount,
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
  ): Promise<boolean> {
    const existing = await this.prisma.leaveMonthlyBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year, month },
      },
    });
    if (existing && existing.allocated > 0) return false;
    if (!amount || amount <= 0) return false;

    // Opening balance for this month = remaining of the previous month (if any)
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prev = await this.prisma.leaveMonthlyBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year_month: { employeeId, leaveTypeId, year: prevYear, month: prevMonth },
      },
    });
    const opening = prev ? prev.remaining : 0;
    const carryForward = prev ? prev.remaining : 0;

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

        // Keep the annual balance consistent with the monthly allocations
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
          },
          update: { allotted: { increment: amount } },
          create: { employeeId, leaveTypeId, year, allotted: amount, used: 0 },
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
}