import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateLoginDto, ResetPasswordDto, ToggleLoginDto } from './dto/manage-login.dto';
import { MailService } from '../../../common/mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  encryptPiiFields,
  decryptPiiFields,
  encryptNestedPii,
  decryptEmployeeNested,
} from '../../../utils/crypto.util';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async create(companyId: string, userId: string, dto: CreateEmployeeDto) {
    const { password, workingDaysPerWeek, ctc, roleName, contactInfo, paymentInfo, adminInfo, personalInfo, familyMembers, emergencyContacts, experiences, immigrations, documentInfos, certifications, qualifications, ...employeeData } = dto;
    const encryptedData = encryptPiiFields(employeeData as any);

    let assignedRoleId: string | null = null;
    if (dto.roleName) {
      const role = await this.prisma.role.findFirst({ where: { companyId, name: dto.roleName } });
      if (role) assignedRoleId = role.id;
    }

    const generatedPassword = !password ? dto.employeeCode.toLowerCase() : undefined;
    const passwordHash = await bcrypt.hash(password || generatedPassword!, 12);

    const employee = await this.prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
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

      await tx.user.create({
        data: {
          company: { connect: { id: companyId } },
          email: dto.email,
          passwordHash,
          employee: { connect: { id: created.id } },
          ...(assignedRoleId ? { role: { connect: { id: assignedRoleId } } } : {}),
        },
      });

      if (dto.ctc) {
        const monthlyCTC = dto.ctc / 12;
        const computedBasic = Math.round(monthlyCTC * 0.50);
        const computedHra = Math.round(monthlyCTC * 0.25);
        const computedSpecial = Math.max(0, Math.round(monthlyCTC - computedBasic - computedHra));

        await tx.salaryStructure.create({
          data: {
            employeeId: created.id,
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

      return created;
    }, { timeout: 30000 });

    await this.audit(companyId, userId, 'create', employee.id);
    return generatedPassword ? { ...employee, generatedPassword } : employee;
  }

  async findAll(
    companyId: string,
    userId: string,
    opts: { page?: number; pageSize?: number; search?: string; departmentId?: string; status?: string },
  ) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.pageSize && opts.pageSize > 0 ? Math.min(opts.pageSize, 100) : 50;

    const userObj = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    const isSystemAdmin = userObj?.role?.isSystem;
    const isHR = userObj?.isSuperAdmin || isSystemAdmin || userObj?.role?.name === 'HR Admin';

    const where = {
      companyId,
      user: {
        isNot: {
          role: {
            isSystem: true
          }
        }
      },
      ...(!isHR ? { employeeCode: { not: 'HR-001' } } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
      ...(opts.search
        ? {
            OR: [
              { firstName: { contains: opts.search } },
              { lastName: { contains: opts.search } },
              { employeeCode: { contains: opts.search } },
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
    const isHR = userObj?.isSuperAdmin || isSystemAdmin || userObj?.role?.name === 'HR Admin';
    const reqEmployeeId = userObj?.employeeId;

    if (dec.employeeCode === 'HR-001' && !isHR) {
      throw new NotFoundException('Employee not found');
    }

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
    const exists = await this.prisma.employee.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Employee not found');

    const { password, workingDaysPerWeek, ctc, roleName, experience, contactInfo, paymentInfo, adminInfo, personalInfo, familyMembers, emergencyContacts, experiences, immigrations, documentInfos, certifications, qualifications, ...employeeData } = dto;
    const encryptedData = encryptPiiFields(employeeData as any);

    const employee = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data: {
          ...encryptedData,
          workingDaysPerWeek,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
          confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : undefined,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          contactInfo: contactInfo ? (() => { const { id: _i, employeeId: _e, createdAt: _c, updatedAt: _u, ...ci } = contactInfo as any; return { upsert: { create: ci, update: ci } }; })() : undefined,
          paymentInfo: paymentInfo ? (() => { const { id: _i, employeeId: _e, createdAt: _c, updatedAt: _u, ...pi } = paymentInfo as any; const enc = encryptNestedPii(pi, 'paymentInfo'); return { upsert: { create: enc, update: enc } }; })() : undefined,
          adminInfo: adminInfo ? (() => { const { id: _i, employeeId: _e, createdAt: _c, updatedAt: _u, ...ai } = adminInfo as any; const enc = encryptNestedPii(ai, 'adminInfo'); return { upsert: { create: enc, update: enc } }; })() : undefined,
          personalInfo: personalInfo ? (() => { const { id: _i, employeeId: _e, createdAt: _c, updatedAt: _u, ...psi } = personalInfo as any; const enc = encryptNestedPii(psi, 'personalInfo'); return { upsert: { create: enc, update: enc } }; })() : undefined,
          familyMembers: familyMembers ? { deleteMany: {}, create: normalizeNestedDates(familyMembers.map(f => { const { id, employeeId, createdAt, updatedAt, ...rest } = f as any; return rest; })) } : undefined,
          emergencyContacts: emergencyContacts ? { deleteMany: {}, create: emergencyContacts.map(e => { const { id, employeeId, createdAt, updatedAt, ...rest } = e as any; return rest; }) } : undefined,
          experiences: experiences ? { deleteMany: {}, create: normalizeNestedDates(experiences.map(e => { const { id, employeeId, createdAt, updatedAt, ...rest } = e as any; return rest; }), ['startDate', 'endDate']) } : undefined,
          immigrations: immigrations ? { deleteMany: {}, create: normalizeNestedDates(immigrations.map(i => { const { id, employeeId, createdAt, updatedAt, ...rest } = i as any; return rest; }), ['issuedDate', 'expiryDate']).map((i) => encryptNestedPii(i, 'immigrationInfo')) } : undefined,
          documentInfos: documentInfos ? { deleteMany: {}, create: normalizeNestedDates(documentInfos.map(d => { const { id, employeeId, createdAt, updatedAt, ...rest } = d as any; return rest; })) } : undefined,
          certifications: certifications ? { deleteMany: {}, create: normalizeNestedDates(certifications.map(c => { const { id, employeeId, createdAt, updatedAt, ...rest } = c as any; return rest; })) } : undefined,
          qualifications: qualifications ? { deleteMany: {}, create: normalizeNestedDates(qualifications.map(q => { const { id, employeeId, createdAt, updatedAt, ...rest } = q as any; return rest; })) } : undefined,
        },
      });

      if (dto.email) {
        const linkedUser = await tx.user.findUnique({ where: { employeeId: id } });
        if (linkedUser && linkedUser.email !== dto.email) {
          const emailTaken = await tx.user.findUnique({ where: { email: dto.email } });
          if (!emailTaken || emailTaken.id === linkedUser.id) {
            await tx.user.update({ where: { id: linkedUser.id }, data: { email: dto.email } });
          }
        }
      }

      return updated;
    }, { timeout: 30000 });

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

  async bulkUpdateCompliance(
    companyId: string,
    items: { employeeId: string; uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }[],
  ) {
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: items.map(i => i.employeeId) }, companyId },
      select: { id: true },
    });
    const validIds = new Set(employees.map(e => e.id));
    const skipped: string[] = [];
    let updated = 0;
    for (const item of items) {
      if (!validIds.has(item.employeeId)) {
        skipped.push(item.employeeId);
        continue;
      }
      await this.prisma.employee.update({
        where: { id: item.employeeId },
        data: encryptPiiFields({
          ...(item.uan !== undefined ? { uan: item.uan } : {}),
          ...(item.pfNumber !== undefined ? { pfNumber: item.pfNumber } : {}),
          ...(item.esic !== undefined ? { esic: item.esic } : {}),
          ...(item.pan !== undefined ? { pan: item.pan } : {}),
          ...(item.aadhaar !== undefined ? { aadhaar: item.aadhaar } : {}),
        }),
      });
      updated++;
    }
    return { updated, skipped };
  }

  async importManagers(
    companyId: string,
    items: { employeeCode: string; managerCode?: string; companyEmail?: string }[],
  ) {
    const codes = items.map(i => i.employeeCode).filter(Boolean);
    const managerCodes = items.map(i => i.managerCode || '').filter(Boolean);
    const employees = await this.prisma.employee.findMany({
      where: { companyId, employeeCode: { in: [...codes, ...managerCodes] } },
      select: { id: true, employeeCode: true },
    });
    const byCode = new Map(employees.map(e => [e.employeeCode, e.id]));
    const result: { employeeCode: string; status: string; reason?: string }[] = [];
    for (const item of items) {
      const employeeId = byCode.get(item.employeeCode);
      if (!employeeId) {
        result.push({ employeeCode: item.employeeCode, status: 'failed', reason: 'Employee not found' });
        continue;
      }
      if (item.managerCode) {
        const manager = employees.find(e => e.employeeCode === item.managerCode);
        if (!manager) {
          result.push({ employeeCode: item.employeeCode, status: 'failed', reason: 'Manager not found' });
          continue;
        }
      }
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: {
          ...(item.managerCode ? { reportingManager: item.managerCode } : {}),
          ...(item.companyEmail !== undefined ? { companyEmail: item.companyEmail || null } : {}),
        },
      });
      result.push({ employeeCode: item.employeeCode, status: 'updated' });
    }
    return { result };
  }

  async getLoginStatuses(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        user: {
          select: {
            id: true,
            email: true,
            lastLoginAt: true,
            createdAt: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return employees.map((emp) => ({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
      email: emp.email,
      hasLogin: !!emp.user,
      isActive: !!emp.user,
      loginEmail: emp.user?.email || null,
      roleName: emp.user?.role?.name || null,
      lastLoginAt: emp.user?.lastLoginAt || null,
      accountCreatedAt: emp.user?.createdAt || null,
    }));
  }

  async createLoginForEmployee(companyId: string, userId: string, employeeId: string, dto: CreateLoginDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.email) throw new BadRequestException('Employee has no email on file');
    if (employee.user) throw new ConflictException('Employee already has a login account');

    const password = dto.password || employee.employeeCode.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const employeeRole = await this.prisma.role.findFirst({
      where: { companyId, name: 'Employee' },
    });

    await this.prisma.user.create({
      data: {
        companyId,
        email: employee.email,
        passwordHash,
        employeeId: employee.id,
        ...(employeeRole ? { roleId: employeeRole.id } : {}),
      },
    });

    await this.audit(companyId, userId, 'LOGIN_CREATED', employee.id);

    return {
      success: true,
      employeeId: employee.id,
      email: employee.email,
      generatedPassword: password,
    };
  }

  async toggleLoginStatus(companyId: string, userId: string, employeeId: string, dto: ToggleLoginDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.user) throw new BadRequestException('Employee has no login account');

    if (dto.active) {
      const newPassword = employee.employeeCode.toLowerCase();
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({
        where: { id: employee.user.id },
        data: { passwordHash },
      });
    } else {
      const disabledHash = await bcrypt.hash(`DISABLED_${Date.now()}_${employee.id}`, 12);
      await this.prisma.user.update({
        where: { id: employee.user.id },
        data: { passwordHash: disabledHash },
      });
    }

    await this.audit(companyId, userId, dto.active ? 'LOGIN_ACTIVATED' : 'LOGIN_DEACTIVATED', employee.id);

    return {
      success: true,
      employeeId: employee.id,
      isActive: dto.active,
    };
  }

  async resetEmployeePassword(companyId: string, userId: string, employeeId: string, dto: ResetPasswordDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.user) throw new BadRequestException('Employee has no login account');
    if (!employee.email) throw new BadRequestException('Employee has no email on file');

    const newPassword = employee.employeeCode.toLowerCase();
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: employee.user.id },
      data: { passwordHash },
    });

    if (dto.sendEmail) {
      const html = `
        <p>Hello ${employee.firstName} ${employee.lastName || ''},</p>
        <p>Your ${process.env.APP_NAME || 'Workora HRMS'} password has been reset.</p>
        <p><strong>Email:</strong> ${employee.email}</p>
        <p><strong>New Password:</strong> ${newPassword}</p>
        <p>Please change your password after your first login.</p>`;
      if (this.mail.isConfigured()) {
        await this.mail.send({ to: employee.email, subject: 'Password Reset — Workora HRMS', html });
      }
    }

    await this.audit(companyId, userId, 'PASSWORD_RESET', employee.id);

    return {
      success: true,
      employeeId: employee.id,
      email: employee.email,
      newPassword,
    };
  }

  async sendCredentials(companyId: string, employeeIds: string[]) {
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId },
      include: { user: true },
    });
    const sent: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    for (const employee of employees) {
      if (!employee.email) {
        skipped.push({ id: employee.id, reason: 'No email on file' });
        continue;
      }
      const user = employee.user;
      if (!user) {
        skipped.push({ id: employee.id, reason: 'No login account' });
        continue;
      }
      const password = employee.employeeCode.toLowerCase();
      const passwordHash = await bcrypt.hash(password, 12);
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      const html = `
        <p>Hello ${employee.firstName} ${employee.lastName || ''},</p>
        <p>Your ${process.env.APP_NAME || 'Workora HRMS'} login credentials have been reset.</p>
        <p><strong>Email:</strong> ${employee.email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please change your password after your first login.</p>`;
      if (this.mail.isConfigured()) {
        await this.mail.send({ to: employee.email, subject: 'Your login credentials', html });
      } else {
        this.logger.warn(`SMTP not configured — credentials for ${employee.email} generated locally`);
      }
      sent.push(employee.id);
    }
    return { sent: sent.length, skipped };
  }

  private async audit(companyId: string, userId: string, action: string, entityId: string) {
    await this.prisma.auditLog.create({
      data: { companyId, userId, action, entity: 'employee', entityId },
    });
  }
}

const DEFAULT_DATE = new Date('1970-01-01');
const DATE_FIELDS = ['birthDate', 'startDate', 'endDate', 'issueDate', 'issuedDate', 'expiryDate', 'marriageDate'];

function normalizeNestedDates(rows: Record<string, any>[], requiredDateFields: string[] = []): Record<string, any>[] {
  return rows.map((row) => {
    const out: Record<string, any> = { ...row };
    for (const field of DATE_FIELDS) {
      if (out[field] === '' || out[field] == null) {
        if (requiredDateFields.includes(field) || field in out) {
          out[field] = DEFAULT_DATE;
        }
      } else {
        out[field] = new Date(out[field]);
      }
    }
    return out;
  });
}

