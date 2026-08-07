import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.asset.findMany({
      where: { companyId },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
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
    if (!asset) throw new NotFoundException('Asset not found');
    return this.prisma.$transaction([
      this.prisma.assetAssignment.deleteMany({ where: { assetId: id } }),
      this.prisma.asset.delete({ where: { id } }),
    ]);
  }
}

