import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async list(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let assets = await this.prisma.asset.findMany({
      where: groupWide ? {} : { companyId },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        },
      },
      orderBy: { type: 'asc' },
    });
    if (assets.length === 0 && !groupWide) {
      assets = await this.prisma.asset.findMany({
        include: {
          assignments: {
            where: { returnedAt: null },
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
          },
        },
        orderBy: { type: 'asc' },
      });
    }
    return assets;
  }

  async myAssets(companyId: string, userId?: string, employeeId?: string) {
    let resolvedEmployeeId = employeeId;
    if (!resolvedEmployeeId && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { employee: { select: { id: true } } },
      });
      resolvedEmployeeId = user?.employee?.id;
    }
    if (!resolvedEmployeeId) return [];

    return this.prisma.assetAssignment.findMany({
      where: { employeeId: resolvedEmployeeId, returnedAt: null },
      include: { asset: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  create(companyId: string, type: string, identifier?: string) {
    return this.prisma.asset.create({ data: { companyId, type, identifier } });
  }

  assign(assetId: string, employeeId: string) {
    return this.prisma.$transaction([
      this.prisma.assetAssignment.create({ data: { assetId, employeeId } }),
      this.prisma.asset.update({ where: { id: assetId }, data: { status: 'assigned' } }),
    ]);
  }

  returnAsset(assignmentId: string, assetId: string) {
    return this.prisma.$transaction([
      this.prisma.assetAssignment.update({ where: { id: assignmentId }, data: { returnedAt: new Date() } }),
      this.prisma.asset.update({ where: { id: assetId }, data: { status: 'available' } }),
    ]);
  }

  async deleteAsset(companyId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, companyId } });
    if (!asset) {
      const anyAsset = await this.prisma.asset.findUnique({ where: { id } });
      if (!anyAsset) throw new NotFoundException('Asset not found');
    }
    return this.prisma.$transaction([
      this.prisma.assetAssignment.deleteMany({ where: { assetId: id } }),
      this.prisma.asset.delete({ where: { id } }),
    ]);
  }
}
