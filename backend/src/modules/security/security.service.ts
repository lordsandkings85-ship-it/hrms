import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { decryptPiiFields } from '../../utils/crypto.util';
import {
  DeviceAssessment,
  DeviceRiskService,
  SecurityPolicy,
  DEFAULT_SECURITY_POLICY,
  normalizePolicy,
} from './device-risk.service';
import { DeviceContextDto, DeviceReportDto } from './dto/device-context.dto';
import { UpdateSecurityPolicyDto } from './dto/security-actions.dto';

export const SECURITY_POLICY_KEY = 'security.devicePolicy';

export interface RequestInfo {
  ip?: string;
  userAgent?: string;
}

export interface EnforceDeviceInput {
  userId?: string | null;
  companyId?: string | null;
  employeeId?: string | null;
  req?: any;
  device?: DeviceContextDto;
  stage: 'LOGIN' | 'REFRESH' | 'REQUEST' | 'STARTUP';
}

export interface EnforcedAssessment extends DeviceAssessment {
  eventId: string | null;
}

function nameOf(employee: any): string {
  if (!employee) return 'Unknown';
  const first = employee.firstName ?? '';
  const last = employee.lastName ?? '';
  const full = `${first} ${last}`.trim();
  return full || employee.employeeCode || 'Unknown';
}

