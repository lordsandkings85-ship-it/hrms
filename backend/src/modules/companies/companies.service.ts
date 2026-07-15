import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  getProfile(companyId: string) {
    return this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  }

  updateProfile(companyId: string, data: { name?: string; logoUrl?: string; timezone?: string; currency?: string }) {
    return this.prisma.company.update({ where: { id: companyId }, data });
  }

  listDepartments(companyId: string) {
    return this.prisma.department.findMany({ where: { companyId } });
  }

  createDepartment(companyId: string, name: string) {
    return this.prisma.department.create({ data: { companyId, name } });
  }

  async deleteDepartment(companyId: string, id: string) {
    return this.prisma.department.delete({ where: { id, companyId } });
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
}
