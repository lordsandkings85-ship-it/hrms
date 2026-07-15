import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.shift.findMany({ where: { companyId } });
  }
  create(companyId: string, name: string, startTime: string, endTime: string, type: string) {
    return this.prisma.shift.create({ data: { companyId, name, startTime, endTime, type } });
  }
  assign(shiftId: string, employeeId: string, effectiveFrom: string) {
    return this.prisma.shiftAssignment.create({
      data: { shiftId, employeeId, effectiveFrom: new Date(effectiveFrom) },
    });
  }
  listHolidays(companyId: string) {
    return this.prisma.holiday.findMany({ where: { companyId }, orderBy: { date: 'asc' } });
  }
  addHoliday(companyId: string, name: string, date: string) {
    return this.prisma.holiday.create({ data: { companyId, name, date: new Date(date) } });
  }

  async generateDepartmentRoster(companyId: string, departmentId: string, shiftIds: string[], startDate: string, weeks: number) {
    if (!shiftIds || shiftIds.length === 0) throw new BadRequestException('At least one shift is required.');
    
    const employees = await this.prisma.employee.findMany({
      where: { companyId, departmentId, status: 'active' },
      select: { id: true },
      orderBy: { createdAt: 'asc' }
    });

    if (employees.length === 0) return { message: 'No active employees in department.' };

    const start = new Date(startDate);
    let assignments: any[] = [];

    // Distribute shifts round-robin
    for (let w = 0; w < weeks; w++) {
      // Calculate effective date for this week
      const effectiveDate = new Date(start);
      effectiveDate.setDate(effectiveDate.getDate() + (w * 7));
      
      const rosterWeek = `${effectiveDate.getFullYear()}-W${Math.ceil((effectiveDate.getDate() + effectiveDate.getDay()) / 7)}`;

      employees.forEach((emp, index) => {
        // Shift rotates every week for the employee
        const shiftIndex = (index + w) % shiftIds.length;
        const assignedShift = shiftIds[shiftIndex];

        assignments.push({
          shiftId: assignedShift,
          employeeId: emp.id,
          effectiveFrom: effectiveDate,
          rosterWeek,
        });
      });
    }

    // Bulk create
    await this.prisma.shiftAssignment.createMany({
      data: assignments,
    });

    return { message: `Roster generated successfully for ${weeks} weeks.` };
  }
}
