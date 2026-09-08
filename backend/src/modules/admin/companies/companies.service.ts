import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isGroupWideUser } from '../../../utils/group-access.util';

export interface CreateCompanyInput {
  name: string;
  displayName?: string;
  legalName?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  industry?: string;
  companyType?: string;
  financialYearStart?: number;
  financialYearEnd?: number;
  payrollEffectiveFrom?: number;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  tanNumber?: string;
  cinNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  professionalTaxNumber?: string;
  labourWelfareFundNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  status?: string;
}

const EDITABLE_FIELDS = [
  'name', 'displayName', 'legalName', 'logoUrl', 'timezone', 'currency',
  'address', 'phone', 'email', 'website', 'gstNumber', 'panNumber',
  'industry', 'companyType', 'financialYearStart', 'financialYearEnd',
  'payrollEffectiveFrom', 'city', 'state', 'country', 'pincode',
  'tanNumber', 'cinNumber', 'pfNumber', 'esiNumber', 'professionalTaxNumber',
  'labourWelfareFundNumber', 'bankName', 'bankAccountName', 'bankAccountNumber',
  'ifsc', 'status',
];

const INTEGER_FIELDS = ['financialYearStart', 'financialYearEnd', 'payrollEffectiveFrom'];

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

  async listDepartments(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let list = await this.prisma.department.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
    if (list.length === 0 || groupWide) {
      list = await this.prisma.department.findMany({ orderBy: { name: 'asc' } });
    }
    return list;
  }

  createDepartment(companyId: string, name: string) {
    return this.prisma.department.create({ data: { companyId, name } });
  }

  async deleteDepartment(companyId: string, id: string) {
    const existing = await this.prisma.department.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Department not found');
    return this.prisma.department.delete({ where: { id } });
  }

  async listBranches(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let list = await this.prisma.branch.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    if (list.length === 0 || groupWide) {
      list = await this.prisma.branch.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { name: 'asc' },
      });
    }
    return list;
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
    if (!existing) throw new NotFoundException('Branch not found');
    return this.prisma.branch.update({ where: { id }, data });
  }

  async deleteBranch(id: string, companyId: string) {
    const existing = await this.prisma.branch.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Branch not found');
    const employeeCount = await this.prisma.employee.count({ where: { branchId: id } });
    if (employeeCount > 0) throw new BadRequestException(`Cannot delete: ${employeeCount} employee(s) are assigned to this branch`);
    return this.prisma.branch.delete({ where: { id } });
  }

  async listDesignations(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let list = await this.prisma.designation.findMany({ where: { companyId }, orderBy: { title: 'asc' } });
    if (list.length === 0 || groupWide) {
      list = await this.prisma.designation.findMany({ orderBy: { title: 'asc' } });
    }
    return list;
  }

  createDesignation(companyId: string, title: string, grade?: string) {
    return this.prisma.designation.create({ data: { companyId, title, grade } });
  }

  async listRoles(companyId: string, userId?: string) {
    const groupWide = userId ? await isGroupWideUser(this.prisma, userId) : false;
    let list = await this.prisma.role.findMany({ where: { companyId }, include: { permissions: true } });
    if (list.length === 0 || groupWide) {
      list = await this.prisma.role.findMany({ include: { permissions: true } });
    }
    return list;
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
    if (!existing) throw new NotFoundException('Setting not found');
    return this.prisma.setting.delete({ where: { id: existing.id } });
  }

  /**
   * Companies the caller can access: group-wide managers (super admin, system
   * role, or any role holding `organization` grants) see every company under
   * the group; everyone else sees primary company plus explicit memberships.
   */
  async listAccessible(userId: string, primaryCompanyId: string) {
    try {
      await this.ensureGroupDefaults(userId);
    } catch {
      // Non-blocking if defaults already exist or error
    }

    if (await this.isGroupWide(userId)) {
      return this.prisma.company.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { createdAt: 'asc' },
      });
    }
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

  /**
   * Pre-seed or ensure that the 4 standard Lords and Kings group companies
   * exist in the database and give membership to the user.
   */
  async ensureGroupDefaults(userId: string) {
    const DEFAULT_COMPANIES = [
      {
        name: 'Lordsandkings Enterprises',
        displayName: 'Lordsandkings Enterprises',
        legalName: 'Lordsandkings Enterprises',
        industry: 'Trading & Services',
        companyType: 'Proprietary',
      },
      {
        name: 'Lordsandkings Agro',
        displayName: 'Lordsandkings Agro',
        legalName: 'Lordsandkings Agro',
        industry: 'Agriculture & Food',
        companyType: 'Private Limited',
      },
      {
        name: 'Lordsandkings Enterprises Pvt Ltd',
        displayName: 'Lordsandkings Enterprises Pvt Ltd',
        legalName: 'Lordsandkings Enterprises Pvt Ltd',
        industry: 'Business & Innovation',
        companyType: 'Private Limited',
      },
      {
        name: 'Lordsandkings Estates LLP',
        displayName: 'Lordsandkings Estates LLP',
        legalName: 'Lordsandkings Estates LLP',
        industry: 'Real Estate & Development',
        companyType: 'LLP',
      },
    ];

    const groupUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { isSuperAdmin: true },
          { role: { is: { isSystem: true } } },
          { role: { is: { name: { in: ['HR Admin', 'Admin', 'Super Admin'] } } } },
          { role: { is: { permissions: { some: { module: { in: ['organization', 'ALL', '*'] } } } } } },
        ],
      },
      select: { id: true },
    });
    const memberIds = Array.from(new Set([userId, ...groupUsers.map((u) => u.id)]));

    for (const item of DEFAULT_COMPANIES) {
      const normalizedSearch = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const allComps = await this.prisma.company.findMany();
      let existing = allComps.find(c => {
        const cNorm = (c.displayName || c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cNorm.includes(normalizedSearch) || normalizedSearch.includes(cNorm);
      });

      if (!existing) {
        existing = await this.prisma.company.create({
          data: {
            name: item.name,
            displayName: item.displayName,
            legalName: item.legalName,
            industry: item.industry,
            companyType: item.companyType,
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            status: 'active',
          },
        });
      }

      if (memberIds.length && existing) {
        await this.prisma.userCompany.createMany({
          data: memberIds.map((uid) => ({ userId: uid, companyId: existing!.id, isActive: true })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.company.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * List all employees assigned to a specific company.
   */
  async listCompanyEmployees(_userId: string, companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId },
      include: {
        department: true,
        designation: true,
        branch: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  /**
   * List all employees across all group companies with their assigned company info.
   */
  async listAllGroupEmployees(_userId: string) {
    return this.prisma.employee.findMany({
      include: {
        company: { select: { id: true, name: true, displayName: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, title: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ companyId: 'asc' }, { firstName: 'asc' }],
    });
  }

  /**
   * Batch assign or transfer employees to a target company.
   */
  async assignEmployees(
    companyId: string,
    userId: string,
    dto: { employeeIds: string[]; reason?: string; effectiveFrom?: string },
  ) {
    const targetCompany = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!targetCompany) throw new NotFoundException('Target company not found');
    if (!dto.employeeIds || !dto.employeeIds.length) {
      throw new BadRequestException('Please select at least one employee to assign');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const empId of dto.employeeIds) {
        await tx.employeeCompanyHistory.updateMany({
          where: { employeeId: empId, effectiveTo: null },
          data: { effectiveTo: new Date() },
        });

        await tx.employee.update({
          where: { id: empId },
          data: { companyId },
        });

        await tx.user.updateMany({
          where: { employeeId: empId },
          data: { companyId },
        });

        await tx.employeeCompanyHistory.create({
          data: {
            employeeId: empId,
            companyId,
            effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
            reason: dto.reason || 'Assigned via Company Profile Manager',
            changedBy: userId,
          },
        });
      }
    });

    await this.audit(companyId, userId, 'assign_employees', 'company', companyId, {
      count: dto.employeeIds.length,
      employeeIds: dto.employeeIds,
    });

    return {
      success: true,
      assignedCount: dto.employeeIds.length,
      companyId,
      companyName: targetCompany.displayName || targetCompany.name,
    };
  }

  /**
   * Create a sub-company under the Lords And Kings Group. The creator and every
   * group-wide manager get membership so HR remains common to all companies.
   */
  async create(userId: string, _primaryCompanyId: string, data: CreateCompanyInput) {
    if (!data.name?.trim()) throw new BadRequestException('Company name is required');
    await this.assertNoDuplicate(data.name.trim(), undefined, data.gstNumber, data.panNumber);

    const company = await this.prisma.company.create({
      data: {
        name: data.name.trim(),
        displayName: data.displayName,
        legalName: data.legalName,
        logoUrl: data.logoUrl,
        timezone: data.timezone || 'Asia/Kolkata',
        currency: data.currency || 'INR',
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        industry: data.industry,
        companyType: data.companyType,
        financialYearStart: this.toIntOrNull(data.financialYearStart),
        financialYearEnd: this.toIntOrNull(data.financialYearEnd),
        payrollEffectiveFrom: this.toIntOrNull(data.payrollEffectiveFrom),
        city: data.city,
        state: data.state,
        country: data.country || 'India',
        pincode: data.pincode,
        tanNumber: data.tanNumber,
        cinNumber: data.cinNumber,
        pfNumber: data.pfNumber,
        esiNumber: data.esiNumber,
        professionalTaxNumber: data.professionalTaxNumber,
        labourWelfareFundNumber: data.labourWelfareFundNumber,
        bankName: data.bankName,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        ifsc: data.ifsc,
        status: data.status || 'active',
      },
    });

    // Membership: the creator plus all group-wide managers, so newly created
    // companies are immediately visible to the whole HR/admin team.
    const groupUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { isSuperAdmin: true },
          { role: { is: { isSystem: true } } },
          { role: { is: { permissions: { some: { module: 'organization' } } } } },
        ],
      },
      select: { id: true },
    });
    const memberIds = Array.from(new Set([userId, ...groupUsers.map((u) => u.id)]));
    if (memberIds.length) {
      await this.prisma.userCompany.createMany({
        data: memberIds.map((uid) => ({ userId: uid, companyId: company.id, isActive: true })),
        skipDuplicates: true,
      });
    }

    await this.audit(company.id, userId, 'create', 'company', company.id, {
      name: company.name,
      gstNumber: company.gstNumber,
      panNumber: company.panNumber,
    });
    return company;
  }

  /** Update a specific company (group-wide managers or members within scope). */
  async update(userId: string, primaryCompanyId: string, id: string, data: Record<string, unknown>) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    const groupWide = await this.isGroupWide(userId);
    if (!groupWide) {
      const memberships = await this.prisma.userCompany.findMany({
        where: { userId, isActive: true },
        select: { companyId: true },
      });
      const ids = new Set([primaryCompanyId, ...memberships.map((m) => m.companyId)]);
      if (!ids.has(id)) throw new ForbiddenException('Company not in your access scope');
    }

    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (data[key] !== undefined) {
        patch[key] = INTEGER_FIELDS.includes(key) ? this.toIntOrNull(data[key] as any) : data[key];
      }
    }
    if (Object.keys(patch).length === 0) return company;

    const nextName = (patch.name as string | undefined)?.trim() ?? company.name;
    await this.assertNoDuplicate(
      nextName,
      id,
      (patch.gstNumber as string | undefined) ?? company.gstNumber,
      (patch.panNumber as string | undefined) ?? company.panNumber,
    );

    const before = { name: company.name, status: company.status, gstNumber: company.gstNumber, panNumber: company.panNumber };
    const updated = await this.prisma.company.update({ where: { id }, data: patch });
    await this.audit(id, userId, 'update', 'company', id, {
      before,
      after: { name: updated.name, status: updated.status, gstNumber: updated.gstNumber, panNumber: updated.panNumber },
    });
    return updated;
  }

  /** Group-wide managers can access every company under the group. */
  private async isGroupWide(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true,
        role: { select: { name: true, isSystem: true, permissions: { select: { module: true, action: true } } } },
      },
    });
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (user.role?.isSystem) return true;
    if (['HR Admin', 'Admin', 'Super Admin'].includes(user.role?.name || '')) return true;
    return !!user.role?.permissions?.some((p) => p.module === 'organization' || p.module === 'ALL' || p.module === '*' || p.action === 'ALL');
  }

  private async assertNoDuplicate(
    name: string,
    excludeId?: string,
    gstNumber?: string | null,
    panNumber?: string | null,
  ) {
    const exclusion = excludeId ? { id: { not: excludeId } } : {};
    // MySQL default collation is case-insensitive, so a plain equals check
    // already rejects names that differ only by case.
    const nameDup = await this.prisma.company.findFirst({
      where: { name: { equals: name }, ...exclusion },
    });
    if (nameDup) throw new BadRequestException(`A company named "${name}" already exists`);

    if (gstNumber) {
      const dupGst = await this.prisma.company.findFirst({
        where: { gstNumber: { equals: gstNumber }, ...exclusion },
      });
      if (dupGst) throw new BadRequestException('A company with this GSTIN already exists');
    }
    if (panNumber) {
      const dupPan = await this.prisma.company.findFirst({
        where: { panNumber: { equals: panNumber }, ...exclusion },
      });
      if (dupPan) throw new BadRequestException('A company with this PAN already exists');
    }
  }

  private toIntOrNull(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private async audit(
    companyId: string,
    userId: string,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        companyId,
        userId,
        action,
        entity,
        entityId,
        metadata: metadata as any,
      },
    });
  }
}