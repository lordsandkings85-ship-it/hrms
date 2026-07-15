import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_CHECKLIST = [
  'Return company laptop / equipment',
  'Return access card / ID badge',
  'Revoke system and email access',
  'Handover of ongoing work and knowledge transfer',
  'Clear company dues / advances',
  'Submit resignation letter (hard copy)',
  'HR exit interview completed',
  'IT device wipe confirmation',
  'Finance account clearance',
  'Return vehicle / parking pass (if applicable)',
];

@Injectable()
export class ExitService {
  constructor(private prisma: PrismaService) {}

  async initiate(companyId: string, dto: {
    employeeId: string;
    resignationDate: string;
    lastWorkingDay: string;
    reason?: string;
  }) {
    const existing = await this.prisma.exitRequest.findUnique({ where: { employeeId: dto.employeeId } });
    if (existing) return existing;

    const exitRequest = await this.prisma.exitRequest.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        resignationDate: new Date(dto.resignationDate),
        lastWorkingDay: new Date(dto.lastWorkingDay),
        reason: dto.reason,
        status: 'initiated',
        checklists: {
          create: DEFAULT_CHECKLIST.map(task => ({ task })),
        },
      },
      include: { checklists: true },
    });

    // Update employee status
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { status: 'archived' },
    });

    return exitRequest;
  }

  async get(employeeId: string) {
    return this.prisma.exitRequest.findUnique({
      where: { employeeId },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true, department: true, designation: true } },
        checklists: { orderBy: { task: 'asc' } },
      },
    });
  }

  async list(companyId: string) {
    return this.prisma.exitRequest.findMany({
      where: { companyId },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true, department: true } },
        checklists: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeChecklist(checklistId: string, completedBy: string) {
    return this.prisma.exitChecklist.update({
      where: { id: checklistId },
      data: { completedAt: new Date(), completedBy },
    });
  }

  async uncompleteChecklist(checklistId: string) {
    return this.prisma.exitChecklist.update({
      where: { id: checklistId },
      data: { completedAt: null, completedBy: null },
    });
  }

  async saveExitInterview(exitRequestId: string, note: string) {
    const req = await this.prisma.exitRequest.update({
      where: { id: exitRequestId },
      data: { exitInterviewNote: note },
    });

    // Check if all checklist items are done → advance to fnf
    const checklists = await this.prisma.exitChecklist.findMany({ where: { exitRequestId } });
    const allDone = checklists.every(c => !!c.completedAt);
    if (allDone) {
      await this.prisma.exitRequest.update({ where: { id: exitRequestId }, data: { status: 'fnf' } });
    }

    return req;
  }

  async advanceStatus(id: string, status: string) {
    return this.prisma.exitRequest.update({ where: { id }, data: { status } });
  }
}
