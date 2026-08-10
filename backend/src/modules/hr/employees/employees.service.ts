import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcrypt';
import {
  encryptPiiFields,
  decryptPiiFields,
  encryptNestedPii,
  decryptEmployeeNested,
} from '../../../utils/crypto.util';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateEmployeeDto) {
    const { password, workingDaysPerWeek, ctc, roleName, contactInfo, paymentInfo, adminInfo, personalInfo, familyMembers, emergencyContacts, experiences, immigrations, documentInfos, certifications, qualifications, ...employeeData } = dto;
    const encryptedData = encryptPiiFields(employeeData as any);
    
    const employee = await this.prisma.employee.create({
      data: {
        companyId,
        ...encryptedData,
        workingDaysPerWeek: workingDaysPerWeek || 5,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : undefined,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        contactInfo: contactInfo ? { create: contactInfo } : undefined,
        paymentInfo: paymentInfo ? { create: encryptNestedPii(paymentInfo as any, 'paymentInfo') } : undefined,
        adminInfo: adminInfo ? { create: encryptNestedPii(adminInfo as any, 'adminInfo') } : undefined,
        personalInfo: personalInfo ? { create: encryptNestedPii(personalInfo as any, 'personalInfo') } : undefined,
        familyMembers: familyMembers ? { create: normalizeNestedDates(familyMembers as any) } : undefined,
        emergencyContacts: emergencyContacts ? { create: emergencyContacts } : undefined,
        experiences: experiences ? { create: normalizeNestedDates(experiences as any) } : undefined,
        immigrations: immigrations ? { create: normalizeNestedDates(immigrations as any).map((i) => encryptNestedPii(i, 'immigrationInfo')) } : undefined,
        documentInfos: documentInfos ? { create: normalizeNestedDates(documentInfos as any) } : undefined,
        certifications: certifications ? { create: normalizeNestedDates(certifications as any) } : undefined,
        qualifications: qualifications ? { create: normalizeNestedDates(qualifications as any) } : undefined,
      },
    });


    const defaultPassword = password || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    let assignedRoleId: string | null = null;
    if (dto.roleName) {
      const role = await this.prisma.role.findFirst({ where: { companyId, name: dto.roleName } });
      if (role) assignedRoleId = role.id;
    }

    await this.prisma.user.create({
      data:{
        company: { connect: { id: companyId } },
        email: dto.email,
        passwordHash,
        employee: { connect: { id: employee.id } },
        ...(assignedRoleId ? { role: { connect: { id: assignedRoleId } } } : {}),
      },
    });

    if (dto.ctc) {
      const monthlyCTC = dto.ctc / 12;
      const computedBasic = Math.round(monthlyCTC * 0.50);
      const computedHra = Math.round(monthlyCTC * 0.25);
      const computedSpecial = Math.max(0, Math.round(monthlyCTC - computedBasic - computedHra));

      await this.prisma.salaryStructure.create({
        data: {
          employeeId: employee.id,
          effectiveFrom: new Date(),
          basic: computedBasic,
          hra: computedHra,
          da: 0,
          conveyance: 0,
          medical: 0,
          specialAllowance: computedSpecial,
        }
      });
    }

    await this.audit(companyId, userId, 'create', employee.id);
    return employee;
  }

  async findAll(
    companyId: string,
    userId: string,
    opts: { page?: number; pageSize?: number; search?: string; departmentId?: string; status?: string },
  ) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.pageSize && opts.pageSize > 0 ? Math.min(opts.pageSize, 100) : 20;

    const where = {
      companyId,
      user: {
        isNot: {
          role: {
            isSystem: true
          }
        }
      },
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
      ...(opts.search
        ? {
            OR: [
              { firstName: { contains: opts.search, mode: 'insensitive' as const } },
              { lastName: { contains: opts.search, mode: 'insensitive' as const } },
              { email: { contains: opts.search, mode: 'insensitive' as const } },
              { employeeCode: { contains: opts.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: {
          department: true,
          designation: true,
          branch: true,
          manager: true,
          shiftAssignment: { include: { shift: true }, orderBy: { effectiveFrom: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);

    const userObj = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    const isSystemAdmin = userObj?.role?.isSystem;
    const reqEmployeeId = userObj?.employeeId;

    const decryptedItems = items.map(item => {
      const dec = decryptPiiFields(item);
      // Strip PII if not system admin, not self, and not their manager
      if (!isSystemAdmin && dec.id !== reqEmployeeId && dec.managerId !== reqEmployeeId) {
        delete dec.pan;
        delete dec.aadhaar;
        delete dec.uan;
        delete dec.pfNumber;
        delete dec.esic;
        delete dec.bankAccountNumber;
        delete dec.bankIfsc;
        delete dec.passport;
        delete dec.drivingLicense;
      }
      return dec;
    });

    return { items: decryptedItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(companyId: string, userId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        department: true,
        designation: true,
        branch: true,
        manager: true,
        documents: true,
        directReports: true,
        salaryStructures: {
          orderBy: { effectiveFrom: 'desc' }
        },
        shiftAssignment: { include: { shift: true }, orderBy: { effectiveFrom: 'desc' } },
        assignments: {
          where: { returnedAt: null },
          include: { asset: true },
          orderBy: { assignedAt: 'desc' },
        },
        contactInfo: true,
        paymentInfo: true,
        adminInfo: true,
        personalInfo: true,
        familyMembers: true,
        emergencyContacts: true,
        experiences: true,
        immigrations: true,
        documentInfos: true,
        certifications: true,
        qualifications: true,
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const dec = decryptEmployeeNested(decryptPiiFields(employee));

    const userObj = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    const isSystemAdmin = userObj?.role?.isSystem;
    const reqEmployeeId = userObj?.employeeId;

    if (!isSystemAdmin && dec.id !== reqEmployeeId && dec.managerId !== reqEmployeeId) {
      delete dec.pan;
      delete dec.aadhaar;
      delete dec.uan;
      delete dec.pfNumber;
      delete dec.esic;
      delete dec.bankAccountNumber;
      delete dec.bankIfsc;
      delete dec.passport;
      delete dec.drivingLicense;
      // also remove salary and nested PII (bank, compliance, immigration)
      delete dec.salaryStructures;
      delete dec.paymentInfo;
      delete dec.adminInfo;
      delete dec.personalInfo;
      delete dec.immigrations;
    }

    return dec;
  }

  async update(companyId: string, userId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(companyId, userId, id); // 404s if not in this tenant

    const { password, workingDaysPerWeek, ctc, roleName, contactInfo, paymentInfo, adminInfo, personalInfo, familyMembers, emergencyContacts, experiences, immigrations, documentInfos, certifications, qualifications, ...employeeData } = dto;
    const encryptedData = encryptPiiFields(employeeData as any);

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...encryptedData,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : undefined,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        contactInfo: contactInfo ? { upsert: { create: contactInfo, update: contactInfo } } : undefined,
        paymentInfo: paymentInfo ? { upsert: { create: encryptNestedPii(paymentInfo as any, 'paymentInfo'), update: encryptNestedPii(paymentInfo as any, 'paymentInfo') } } : undefined,
        adminInfo: adminInfo ? { upsert: { create: encryptNestedPii(adminInfo as any, 'adminInfo'), update: encryptNestedPii(adminInfo as any, 'adminInfo') } } : undefined,
        personalInfo: personalInfo ? { upsert: { create: encryptNestedPii(personalInfo as any, 'personalInfo'), update: encryptNestedPii(personalInfo as any, 'personalInfo') } } : undefined,
        familyMembers: familyMembers ? { deleteMany: {}, create: normalizeNestedDates(familyMembers.map(f => { const { id, ...rest } = f as any; return rest; })) } : undefined,
        emergencyContacts: emergencyContacts ? { deleteMany: {}, create: emergencyContacts.map(e => { const { id, ...rest } = e as any; return rest; }) } : undefined,
        experiences: experiences ? { deleteMany: {}, create: normalizeNestedDates(experiences.map(e => { const { id, ...rest } = e as any; return rest; })) } : undefined,
        immigrations: immigrations ? { deleteMany: {}, create: normalizeNestedDates(immigrations.map(i => { const { id, ...rest } = i as any; return rest; })).map((i) => encryptNestedPii(i, 'immigrationInfo')) } : undefined,
        documentInfos: documentInfos ? { deleteMany: {}, create: normalizeNestedDates(documentInfos.map(d => { const { id, ...rest } = d as any; return rest; })) } : undefined,
        certifications: certifications ? { deleteMany: {}, create: normalizeNestedDates(certifications.map(c => { const { id, ...rest } = c as any; return rest; })) } : undefined,
        qualifications: qualifications ? { deleteMany: {}, create: normalizeNestedDates(qualifications.map(q => { const { id, ...rest } = q as any; return rest; })) } : undefined,
      },
    });

    await this.audit(companyId, userId, 'update', id);
    return decryptEmployeeNested(decryptPiiFields(employee));
  }

  async archive(companyId: string, userId: string, id: string) {
    await this.findOne(companyId, userId, id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { status: 'archived' },
    });
    await this.audit(companyId, userId, 'archive', id);
    return employee;
  }

  async terminate(companyId: string, userId: string, id: string) {
    await this.findOne(companyId, userId, id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { status: 'terminated' },
    });
    await this.audit(companyId, userId, 'terminate', id);
    return employee;
  }

  async remove(companyId: string, userId: string, id: string) {
    await this.findOne(companyId, userId, id);
    
    await this.prisma.$transaction([
      this.prisma.employee.updateMany({ where: { managerId: id }, data: { managerId: null } }),
      this.prisma.employee.updateMany({ where: { reportingManager: id }, data: { reportingManager: null } }),
      this.prisma.employee.updateMany({ where: { reportingManager2: id }, data: { reportingManager2: null } }),
      this.prisma.employee.delete({ where: { id } }),
    ]);

    await this.audit(companyId, userId, 'delete', id);
    return { success: true };
  }

  async updateMyCompliance(companyId: string, userId: string, dto: { uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.employeeId) throw new Error('Employee ID required');
    
    const existing = await this.prisma.employee.findFirst({ where: { id: user.employeeId, companyId } });
    if (!existing) throw new NotFoundException('Employee not found');

    const employee = await this.prisma.employee.update({
      where: { id: user.employeeId },
      data: encryptPiiFields(dto as any),
    });
    return decryptPiiFields(employee);
  }

  private async audit(companyId: string, userId: string, action: string, entityId: string) {
    await this.prisma.auditLog.create({
      data: { companyId, userId, action, entity: 'employee', entityId },
    });
  }
}

const DATE_FIELDS = ['birthDate', 'startDate', 'endDate', 'issueDate', 'expiryDate', 'marriageDate'];

function normalizeNestedDates(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const out: Record<string, any> = { ...row };
    for (const field of DATE_FIELDS) {
      if (out[field] != null && out[field] !== '') {
        out[field] = new Date(out[field]);
      }
    }
    return out;
  });
}

