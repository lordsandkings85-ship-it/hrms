import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TimesheetsService {
  constructor(private prisma: PrismaService) {}
  submit(employeeId: string, date: string, hours: number, projectId?: string) {
    return this.prisma.timesheet.create({ data: { employeeId, date: new Date(date), hours, projectId } });
  }
  listForEmployee(employeeId: string) {
    return this.prisma.timesheet.findMany({ where: { employeeId }, include: { project: true }, orderBy: { date: 'desc' } });
  }
  async approve(id: string) {
    const timesheet = await this.prisma.timesheet.findUnique({ where: { id } });
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    const result = await this.prisma.$transaction(async (tx) => {
      // Approve the timesheet
      const updated = await tx.timesheet.update({ where: { id }, data: { status: 'approved' } });

      // If billable and tied to a project, accumulate project billable hours
      if (updated.isBillable && updated.projectId) {
        // Assume a generic rate of $100/hr for the prototype
        const billedAmount = updated.hours * 100;
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
  reject(id: string) {
    return this.prisma.timesheet.update({ where: { id }, data: { status: 'rejected' } });
  }
}