function limit(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

@Injectable()
export class SecurityService {
  constructor(
    private prisma: PrismaService,
    private risk: DeviceRiskService,
    private notifications: NotificationsService,
  ) {}

  // ── Policy ────────────────────────────────────────────────────────────────

  async getPolicy(companyId?: string | null): Promise<SecurityPolicy> {
    if (!companyId) return { ...DEFAULT_SECURITY_POLICY };
    const row = await this.prisma.setting.findUnique({
      where: { companyId_key: { companyId, key: SECURITY_POLICY_KEY } },
    });
    return normalizePolicy(row?.value);
  }

  async updatePolicy(user: AuthUser, dto: UpdateSecurityPolicyDto): Promise<SecurityPolicy> {
    const current = await this.getPolicy(user.companyId);
    const next = normalizePolicy({ ...current, ...dto });
    await this.prisma.setting.upsert({
      where: { companyId_key: { companyId: user.companyId, key: SECURITY_POLICY_KEY } },
      update: { value: next as any },
      create: { companyId: user.companyId, key: SECURITY_POLICY_KEY, value: next as any },
    });
    await this.writeAudit(user.companyId, user.userId, 'SECURITY_POLICY_UPDATED', 'Setting', SECURITY_POLICY_KEY, {
      ...next,
    });
    return next;
  }

  // ── Context assembly ─────────────────────────────────────────────────────

  buildContext(req: any, device?: DeviceContextDto): DeviceContextDto {
    const decoded = this.decodeContextHeader(req?.headers?.['x-device-context']);
    const header = (name: string): string | undefined => {
      const v = req?.headers?.[name];
      return typeof v === 'string' && v.trim() ? v.trim() : undefined;
    };

    return {
      ...decoded,
      ...device,
      deviceId: device?.deviceId ?? decoded.deviceId ?? header('x-device-id'),
      clientType: device?.clientType ?? decoded.clientType ?? header('x-client-type'),
      platform: device?.platform ?? decoded.platform ?? header('x-client-platform'),
      arch: device?.arch ?? decoded.arch ?? header('x-client-arch'),
      osVersion: device?.osVersion ?? decoded.osVersion ?? header('x-os-version'),
      signals: device?.signals ?? decoded.signals ?? [],
      userAgent: limit(req?.headers?.['user-agent'], 512) ?? undefined,
    };
  }

  private decodeContextHeader(raw: unknown): Partial<DeviceContextDto> {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 8192) return {};
    try {
      const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
      const parsed = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const out: Partial<DeviceContextDto> = {};
      const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
      out.deviceId = str(parsed.deviceId, 128);
      out.clientType = str(parsed.clientType, 32);
      out.platform = str(parsed.platform, 32);
      out.osName = str(parsed.osName, 96);
      out.osVersion = str(parsed.osVersion, 96);
      out.arch = str(parsed.arch, 16);
      out.webgl = str(parsed.webgl, 256);
      out.vmHost = str(parsed.vmHost, 128);
      out.deviceLabel = str(parsed.deviceLabel, 512);
      out.webdriver = typeof parsed.webdriver === 'boolean' ? parsed.webdriver : undefined;
      out.isEmulator = typeof parsed.isEmulator === 'boolean' ? parsed.isEmulator : undefined;
      out.isVirtualMachine = typeof parsed.isVirtualMachine === 'boolean' ? parsed.isVirtualMachine : undefined;
      out.touchPoints = Number.isFinite(parsed.touchPoints) ? Number(parsed.touchPoints) : undefined;
      out.hardwareConcurrency = Number.isFinite(parsed.hardwareConcurrency)
        ? Number(parsed.hardwareConcurrency)
        : undefined;
      out.signals = Array.isArray(parsed.signals)
        ? parsed.signals.filter((s: unknown): s is string => typeof s === 'string').slice(0, 40).map((s: string) => s.slice(0, 256))
        : undefined;
      return out;
    } catch {
      return {};
    }
  }

  // ── Enforcement ───────────────────────────────────────────────────────────

  /**
   * Assesses a device context and, on a definitive violation, records the event,
   * blocks the account (revoking every live session) and notifies admins.
   * Returns the assessment so callers can surface a precise error message.
   */
  async enforceDevice(input: EnforceDeviceInput): Promise<EnforcedAssessment> {
    const policy = await this.getPolicy(input.companyId);
    const context = this.buildContext(input.req, input.device);
    const assessment = this.risk.assess(context, policy);

    if (assessment.level !== 'block') {
      return { ...assessment, eventId: null };
    }

    const reason = assessment.reasons.join('; ') || 'Unsupported device environment';
    const event = await this.recordEvent({
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      employeeId: input.employeeId ?? null,
      eventType: assessment.eventType ?? 'UNSUPPORTED_PLATFORM',
      severity: assessment.severity,
      stage: input.stage,
      assessment,
      req: input.req,
    });

    if (input.userId && policy.autoBlockAccounts) {
      await this.blockAccount({
        userId: input.userId,
        reason,
        blockedBy: 'SECURITY_POLICY',
        stage: input.stage,
      });
    }

    if (policy.notifyAdmins && input.companyId) {
      await this.notifyAdmins({
        companyId: input.companyId,
        eventId: event.id,
        assessment,
        reason,
        userId: input.userId ?? null,
        employeeId: input.employeeId ?? null,
      });
    }

    return { ...assessment, eventId: event.id };
  }

  async assertAccountActive(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { securityBlocked: true },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.securityBlocked) {
      throw new ForbiddenException({
        code: 'ACCOUNT_BLOCKED',
        message:
          'Your account has been blocked by the Workora security policy. Please contact your administrator to restore access.',
      });
    }
  }

  async blockAccount(params: {
    userId: string;
    reason: string;
    blockedBy: string;
    stage?: string;
  }): Promise<void> {
    const reason = params.reason.slice(0, 2000);
    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        securityBlocked: true,
        securityBlockedAt: new Date(),
        securityBlockReason: reason,
        securityBlockedBy: params.blockedBy,
        securityUnblockedAt: null,
        securityUnblockedBy: null,
        securityUnblockReason: null,
      },
    });
    await this.revokeSessions(params.userId, `Account blocked: ${reason}`);
  }

  async revokeSessions(userId: string, reason: string): Promise<number> {
    const [sessions, tokens] = await Promise.all([
      this.prisma.userSession.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedReason: reason.slice(0, 190),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
    ]);
    return sessions.count + tokens.count;
  }

  // ── Admin operations ─────────────────────────────────────────────────────

  async listBlockedUsers(user: AuthUser) {
    const global = await this.isGlobalAdmin(user);
    const users = await this.prisma.user.findMany({
      where: {
        securityBlocked: true,
        ...(global ? {} : { companyId: user.companyId }),
      },
      orderBy: { securityBlockedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        email: true,
        companyId: true,
        securityBlockedAt: true,
        securityBlockReason: true,
        securityBlockedBy: true,
        lastLoginAt: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
        company: { select: { id: true, name: true, displayName: true } },
      },
    });

    return users.map((u) => ({
      ...u,
      employee: u.employee ? decryptPiiFields(u.employee) : null,
    }));
  }

  async listEvents(
    user: AuthUser,
    query: { type?: string; userId?: string; limit?: string; offset?: string; companyId?: string } = {},
  ) {
    const global = await this.isGlobalAdmin(user);
    const where: any = {};
    if (global) {
      if (query.companyId) where.companyId = query.companyId;
    } else {
      where.companyId = user.companyId;
    }
    if (query.type) where.eventType = query.type;
    if (query.userId) where.userId = query.userId;

    const take = Math.min(Math.max(Number(query.limit) || 100, 1), 200);
    const skip = Math.min(Math.max(Number(query.offset) || 0, 0), 5000);

    const events = await this.prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    const companyIds = [...new Set(events.map((e) => e.companyId).filter(Boolean))] as string[];
    const employeeIds = [...new Set(events.map((e) => e.employeeId).filter(Boolean))] as string[];
    const [companies, employees] = await Promise.all([
      companyIds.length
        ? this.prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true, displayName: true },
          })
        : Promise.resolve([]),
      employeeIds.length
        ? this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);
    const companyMap = new Map(companies.map((c) => [c.id, c] as const));
    const employeeMap = new Map(employees.map((e) => [e.id, decryptPiiFields(e)] as const));

    return events.map((event) => {
      const employee = event.employeeId ? employeeMap.get(event.employeeId) : undefined;
      return {
        ...event,
        companyName: event.companyId
          ? companyMap.get(event.companyId)?.displayName || companyMap.get(event.companyId)?.name || null
          : null,
        employeeCode: employee?.employeeCode ?? null,
        employeeName: employee ? nameOf(employee) : null,
      };
    });
  }

  async blockUser(user: AuthUser, targetUserId: string, reason: string) {
    const target = await this.assertUserInScope(user, targetUserId);
    if (target.securityBlocked) {
      throw new BadRequestException('This user is already blocked by security policy');
    }
    const cleanReason = reason.trim();
    await this.blockAccount({
      userId: targetUserId,
      reason: cleanReason,
      blockedBy: user.userId,
      stage: 'ADMIN',
    });
    const event = await this.recordEvent({
      companyId: target.companyId,
      userId: targetUserId,
      employeeId: target.employeeId,
      eventType: 'ACCOUNT_BLOCKED',
      severity: 'high',
      stage: 'ADMIN_ACTION',
      assessment: {
        level: 'block',
        eventType: 'ACCOUNT_BLOCKED',
        severity: 'high',
        reasons: [cleanReason],
        policy: await this.getPolicy(target.companyId),
        context: {},
        checks: { blockedBy: user.userId },
      },
      req: null,
    });
    await this.writeAudit(target.companyId, user.userId, 'SECURITY_USER_BLOCKED', 'User', targetUserId, {
      reason: cleanReason,
      securityEventId: event.id,
    });
    return { success: true, userId: targetUserId, securityEventId: event.id };
  }

  async unblockUser(user: AuthUser, targetUserId: string, reason: string) {
    const target = await this.assertUserInScope(user, targetUserId);
    if (!target.securityBlocked) {
      throw new BadRequestException('This user is not currently blocked');
    }
    const cleanReason = reason.trim();
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        securityBlocked: false,
        securityUnblockedAt: new Date(),
        securityUnblockedBy: user.userId,
        securityUnblockReason: cleanReason,
      },
    });
    // Force a fresh login: every existing session and refresh token dies.
    await this.revokeSessions(targetUserId, `Account unblocked: ${cleanReason}`);
    const event = await this.recordEvent({
      companyId: target.companyId,
      userId: targetUserId,
      employeeId: target.employeeId,
      eventType: 'ACCOUNT_UNBLOCKED',
      severity: 'medium',
      stage: 'ADMIN_ACTION',
      assessment: {
        level: 'allow',
        severity: 'medium',
        reasons: [cleanReason],
        policy: await this.getPolicy(target.companyId),
        context: {},
        checks: { unblockedBy: user.userId },
      },
      req: null,
    });
    await this.writeAudit(target.companyId, user.userId, 'SECURITY_USER_UNBLOCKED', 'User', targetUserId, {
      reason: cleanReason,
      securityEventId: event.id,
    });
    return { success: true, userId: targetUserId, securityEventId: event.id, requiresFreshLogin: true };
  }

  async listDevices(user: AuthUser) {
    const global = await this.isGlobalAdmin(user);
    const devices = await this.prisma.trustedDevice.findMany({
      where: global ? {} : { companyId: user.companyId },
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
    });
    const employees = devices.some((d) => d.userId)
      ? await this.prisma.user.findMany({
          where: { id: { in: devices.map((d) => d.userId).filter(Boolean) as string[] } },
          select: {
            id: true,
            email: true,
            employee: { select: { employeeCode: true, firstName: true, lastName: true } },
          },
        })
      : [];
    const map = new Map(
      employees.map((e) => [
        e.id,
        {
          email: e.email,
          employeeCode: e.employee?.employeeCode ?? null,
          employeeName: e.employee ? nameOf(decryptPiiFields(e.employee)) : null,
        },
      ]),
    );
    return devices.map((d) => ({ ...d, user: d.userId ? map.get(d.userId) ?? null : null }));
  }

  async trustDevice(user: AuthUser, input: { deviceId: string; label?: string; userId?: string }) {
    const targetUserId = input.userId ?? user.userId;
    const target = await this.assertUserInScope(user, targetUserId);
    return this.prisma.trustedDevice.upsert({
      where: { companyId_deviceId: { companyId: target.companyId, deviceId: input.deviceId } },
      update: {
        status: 'APPROVED',
        label: input.label ?? undefined,
        approvedBy: user.userId,
        approvedAt: new Date(),
        userId: targetUserId,
      },
      create: {
        companyId: target.companyId,
        userId: targetUserId,
        deviceId: input.deviceId,
        label: input.label ?? null,
        status: 'APPROVED',
        approvedBy: user.userId,
        clientType: 'desktop',
        platform: 'win32',
      },
    });
  }

  async revokeDevice(user: AuthUser, id: string) {
    const device = await this.prisma.trustedDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    const global = await this.isGlobalAdmin(user);
    if (!global && device.companyId !== user.companyId) {
      throw new ForbiddenException('Device does not belong to this company');
    }
    return this.prisma.trustedDevice.update({
      where: { id },
      data: { status: 'REVOKED', approvedBy: user.userId, approvedAt: new Date() },
    });
  }

  // ── Public startup report ────────────────────────────────────────────────

  /**
   * Records a blocked startup on an unsupported machine. No authentication is
   * possible there (the UI never loads), so this endpoint is throttled and
   * stores no sensitive data beyond the operational device signals.
   */
  async reportStartup(dto: DeviceReportDto, req: any) {
    const user = dto.email
      ? await this.prisma.user.findUnique({
          where: { email: dto.email.toLowerCase().trim() },
          select: { id: true, companyId: true, employeeId: true },
        })
      : null;

    const companyId = user?.companyId ?? null;
    const policy = await this.getPolicy(companyId);
    const context = this.buildContext(req, dto);
    const assessment = this.risk.assess(context, policy);
    const reason = dto.reason?.trim() || assessment.reasons.join('; ') || 'Unsupported platform';

    const event = await this.recordEvent({
      companyId,
      userId: user?.id ?? null,
      employeeId: user?.employeeId ?? null,
      eventType: assessment.eventType ?? 'UNSUPPORTED_PLATFORM',
      severity: assessment.severity,
      stage: 'STARTUP',
      assessment: { ...assessment, reasons: [reason] },
      req,
    });

    if (user && policy.autoBlockAccounts && assessment.level === 'block') {
      await this.blockAccount({ userId: user.id, reason, blockedBy: 'SECURITY_POLICY', stage: 'STARTUP' });
    }
    if (companyId && policy.notifyAdmins) {
      await this.notifyAdmins({
        companyId,
        eventId: event.id,
        assessment,
        reason,
        userId: user?.id ?? null,
        employeeId: user?.employeeId ?? null,
      });
    }
    return {
      recorded: true,
      eventId: event.id,
      level: assessment.level,
      eventType: assessment.eventType ?? 'UNSUPPORTED_PLATFORM',
      reasons: assessment.reasons,
    };
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private async recordEvent(params: {
    companyId: string | null;
    userId: string | null;
    employeeId: string | null;
    eventType: string;
    severity: string;
    stage: string;
    assessment: DeviceAssessment;
    req: any;
  }) {
    const { assessment } = params;
    const context = assessment.context ?? {};
    return this.prisma.securityEvent.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        employeeId: params.employeeId,
        eventType: params.eventType,
        severity: params.severity,
        stage: params.stage,
        platform: context.platform ?? null,
        osName: context.osName ?? null,
        osVersion: context.osVersion ?? null,
        arch: context.arch ?? null,
        deviceId: context.deviceId ?? null,
        deviceInfo: {
          deviceLabel: context.deviceLabel ?? null,
          signals: context.signals ?? [],
          webgl: context.webgl ?? null,
          touchPoints: context.touchPoints ?? null,
          webdriver: context.webdriver ?? null,
          checks: assessment.checks ?? {},
        } as any,
        detectionReason: (assessment.reasons ?? []).join('; ').slice(0, 4000) || null,
        ipAddress: limit(params.req?.ip, 64),
        userAgent: limit(params.req?.headers?.['user-agent'], 1000),
      },
    });
  }

  private async notifyAdmins(params: {
    companyId: string;
    eventId: string;
    assessment: DeviceAssessment;
    reason: string;
    userId: string | null;
    employeeId: string | null;
  }) {
    const [employee, company] = await Promise.all([
      params.employeeId
        ? this.prisma.employee.findUnique({
            where: { id: params.employeeId },
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          })
        : Promise.resolve(null),
      this.prisma.company.findUnique({
        where: { id: params.companyId },
        select: { name: true, displayName: true },
      }),
    ]);
    const safeEmployee = employee ? decryptPiiFields(employee) : null;
    const context = params.assessment.context ?? {};
    const os = [context.osName, context.osVersion].filter(Boolean).join(' ') || context.platform || 'Unknown';
    const device = context.deviceId
      ? `ID ${context.deviceId}${context.deviceLabel ? ` (${context.deviceLabel})` : ''}`
      : context.deviceLabel || 'Unknown';

    const message = [
      `Employee ID: ${safeEmployee?.employeeCode ?? 'Unknown'}`,
      `Employee Name: ${safeEmployee ? nameOf(safeEmployee) : 'Unknown'}`,
      `Company: ${company?.displayName || company?.name || params.companyId}`,
      `Operating System: ${os}`,
      `Device Information: ${device}`,
      `Detection Reason: ${params.reason}`,
      `Attempt Date: ${new Date().toISOString()}`,
      `Security Event ID: ${params.eventId}`,
    ].join('\n');

    try {
      await this.notifications.notifySecurityAdmins({
        companyId: params.companyId,
        title: 'Unsupported Device Access Attempt',
        message,
        referenceId: params.eventId,
      });
    } catch {
      // Notification delivery must never mask the security decision.
    }
  }

  private async assertUserInScope(user: AuthUser, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        companyId: true,
        employeeId: true,
        securityBlocked: true,
      },
    });
    if (!target) throw new NotFoundException('User not found');
    const global = await this.isGlobalAdmin(user);
    if (!global && target.companyId !== user.companyId) {
      throw new ForbiddenException('User does not belong to this company');
    }
    return target;
  }

  async isGlobalAdmin(user: AuthUser): Promise<boolean> {
    if (user.isSuperAdmin) return true;
    if (!user.roleId) return false;
    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      select: { isSystem: true, name: true },
    });
    return !!role?.isSystem || ['Super Admin', 'Admin'].includes(role?.name ?? '');
  }

  private async writeAudit(
    companyId: string,
    userId: string | null,
    action: string,
    entity: string,
    entityId: string | null,
    metadata: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { companyId, userId, action, entity, entityId, metadata: metadata as any },
      });
    } catch {
      // Audit is best-effort; the SecurityEvent remains the source of truth.
    }
  }
}
