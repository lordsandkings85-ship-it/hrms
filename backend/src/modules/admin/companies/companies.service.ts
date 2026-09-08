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
    legalName?: string | null; displayName?: string | null; city?: string | null;
    state?: string | null; country?: string | null; pincode?: string | null;
    tanNumber?: string | null; cinNumber?: string | null; pfNumber?: string | null;
    esiNumber?: string | null; professionalTaxNumber?: string | null;
    labourWelfareFundNumber?: string | null;
    bankName?: string | null; bankAccountName?: string | null; bankAccountNumber?: string | null;
    ifsc?: string | null; status?: string;
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
    return this.prisma.branch.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createBranch(companyId: string, data: {
    name: string; address?: string; code?: string; city?: string;
    state?: string; country?: string; phone?: string; pincode?: string; isActive?: boolean;
  }) {
    return this.prisma.branch.create({ data: { companyId, ...data } });
  }

  async updateBranch(id: string, companyId: string, data: {
    name?: string; address?: string; code?: string; city?: string;
    state?: string; country?: string; phone?: string; pincode?: string; isActive?: boolean;
  }) {
    const existing = await this.prisma.branch.findFirst({ where: { id, companyId } });
    if (!existing) throw new Error('Branch not found');
    return this.prisma.branch.update({ where: { id }, data });
  }

  async deleteBranch(id: string, companyId: string) {
    const existing = await this.prisma.branch.findFirst({ where: { id, companyId } });
    if (!existing) throw new Error('Branch not found');
    const employeeCount = await this.prisma.employee.count({ where: { branchId: id } });
    if (employeeCount > 0) throw new Error(`Cannot delete: ${employeeCount} employee(s) are assigned to this branch`);
    return this.prisma.branch.delete({ where: { id } });
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

  /** Companies the caller can see: their primary company plus any memberships. */
  async listAccessible(userId: string, primaryCompanyId: string) {
    const memberships = await this.prisma.userCompany.findMany({
      where: { userId, isActive: true },
      select: { companyId: true },
    });
    const ids = Array.from(new Set([primaryCompanyId, ...memberships.map((m) => m.companyId)]));
    return this.prisma.company.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Create a sub-company under the caller's group. */
  async create(userId: string, primaryCompanyId: string, data: {
    name: string; displayName?: string; legalName?: string; timezone?: string; currency?: string;
    address?: string; city?: string; state?: string; country?: string; pincode?: string;
    gstNumber?: string; panNumber?: string;
  }) {
    const company = await this.prisma.company.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        legalName: data.legalName,
        timezone: data.timezone || 'Asia/Kolkata',
        currency: data.currency || 'INR',
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
      },
    });

    // The primary user becomes a member of the new sub-company.
    await this.prisma.userCompany.create({
      data: { userId, companyId: company.id, isActive: true },
    }).catch(() => {});

    return company;
  }

  /** Update a specific company (must be within the caller's access scope). */
  async update(userId: string, primaryCompanyId: string, id: string, data: Record<string, unknown>) {
    const memberships = await this.prisma.userCompany.findMany({
      where: { userId, isActive: true },
      select: { companyId: true },
    });
    const ids = new Set([primaryCompanyId, ...memberships.map((m) => m.companyId)]);
    if (!ids.has(id)) throw new Error('Company not in your access scope');

    // Protect structural fields a sub-company member should not change.
    const { name, displayName, legalName, status, ...rest } = data as any;
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (displayName !== undefined) patch.displayName = displayName;
    if (legalName !== undefined) patch.legalName = legalName;
    if (status !== undefined) patch.status = status;
    Object.assign(patch, rest);

    return this.prisma.company.update({ where: { id }, data: patch });
  }
}

