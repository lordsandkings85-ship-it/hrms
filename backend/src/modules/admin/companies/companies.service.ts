import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  getProfile(companyId: string) {
    return this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  }

  updateProfile(companyId: string, data: {
    name?: string; logoUrl?: string | null; timezone?: string; currency?: string;
    address?: string | null; phone?: string | null; email?: string | null; website?: string | null;
    gstNumber?: string | null; panNumber?: string | null; industry?: string | null;
    companyType?: string | null; financialYearStart?: number | null; financialYearEnd?: number | null;
    payrollEffectiveFrom?: number | null;
  }) {
    return this.prisma.company.update({ where: { id: companyId }, data });
  }

  listDepartments(companyId: string) {
    return this.prisma.department.findMany({ where: { companyId } });
  }

  createDepartment(companyId: string, name: string) {
    return this.prisma.department.create({ data: { companyId, name } });
  }

  async deleteDepartment(companyId: string, id: string) {
    const existing = await this.prisma.department.findFirst({ where: { id, companyId } });
    if (!existing) throw new Error('Department not found');
    return this.prisma.department.delete({ where: { id } });
  }

  listBranches(companyId: string) {
    return this.prisma.branch.findMany({ where: { companyId } });
  }

  createBranch(companyId: string, name: string, address?: string) {
    return this.prisma.branch.create({ data: { companyId, name, address } });
  }

  listDesignations(companyId: string) {
    return this.prisma.designation.findMany({ where: { companyId } });
  }

  createDesignation(companyId: string, title: string, grade?: string) {
    return this.prisma.designation.create({ data: { companyId, title, grade } });
  }

  listRoles(companyId: string) {
    return this.prisma.role.findMany({ where: { companyId }, include: { permissions: true } });
  }

  createRole(companyId: string, name: string, permissions: { module: string; action: string }[]) {
    return this.prisma.role.create({
      data: {
        companyId,
        name,
        permissions: { create: permissions as any },
      },
      include: { permissions: true },
    });
  }

  listConfig(companyId: string) {
    return this.prisma.setting.findMany({ where: { companyId }, orderBy: { key: 'asc' } });
  }

  upsertConfig(companyId: string, key: string, value: unknown) {
    return this.prisma.setting.upsert({
      where: { companyId_key: { companyId, key } },
      update: { value: value as any },
      create: { companyId, key, value: value as any },
    });
  }

  async deleteConfig(companyId: string, key: string) {
    const existing = await this.prisma.setting.findFirst({ where: { companyId, key } });
    if (!existing) throw new Error('Setting not found');
    return this.prisma.setting.delete({ where: { id: existing.id } });
  }
}

