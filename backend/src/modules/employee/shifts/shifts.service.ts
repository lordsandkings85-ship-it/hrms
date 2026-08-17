import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.shift.findMany({ where: { companyId } });
  }
  create(companyId: string, name: string, startTime: string, endTime: string, type: string) {
    return this.prisma.shift.create({ data: { companyId, name, startTime, endTime, type } });
  }
  async assign(companyId: string, shiftId: string, employeeId: string, effectiveFrom: string) {
    const shift = await this.prisma.shift.findFirst({ where: { id: shiftId, companyId } });
    if (!shift) throw new NotFoundException('Shift not found');
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');
    const effectiveDate = new Date(effectiveFrom);
    const existing = await this.prisma.shiftAssignment.findFirst({
      where: { shiftId, employeeId, effectiveFrom: effectiveDate },
    });
    if (existing) return existing;
    return this.prisma.shiftAssignment.create({
      data: { shiftId, employeeId, effectiveFrom: effectiveDate },
    });
  }
  listAssignments(companyId: string) {
    return this.prisma.shiftAssignment.findMany({
      where: { employee: { companyId } },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } } },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true, type: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
  listHolidays(companyId: string) {
    return this.prisma.holiday.findMany({ where: { companyId }, orderBy: { date: 'asc' } });
  }
  addHoliday(companyId: string, name: string, date: string) {
    return this.prisma.holiday.create({ data: { companyId, name, date: new Date(date) } });
  }

  async deleteShift(companyId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({ where: { id, companyId } });
    if (!shift) throw new NotFoundException('Shift not found');
    return this.prisma.$transaction([
      this.prisma.shiftChangeRequest.deleteMany({ where: { shiftId: id } }),
      this.prisma.shiftChangeRequest.deleteMany({ where: { requestedShiftId: id } }),
      this.prisma.shiftAssignment.deleteMany({ where: { shiftId: id } }),
      this.prisma.shift.delete({ where: { id } }),
    ]);
  }

  async deleteAssignment(companyId: string, id: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { id, employee: { companyId } },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');
    return this.prisma.shiftAssignment.delete({ where: { id } });
  }

  async requestChange(companyId: string, body: { employeeId: string; shiftId?: string; requestedShiftId: string; reason?: string; effectiveFrom: string }) {
    if (!body.requestedShiftId || !body.effectiveFrom) {
      throw new BadRequestException('requestedShiftId and effectiveFrom are required');
    }
    const shift = await this.prisma.shift.findFirst({
      where: { id: body.requestedShiftId, companyId },
    });
    if (!shift) throw new NotFoundException('Requested shift not found');
    const employee = await this.prisma.employee.findFirst({ where: { id: body.employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found in this company');

    return this.prisma.shiftChangeRequest.create({
      data: {
        companyId,
        employeeId: body.employeeId,
        shiftId: body.shiftId || null,
        requestedShiftId: body.requestedShiftId,
        reason: body.reason,
        effectiveFrom: new Date(body.effectiveFrom),
      },
    });
  }

  listChangeRequests(companyId: string) {
    return this.prisma.shiftChangeRequest.findMany({
      where: { companyId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } } },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        requestedShift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveChangeRequest(id: string, companyId: string, approverId: string) {
    const req = await this.prisma.shiftChangeRequest.findFirst({
      where: { id, companyId },
    });
    if (!req) throw new NotFoundException('Shift change request not found');

    await this.prisma.$transaction([
      this.prisma.shiftChangeRequest.update({
        where: { id },
        data: { status: 'approved', approvedBy: approverId },
      }),
      this.prisma.shiftAssignment.create({
        data: { shiftId: req.requestedShiftId, employeeId: req.employeeId, effectiveFrom: req.effectiveFrom },
      }),
    ]);
    return req;
  }

  async rejectChangeRequest(id: string, companyId: string, approverId: string) {
    const req = await this.prisma.shiftChangeRequest.findFirst({
      where: { id, companyId },
    });
    if (!req) throw new NotFoundException('Shift change request not found');
    return this.prisma.shiftChangeRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId },
    });
  }

  async generateDepartmentRoster(companyId: string, departmentId: string, shiftIds: string[], startDate: string, weeks: number) {
if (!shiftIds || shiftIds.length === 0) throw new BadRequestException('At least one shift is required.');
    
    const shifts = await this.prisma.shift.findMany({ where: { id: { in: shiftIds }, companyId }, select: { id: true } });
    if (shifts.length !== shiftIds.length) throw new NotFoundException('One or more shifts not found in this company');

    const employees = await this.prisma.employee.findMany({
      where: { companyId, departmentId, status: 'active' },
      select: { id: true },
      orderBy: { createdAt: 'asc' }
    });

    if (employees.length === 0) return { message: 'No active employees in department.' };

    const start = new Date(startDate);
    const assignments: any[] = [];

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

