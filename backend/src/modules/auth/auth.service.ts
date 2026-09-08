import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { SeederService } from '../../prisma/seeder.service';
import { decrypt, decryptEmployeeNested, decryptPiiFields, encrypt } from '../../utils/crypto.util';
import { isApprover } from '../../common/approver';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const ALL_MODULES = [
  'dashboard', 'employees', 'attendance', 'leave', 'payroll', 'recruitment',
  'performance', 'projects', 'timesheets', 'expenses', 'travel', 'assets',
  'documents', 'organization', 'shifts', 'announcements', 'training',
  'reports', 'settings', 'billing', 'integrations', 'super_admin',
];
const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private seeder: SeederService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const [firstName, ...rest] = dto.fullName.split(' ');

    const { company, user, adminRoleId } = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.companyName },
      });

      // Company Admin role with full permissions across every module
      const adminRole = await tx.role.create({
        data: {
          companyId: company.id,
          name: 'Company Admin',
          isSystem: true,
          permissions: {
            create: ALL_MODULES.flatMap((module) =>
              ALL_ACTIONS.map((action) => ({ module, action })),
            ),
          },
        },
      });

      const employee = await tx.employee.create({
        data: {
          companyId: company.id,
          employeeCode: 'EMP001',
          firstName: firstName || dto.fullName,
          lastName: rest.join(' ') || '',
          email: dto.email,
          joiningDate: new Date(),
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email,
          passwordHash,
          roleId: adminRole.id,
          employeeId: employee.id,
        },
      });

      return { company, user, adminRoleId: adminRole.id };
    }, { timeout: 30000 });

    await this.seeder.autoPopulate(company.id, user.employeeId as string);

    return this.issueTokens(user.id, company.id, user.email, adminRoleId);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Equalize timing with the bcrypt.compare path below to avoid a
      // user-enumeration side channel.
      await bcrypt.compare(dto.password, '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5rWfKXyP6w3KqHmZBjFpQhVbHcY0E8C');
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.mfaEnabled) {
      if (!dto.mfaToken) throw new UnauthorizedException('MFA token required');
      const ok = authenticator.check(dto.mfaToken, decrypt(user.mfaSecret || '') ?? '');
      if (!ok) throw new UnauthorizedException('Invalid MFA token');
    }

    // Block logins for separated/archived employees while still allowing
    // platform super-admins and system (internal) employee records.
    if (user.employeeId && !user.isSuperAdmin) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: { status: true, isSystem: true },
      });
      if (employee && !employee.isSystem && employee.status !== 'active') {
        throw new UnauthorizedException('Your account is no longer active');
      }
    }

    const effectiveCompanyId = user.employeeId
      ? (await this.prisma.employee.findUnique({ where: { id: user.employeeId }, select: { companyId: true } }))?.companyId || user.companyId
      : user.companyId;

    if (effectiveCompanyId !== user.companyId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { companyId: effectiveCompanyId, lastLoginAt: new Date() },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    return this.issueTokens(user.id, effectiveCompanyId, user.email, user.roleId || undefined);
  }

  async refresh(userId: string, providedToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    let matched = false;
    for (const t of tokens) {
      if (await bcrypt.compare(providedToken, t.tokenHash)) {
        matched = true;
        await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Same separation gate as login: don't issue fresh tokens for exited employees.
    if (user.employeeId && !user.isSuperAdmin) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: { status: true, isSystem: true, companyId: true },
      });
      if (employee && !employee.isSystem && employee.status !== 'active') {
        throw new UnauthorizedException('Your account is no longer active');
      }
      if (employee?.companyId && employee.companyId !== user.companyId) {
        await this.prisma.user.update({ where: { id: user.id }, data: { companyId: employee.companyId } });
        user.companyId = employee.companyId;
      }
    }

    return this.issueTokens(user.id, user.companyId, user.email, user.roleId || undefined);
  }

  /** Generates an MFA secret + otpauth URL for the user to scan into an authenticator app. */
  async enableMfa(userId: string) {
    const secret = authenticator.generateSecret();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: encrypt(secret), mfaEnabled: true },
    });
    const otpauth = authenticator.keyuri(user.email, 'HRMS SaaS', secret);
    return { otpauth };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        employee: true,
        company: { select: { name: true, panNumber: true, gstNumber: true, address: true } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, mfaSecret, ...safeUser } = user;

    // Strict approver principal for company-wide HR approval alerts.
    let canApproveApproval = !!user.isSuperAdmin || !!user.role?.isSystem;
    if (!canApproveApproval && user.roleId) {
      const grants = await this.prisma.permission.findMany({
        where: { roleId: user.roleId },
        select: { module: true, action: true },
      });
      canApproveApproval = isApprover(
        { isSuperAdmin: !!user.isSuperAdmin, roleIsSystem: !!user.role?.isSystem },
        grants,
      );
    }

    return {
      ...safeUser,
      canApproveApproval,
      employee: user.employee ? decryptEmployeeNested(decryptPiiFields(user.employee)) : user.employee,
      companies: await this.resolveCompanies(user.id, user.companyId),
    };
  }

  /**
   * Group-wide visibility: users who manage the whole Lords And Kings Group
   * (super admin, system role, or any role with `organization` grants) can see,
   * switch to and manage EVERY company under the group. Everyone else sees only
   * their primary company plus explicit UserCompany memberships.
   */
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

  /** Resolve the user's accessible companies for the HR selector. */
  private async resolveCompanies(userId: string, primaryCompanyId: string) {
    const select = {
      id: true, name: true, displayName: true, legalName: true,
      status: true, planId: true,
    } as const;

    // Fetch all accessible companies explicitly so membership rows stay in
    // sync with token claims (a company may exist without a creator membership).
    let accessible: Array<{ id: string } & Record<string, any>>;
    if (await this.isGroupWide(userId)) {
      accessible = await this.prisma.company.findMany({ select, orderBy: { createdAt: 'asc' } });
    } else {
      const membership = await this.prisma.userCompany.findMany({
        where: { userId, isActive: true },
        select: { company: { select } },
      });
      const merged = new Map<string, any>();
      for (const m of membership) {
        if (m.company) merged.set(m.company.id, m.company);
      }
      const primary = await this.prisma.company.findUnique({
        where: { id: primaryCompanyId },
        select,
      });
      if (primary && !merged.has(primary.id)) {
        merged.set(primary.id, primary);
      }
      accessible = Array.from(merged.values());
    }

    // Primary company always first, then creation order.
    return accessible
      .map((c) => ({ ...c, label: c.displayName || c.name }))
      .sort((a, b) => {
        if (a.id === primaryCompanyId) return -1;
        if (b.id === primaryCompanyId) return 1;
        return 0;
      });
  }

  private async issueTokens(userId: string, companyId: string, email: string, roleId?: string) {
    // Resolve the user's accessible companies: group admins/HR get every
    // company under Lords And Kings Group; everyone else gets primary +
    // memberships (multi-company HR/admin).
    let companyIds: string[];
    if (await this.isGroupWide(userId)) {
      const all = await this.prisma.company.findMany({ select: { id: true } });
      companyIds = Array.from(new Set([companyId, ...all.map((c) => c.id)]));
    } else {
      const membership = await this.prisma.userCompany.findMany({
        where: { userId, isActive: true },
        select: { companyId: true },
      });
      companyIds = Array.from(
        new Set([companyId, ...membership.map((m) => m.companyId)]),
      );
    }

    const payload = { sub: userId, companyId, activeCompanyId: companyId, companyIds, email, roleId };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
