import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceService } from './attendance.service';

/** Nightly job that persists an absent AttendanceLog row for every active employee
 *  who did not check in on a working day, plus a one-time backfill of the current
 *  month on boot. Both are idempotent (employees with any log for a date are skipped). */
@Injectable()
export class AttendanceAutoMarkService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceAutoMarkService.name);

  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_11PM, { name: 'attendance-auto-mark-absent' })
  async markToday() {
    await this.markAllCompanies(new Date());
  }

  async onModuleInit() {
    try {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      if (from.getTime() <= to.getTime()) {
        await this.runBackfill(from, to);
      }
    } catch (err) {
      this.logger.error(`Absent backfill init failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Backfill absent rows for every calendar day between `from` and `to` (inclusive),
   *  for every company that has active non-system employees. */
  async runBackfill(from: Date, to: Date) {
    for (const { companyId } of await this.activeCompanies()) {
      try {
        for (let d = new Date(from); d.getTime() <= to.getTime(); d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
          const { marked } = await this.attendance.markAbsentForDate(companyId, d, {
            notes: 'Current month absent backfill',
          });
          if (marked > 0) {
            this.logger.log(`Backfill: ${companyId} ${d.toISOString().slice(0, 10)} marked ${marked}`);
          }
        }
      } catch (err) {
        this.logger.error(`Backfill failed for company ${companyId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async markAllCompanies(day: Date) {
    for (const { companyId } of await this.activeCompanies()) {
      try {
        const { marked } = await this.attendance.markAbsentForDate(companyId, day);
        if (marked > 0) {
          this.logger.log(`Auto-mark absent: ${companyId} ${day.toISOString().slice(0, 10)} marked ${marked}`);
        }
      } catch (err) {
        this.logger.error(`Auto-mark absent failed for company ${companyId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async activeCompanies() {
    return this.prisma.employee.findMany({
      where: { status: 'active', isSystem: false },
      distinct: ['companyId'],
      select: { companyId: true },
    });
  }
}