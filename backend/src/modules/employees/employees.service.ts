import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcrypt';
import { encryptPiiFields, decryptPiiFields } from '../../utils/crypto.util';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateEmployeeDto) {
    const { password, workingDaysPerWeek, ctc, ...employeeData } = dto;
    const encryptedData = encryptPiiFields(employeeData);
    
    const employee = await this.prisma.employee.create({
      data: {
        companyId,
        ...encryptedData,
        workingDaysPerWeek: workingDaysPerWeek || 5,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      },
    });

    const defaultPassword = password || 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    await this.prisma.user.create({
      data:{
        company: { connect: { id: companyId } },
        email: dto.email,
        passwordHash,
        employee: { connect: { id: employee.id } },
      },
    });

    if (dto.ctc) {
      const monthlyCTC = dto.ctc / 12;
      let computedGross = 0;

      if (monthlyCTC > 32521.5) {
        computedGross = (monthlyCTC - 1800) / 1.02405;
      } else if (monthlyCTC > 22765.05) {
        computedGross = monthlyCTC / 1.08405;
      } else {
        computedGross = monthlyCTC / 1.11655;
      }

      const computedBasic = Math.round(computedGross * 0.50);
      const computedHra = Math.round(computedBasic * 0.40);
      const computedSpecial = Math.round(computedGross - (computedBasic + computedHra));

      await this.prisma.salaryStructure.create({
        data: {
          employeeId: employee.id,
          effectiveFrom: new Date(),
          basic: computedBasic,
          hra: computedHra,
          da: 0,
          conveyance: 0,
          medical: 0,
          specialAllowance: Math.max(0, computedSpecial),
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
        include: { department: true, designation: true, branch: true, manager: true },
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
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const dec = decryptPiiFields(employee);

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
      // also remove salary
      delete dec.salaryStructures;
    }

    return dec;
  }

  async update(companyId: string, userId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(companyId, userId, id); // 404s if not in this tenant

    const { password, ...employeeData } = dto;
    const encryptedData = encryptPiiFields(employeeData);

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...encryptedData,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      },
    });

    await this.audit(companyId, userId, 'update', id);
    return decryptPiiFields(employee);
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

  async updateMyCompliance(companyId: string, userId: string, dto: { uan?: string; pfNumber?: string; esic?: string; pan?: string; aadhaar?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.employeeId) throw new Error('Employee ID required');
    
    const employee = await this.prisma.employee.update({
      where: { id: user.employeeId, companyId },
      data: dto,
    });
    return employee;
  }

  private async audit(companyId: string, userId: string, action: string, entityId: string) {
    await this.prisma.auditLog.create({
      data: { companyId, userId, action, entity: 'employee', entityId },
    });
  }
}
