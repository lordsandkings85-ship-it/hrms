import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AttendancePolicyService {
  constructor(private prisma: PrismaService) {}

  async getPolicies(companyId: string) {
    return this.prisma.attendancePolicy.findMany({ where: { companyId }, orderBy: { key: 'asc' } });
  }

  async upsertPolicy(companyId: string, key: string, value: string) {
    return this.prisma.attendancePolicy.upsert({
      where: { companyId_key: { companyId, key } },
      update: { value },
      create: { companyId, key, value },
    });
  }

  async deletePolicy(companyId: string, key: string) {
    return this.prisma.attendancePolicy.delete({ where: { companyId_key: { companyId, key } } });
  }
}