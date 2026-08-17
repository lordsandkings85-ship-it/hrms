import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/** Default billable hourly rate used when the company has no TIMESHEET_HOURLY_RATE
 *  setting configured. Admins can override per company via the Setting table. */
const DEFAULT_HOURLY_RATE = 100;

@Injectable()
export class TimesheetsService {
  constructor(private prisma: PrismaService) {}
  submit(employeeId: string, date: string, hours: number, projectId?: string) {
    return this.prisma.timesheet.create({ data: { employeeId, date: new Date(date), hours, projectId } });
  }
  listForEmployee(employeeId: string) {
    return this.prisma.timesheet.findMany({ where: { employeeId }, include: { project: true }, orderBy: { date: 'desc' } });
  }
  async approve(companyId: string, id: string) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: { employee: { select: { companyId: true } } },
    });
    if (!timesheet) throw new NotFoundException('Timesheet not found');
    if (timesheet.employee.companyId !== companyId) throw new ForbiddenException('Timesheet does not belong to this company');

    // Rate comes from the company's TIMESHEET_HOURLY_RATE setting (config-driven)
    const setting = await this.prisma.setting.findUnique({
      where: { companyId_key: { companyId, key: 'TIMESHEET_HOURLY_RATE' } },
    });
    const hourlyRate = setting ? Number(setting.value) : DEFAULT_HOURLY_RATE;

    const result = await this.prisma.$transaction(async (tx) => {
      // Approve the timesheet
      const updated = await tx.timesheet.update({ where: { id }, data: { status: 'approved' } });

      // If billable and tied to a project, accumulate project billable hours
      if (updated.isBillable && updated.projectId) {
        const billedAmount = updated.hours * hourlyRate;
        await tx.project.update({
          where: { id: updated.projectId },
          data: {
            billableHours: { increment: updated.hours },
            billedAmount: { increment: billedAmount },
          }
        });
      }

      return updated;
    });

    return result;
  }
  async reject(companyId: string, id: string) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: { employee: { select: { companyId: true } } },
    });
    if (!timesheet) throw new NotFoundException('Timesheet not found');
    if (timesheet.employee.companyId !== companyId) throw new ForbiddenException('Timesheet does not belong to this company');
    return this.prisma.timesheet.update({ where: { id }, data: { status: 'rejected' } });
  }
}

