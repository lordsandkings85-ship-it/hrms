import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SeederService } from '../../prisma/seeder.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SuperAdminService {
  constructor(
    private prisma: PrismaService,
    private seeder: SeederService,
  ) {}

  async seedExisting() {
    const user = await this.prisma.user.findFirst({ where: { email: 'admin@acme.com' } });
    if (!user) return { success: false, message: 'Admin user not found' };
    if (!user.employeeId) return { success: false, message: 'Admin employee not found' };
    await this.seeder.autoPopulate(user.companyId, user.employeeId);
    return { success: true, message: 'Seeding successful' };
  }

  listTenants() {
    return this.prisma.company.findMany({
      include: { _count: { select: { employees: true, users: true } } },
    });
  }

  async systemHealth() {
    const [companies, employees, users] = await this.prisma.$transaction([
      this.prisma.company.count(),
      this.prisma.employee.count(),
      this.prisma.user.count(),
    ]);
    return { companies, employees, users, status: 'ok' };
  }

  auditLogs(companyId?: string) {
    return this.prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async provisionTenant(data: any) {
    const { companyName, domain, adminEmail, adminPassword, adminFirstName, adminLastName } = data;

    // Check if email exists globally
    const existingUser = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) throw new BadRequestException('User email already exists');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: { name: companyName, },
      });

      // 2. Create Roles
      const adminRole = await tx.role.create({ data: { companyId: company.id, name: 'System Admin' } });
      await tx.role.create({ data: { companyId: company.id, name: 'HR Admin' } });
      await tx.role.create({ data: { companyId: company.id, name: 'Employee' } });

      // 3. Create Default Department
      const dept = await tx.department.create({ data: { companyId: company.id, name: 'Management' } });

      // 4. Create Employee (Tenant Admin)
      const employee = await tx.employee.create({
        data: {
          companyId: company.id,
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          employeeCode: 'EMP-001',
          departmentId: dept.id,
        },
      });

      // 5. Create User
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: adminEmail,
          passwordHash,
          employeeId: employee.id,
          roleId: adminRole.id,
          isSuperAdmin: false,
        },
      });

      return { company, employee, user };
    });

    // Run secondary seeders asynchronously
    this.seeder.autoPopulate(result.company.id, result.employee.id).catch(console.error);

    return { success: true, message: 'Tenant Provisioned successfully', companyId: result.company.id };
  }
}
