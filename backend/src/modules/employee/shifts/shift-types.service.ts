import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class ShiftTypesService {
  constructor(private prisma: PrismaService) {}

  async list(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let types = await this.prisma.shiftType.findMany({
      where: groupWide ? {} : { companyId },
      include: { _count: { select: { shifts: true } } },
      orderBy: { name: 'asc' },
    });
    if (types.length === 0 && !groupWide) {
      types = await this.prisma.shiftType.findMany({
        include: { _count: { select: { shifts: true } } },
        orderBy: { name: 'asc' },
      });
    }
    return types;
  }

  async create(companyId: string, data: {
    name: string;
    defaultStartTime: string;
    defaultEndTime: string;
    isFlexible?: boolean;
    graceMinutes?: number;
    coreHoursStart?: string;
    coreHoursEnd?: string;
    overtimeThresholdMinutes?: number;
  }, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const existing = await this.prisma.shiftType.findFirst({
      where: groupWide ? { name: data.name } : { companyId, name: data.name },
    });
    if (existing) throw new BadRequestException(`Shift type "${data.name}" already exists`);

    return this.prisma.shiftType.create({
      data: {
        companyId,
        name: data.name,
        defaultStartTime: data.defaultStartTime,
        defaultEndTime: data.defaultEndTime,
        isFlexible: data.isFlexible ?? false,
        graceMinutes: data.graceMinutes ?? 10,
        coreHoursStart: data.coreHoursStart ?? null,
        coreHoursEnd: data.coreHoursEnd ?? null,
        overtimeThresholdMinutes: data.overtimeThresholdMinutes ?? 480,
      },
    });
  }

  async update(companyId: string, id: string, data: Partial<{
    name: string;
    defaultStartTime: string;
    defaultEndTime: string;
    isFlexible: boolean;
    graceMinutes: number;
    coreHoursStart: string;
    coreHoursEnd: string;
    overtimeThresholdMinutes: number;
    isActive: boolean;
  }>, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shiftType = await this.prisma.shiftType.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!shiftType) throw new NotFoundException('Shift type not found');

    if (data.name && data.name !== shiftType.name) {
      const dup = await this.prisma.shiftType.findFirst({
        where: groupWide ? { name: data.name, id: { not: id } } : { companyId, name: data.name, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`Shift type "${data.name}" already exists`);
    }

    return this.prisma.shiftType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.defaultStartTime !== undefined && { defaultStartTime: data.defaultStartTime }),
        ...(data.defaultEndTime !== undefined && { defaultEndTime: data.defaultEndTime }),
        ...(data.isFlexible !== undefined && { isFlexible: data.isFlexible }),
        ...(data.graceMinutes !== undefined && { graceMinutes: data.graceMinutes }),
        ...(data.coreHoursStart !== undefined && { coreHoursStart: data.coreHoursStart || null }),
        ...(data.coreHoursEnd !== undefined && { coreHoursEnd: data.coreHoursEnd || null }),
        ...(data.overtimeThresholdMinutes !== undefined && { overtimeThresholdMinutes: data.overtimeThresholdMinutes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async remove(companyId: string, id: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    const shiftType = await this.prisma.shiftType.findFirst({
      where: groupWide ? { id } : { id, companyId },
    });
    if (!shiftType) throw new NotFoundException('Shift type not found');

    const count = await this.prisma.shift.count({ where: { shiftTypeId: id } });
    if (count > 0) {
      await this.prisma.shiftType.update({ where: { id }, data: { isActive: false } });
      return { message: `Shift type deactivated (${count} shifts still reference it)` };
    }

    return this.prisma.shiftType.delete({ where: { id } });
  }
}

