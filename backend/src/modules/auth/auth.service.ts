import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { SeederService } from '../../prisma/seeder.service';
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

    const company = await this.prisma.company.create({
      data: { name: dto.companyName },
    });

    // Company Admin role with full permissions across every module
    const adminRole = await this.prisma.role.create({
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

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const [firstName, ...rest] = dto.fullName.split(' ');

    const employee = await this.prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'EMP001',
        firstName: firstName || dto.fullName,
        lastName: rest.join(' ') || '',
        email: dto.email,
        joiningDate: new Date(),
      },
    });

    const user = await this.prisma.user.create({
      data: {
        companyId: company.id,
        email: dto.email,
        passwordHash,
        roleId: adminRole.id,
        employeeId: employee.id,
      },
    });

    await this.seeder.autoPopulate(company.id, employee.id);

    return this.issueTokens(user.id, company.id, user.email, adminRole.id);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.mfaEnabled) {
      if (!dto.mfaToken) throw new UnauthorizedException('MFA token required');
      const ok = authenticator.check(dto.mfaToken, user.mfaSecret || '');
      if (!ok) throw new UnauthorizedException('Invalid MFA token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, user.companyId, user.email, user.roleId || undefined);
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
    return this.issueTokens(user.id, user.companyId, user.email, user.roleId || undefined);
  }

  /** Generates an MFA secret + otpauth URL for the user to scan into an authenticator app. */
  async enableMfa(userId: string) {
    const secret = authenticator.generateSecret();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: true },
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
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, mfaSecret, ...safeUser } = user;
    return safeUser;
  }

  private async issueTokens(userId: string, companyId: string, email: string, roleId?: string) {
    const payload = { sub: userId, companyId, email, roleId };

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
