import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/** True when the month/day of `date` matches the month/day of `today`. */
export function isSameMonthDay(date: Date, today: Date): boolean {
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

/**
 * True when `joiningDate` falls on the same month/day as `today` AND the employee
 * joined in a strictly earlier year (a real work anniversary, not a new joiner).
 */
export function isWorkAnniversaryToday(joiningDate: Date, today: Date): boolean {
  return (
    joiningDate.getMonth() === today.getMonth() &&
    joiningDate.getDate() === today.getDate() &&
    joiningDate.getFullYear() < today.getFullYear()
  );
}

/**
 * Daily auto-announcements for employee milestones (birthdays + work anniversaries).
 *
 * Every day at 09:00 the job scans active employees and, for anyone whose birthday
 * or work anniversary is today, creates:
 *   - a company-wide {@link Notification} (audience=COMPANY) seen in every user's
 *     notification bell + dashboard feed, and
 *   - an {@link Announcement} bulletin row so it also appears on the announcements page.
 *
 * Idempotency: a milestone already announced today (same employee + kind + date) is
 * skipped on re-runs, so the job may safely run more than once a day.
 */
@Injectable()
export class MilestoneAnnouncementsService {
  private readonly logger = new Logger(MilestoneAnnouncementsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleMilestones() {
    this.logger.log('Starting daily birthday/work-anniversary announcements...');
    try {
      const now = new Date();
      const result = await this.runForDate(now);
      this.logger.log(`Daily milestone announcements done: ${JSON.stringify(result)}`);
    } catch (e: any) {
      this.logger.error(`Daily milestone announcements failed: ${e?.message}`, e?.stack);
    }
  }

  /** Detect + announce today's birthdays and work anniversaries across all companies. */
  async runForDate(today: Date) {
    const companies = await this.prisma.company.findMany({ select: { id: true } });

    let birthdays = 0;
    let anniversaries = 0;
    let createdNotifications = 0;
    let createdAnnouncements = 0;

    for (const company of companies) {
      const employees = await this.prisma.employee.findMany({
        where: { companyId: company.id, status: 'active' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          joiningDate: true,
          dob: true,
        },
      });

      for (const emp of employees) {
        const name = `${emp.firstName} ${emp.lastName || ''}`.trim();

        const birthDate = emp.dob;
        if (birthDate && isSameMonthDay(birthDate, today)) {
          const yearsOld = this.ageOn(birthDate, today);
          await this.announceMilestone(company.id, emp.id, {
            kind: 'Birthday',
            name,
            title: `Happy Birthday to ${name}!`,
            message: `Today we celebrate ${name}'s birthday. Let's wish them a wonderful day!${yearsOld !== null ? ` (${yearsOld} years young)` : ''}`,
          });
          birthdays++;
        }

        if (emp.joiningDate && isWorkAnniversaryToday(emp.joiningDate, today)) {
          const years = today.getFullYear() - emp.joiningDate.getFullYear();
          await this.announceMilestone(company.id, emp.id, {
            kind: 'Anniversary',
            name,
            title: `Happy ${ordinal(years)} Work Anniversary to ${name}!`,
            message: `${name} has been with the company for ${years} year(s). Cheers to ${years} years of dedication!`,
          });
          anniversaries++;
        }
      }
    }

    // Count what was actually created this run (non-idempotent duplicates skipped).
    const counts = await this.countCreatedToday(today);
    createdNotifications = counts.notifications;
    createdAnnouncements = counts.announcements;

    return {
      birthdays,
      anniversaries,
      createdNotifications,
      createdAnnouncements,
      companiesSkipped: 0,
    };
  }

  /** Logically age in completed years at `today`. Null when a valid age can't be computed. */
  private ageOn(birthDate: Date, today: Date): number | null {
    let age = today.getFullYear() - birthDate.getFullYear();
    const beforeBirthday =
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
    if (beforeBirthday) age -= 1;
    return age >= 0 ? age : null;
  }

  /** Create a COMPANY notification + a bulletin announcement for one employee milestone. */
  private async announceMilestone(
    companyId: string,
    employeeId: string,
    m: { kind: 'Birthday' | 'Anniversary'; name: string; title: string; message: string },
  ) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        companyId,
        type: m.kind === 'Birthday' ? 'MILESTONE_BIRTHDAY' : 'MILESTONE_ANNIVERSARY',
        referenceType: 'EMPLOYEE',
        referenceId: employeeId,
        createdAt: { gte: startOfDay },
      },
    });

    if (!existingNotification) {
      try {
        await this.notifications.create({
          companyId,
          type: m.kind === 'Birthday' ? 'MILESTONE_BIRTHDAY' : 'MILESTONE_ANNIVERSARY',
          title: m.title,
          message: m.message,
          priority: 'normal',
          referenceType: 'EMPLOYEE',
          referenceId: employeeId,
          audience: 'COMPANY',
        });
      } catch (e: any) {
        this.logger.warn(`Failed to create milestone notification for ${m.name}: ${e?.message}`);
      }
    }

    const existingAnnouncement = await this.prisma.announcement.findFirst({
      where: {
        companyId,
        category: m.kind === 'Birthday' ? 'Birthday' : 'Anniversary',
        title: m.title,
        createdAt: { gte: startOfDay },
      },
    });

    if (!existingAnnouncement) {
      try {
        await this.prisma.announcement.create({
          data: {
            companyId,
            title: m.title,
            body: m.message,
            category: m.kind === 'Birthday' ? 'Birthday' : 'Anniversary',
            author: 'HR Team',
            isActive: true,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to create milestone announcement for ${m.name}: ${e?.message}`);
      }
    }
  }

  private async countCreatedToday(today: Date) {
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [notifications, announcements] = await Promise.all([
      this.prisma.notification.count({
        where: { createdAt: { gte: startOfDay }, type: { in: ['MILESTONE_BIRTHDAY', 'MILESTONE_ANNIVERSARY'] } },
      }),
      this.prisma.announcement.count({
        where: { createdAt: { gte: startOfDay }, category: { in: ['Birthday', 'Anniversary'] } },
      }),
    ]);
    return { notifications, announcements };
  }
}

/** 1st, 2nd, 3rd, 4th... ordinal suffix. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
