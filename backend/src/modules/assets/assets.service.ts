import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}
  list(companyId: string) {
    return this.prisma.asset.findMany({ where: { companyId }, include: { assignments: true } });
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
}
