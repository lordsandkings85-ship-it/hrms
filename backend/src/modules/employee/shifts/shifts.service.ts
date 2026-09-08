import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async list(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let shifts = await this.prisma.shift.findMany({
      where: groupWide ? {} : { companyId },
      include: {
        company: { select: { id: true, name: true, displayName: true } },
        shiftType: { select: { id: true, name: true, isFlexible: true, graceMinutes: true } },
      },
      orderBy: { name: 'asc' },
    });
    if (shifts.length === 0 && !groupWide) {
      shifts = await this.prisma.shift.findMany({
        include: {
          company: { select: { id: true, name: true, displayName: true } },
          shiftType: { select: { id: true, name: true, isFlexible: true, graceMinutes: true } },
        },
        orderBy: { name: 'asc' },
      });
    }
    return shifts;
  }

  async create(companyId: string, name: string, startTime: string, endTime: string, type: string, shiftTypeId?: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let finalStart = startTime;
    let finalEnd = endTime;
    let finalType = type;

    if (shiftTypeId) {
      const shiftType = await this.prisma.shiftType.findFirst({
        where: groupWide ? { id: shiftTypeId } : { id: shiftTypeId, companyId },
      });
      if (!shiftType) throw new NotFoundException('Shift type not found');
      finalStart = finalStart || shiftType.defaultStartTime;
      finalEnd = finalEnd || shiftType.defaultEndTime;
      finalType = shiftType.isFlexible ? 'flexible' : 'fixed';
    }

    return this.prisma.shift.create({
      data: {
        companyId,
        name,
        startTime: finalStart,
        endTime: finalEnd,
        type: finalType,
        ...(shiftTypeId && { shiftTypeId }),
      },
      include: { shiftType: { select: { id: true, name: true, isFlexible: true, graceMinutes: true } } },
    });
  }

  async assign(companyId: string, shiftId: string, employeeId: string, effectiveFrom: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let shift = await this.prisma.shift.findFirst({
      where: groupWide ? { id: shiftId } : { id: shiftId, companyId },
    });
    if (!shift) {
      shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift) throw new NotFoundException('Shift not found');
    }

    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: employeeId, isSystem: false } : { id: employeeId, companyId, isSystem: false },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const effectiveDate = new Date(effectiveFrom);
    const existing = await this.prisma.shiftAssignment.findFirst({
      where: { shiftId, employeeId, effectiveFrom: effectiveDate },
    });
    if (existing) return existing;
    return this.prisma.shiftAssignment.create({
      data: { shiftId, employeeId, effectiveFrom: effectiveDate },
    });
  }

  async listAssignments(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return this.prisma.shiftAssignment.findMany({
      where: {
        employee: groupWide ? { isSystem: false } : { companyId, isSystem: false },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { id: true, name: true, displayName: true } },
          },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true, type: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async listHolidays(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let holidays = await this.prisma.holiday.findMany({
      where: groupWide ? {} : { companyId },
      orderBy: { date: 'asc' },
    });
    if (holidays.length === 0 && !groupWide) {
      holidays = await this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    }
    return holidays;
  }

  async addHoliday(companyId: string, name: string, date: string) {
    return this.prisma.holiday.create({ data: { companyId, name, date: new Date(date) } });
  }

  async deleteShift(companyId: string, id: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shift = await this.prisma.shift.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return this.prisma.$transaction([
      this.prisma.shiftChangeRequest.deleteMany({ where: { shiftId: id } }),
      this.prisma.shiftChangeRequest.deleteMany({ where: { requestedShiftId: id } }),
      this.prisma.shiftAssignment.deleteMany({ where: { shiftId: id } }),
      this.prisma.shift.delete({ where: { id } }),
    ]);
  }

  async deleteAssignment(companyId: string, id: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        id,
        employee: groupWide ? { isSystem: false } : { companyId },
      },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');
    return this.prisma.shiftAssignment.delete({ where: { id } });
  }

  async requestChange(
    companyId: string,
    body: { employeeId: string; shiftId?: string; requestedShiftId: string; reason?: string; effectiveFrom: string },
    userId?: string,
  ) {
    if (!body.requestedShiftId || !body.effectiveFrom) {
      throw new BadRequestException('requestedShiftId and effectiveFrom are required');
    }
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shift = await this.prisma.shift.findFirst({
      where: groupWide ? { id: body.requestedShiftId } : { id: body.requestedShiftId, companyId },
    });
    if (!shift) throw new NotFoundException('Requested shift not found');
    const employee = await this.prisma.employee.findFirst({
      where: groupWide ? { id: body.employeeId } : { id: body.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const targetCompanyId = employee.companyId || companyId;
    return this.prisma.shiftChangeRequest.create({
      data: {
        companyId: targetCompanyId,
        employeeId: body.employeeId,
        shiftId: body.shiftId || null,
        requestedShiftId: body.requestedShiftId,
        reason: body.reason,
        effectiveFrom: new Date(body.effectiveFrom),
      },
    });
  }

  async listChangeRequests(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    return this.prisma.shiftChangeRequest.findMany({
      where: groupWide ? { employee: { isSystem: false } } : { companyId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            company: { select: { id: true, name: true, displayName: true } },
          },
        },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        requestedShift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveChangeRequest(id: string, companyId: string, approverId: string) {
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const req = await this.prisma.shiftChangeRequest.findFirst({
      where: groupWide ? { id } : { id, companyId },
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
    const groupWide = await isGroupWideUser(this.prisma, approverId);
    const req = await this.prisma.shiftChangeRequest.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!req) throw new NotFoundException('Shift change request not found');
    return this.prisma.shiftChangeRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId },
    });
  }

  async generateDepartmentRoster(
    companyId: string,
    departmentId: string,
    shiftIds: string[],
    startDate: string,
    weeks: number,
    userId?: string,
  ) {
    if (!shiftIds || shiftIds.length === 0) throw new BadRequestException('At least one shift is required.');

    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shifts = await this.prisma.shift.findMany({
      where: groupWide ? { id: { in: shiftIds } } : { id: { in: shiftIds }, companyId },
      select: { id: true },
    });
    if (shifts.length !== shiftIds.length) throw new NotFoundException('One or more shifts not found');

    const employees = await this.prisma.employee.findMany({
      where: {
        ...(groupWide ? {} : { companyId }),
        departmentId,
        status: 'active',
        isSystem: false,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (employees.length === 0) return { message: 'No active employees in department.' };

    const start = new Date(startDate);
    const assignments: any[] = [];

    // Distribute shifts round-robin
    for (let w = 0; w < weeks; w++) {
      const effectiveDate = new Date(start);
      effectiveDate.setDate(effectiveDate.getDate() + w * 7);

      const rosterWeek = `${effectiveDate.getFullYear()}-W${Math.ceil(
        (effectiveDate.getDate() + effectiveDate.getDay()) / 7,
      )}`;

      employees.forEach((emp, index) => {
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

    await this.prisma.shiftAssignment.createMany({
      data: assignments,
    });

    return { message: `Roster generated successfully for ${weeks} weeks.` };
  }
}
